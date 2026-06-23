import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";

// Configuração do Firebase (copiado do firebase.js)
const firebaseConfig = {
  apiKey: "AIzaSyBi4__SqRGpcErIsHFTmSwA6MDcdcxDAro",
  authDomain: "pedro-car.firebaseapp.com",
  projectId: "pedro-car",
  storageBucket: "pedro-car.firebasestorage.app",
  messagingSenderId: "959483898229",
  appId: "1:959483898229:web:f6b0f3d957ba140bcbcb3c",
  measurementId: "G-ZBQNMDVBTF"
};

// Inicialização do Firebase
let app;
let db;
try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (e) {
  console.error("Erro ao inicializar o Firebase", e);
}

// Configurações do Evolution API
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const EVOLUTION_API_INSTANCE = process.env.EVOLUTION_API_INSTANCE;

// Formatação auxiliar de CPF / CNPJ
const formatCpfOrCnpj = (value) => {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 11) {
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
  } else {
    const d = digits.slice(0, 14);
    if (d.length <= 12) {
      return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
    }
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`;
  }
};

// Envia mensagem de resposta via Evolution API
async function sendWhatsAppMessage(number, text) {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_API_INSTANCE) {
    console.error("Evolution API não configurada em variáveis de ambiente.");
    return;
  }

  const cleanNumber = number.replace("@s.whatsapp.net", "");
  const url = `${EVOLUTION_API_URL.replace(/\/$/, "")}/message/sendText/${EVOLUTION_API_INSTANCE}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": EVOLUTION_API_KEY
      },
      body: JSON.stringify({
        number: cleanNumber,
        options: {
          delay: 1000,
          presence: "composing"
        },
        textMessage: {
          text: text
        }
      })
    });
    if (!response.ok) {
      const errText = await response.text();
      console.error(`Erro ao enviar mensagem via Evolution API (Status ${response.status}):`, errText);
    }
  } catch (error) {
    console.error("Erro na requisição para Evolution API:", error);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const payload = req.body;
  
  if (payload?.event !== "messages.upsert") {
    return res.status(200).send("Ignored event type");
  }

  const messageData = payload?.data;
  if (!messageData || messageData.key?.fromMe) {
    return res.status(200).send("Ignored self/empty message");
  }

  const remoteJid = messageData.key?.remoteJid;
  const messageType = messageData.messageType;
  let userMessage = "";

  if (messageType === "conversation") {
    userMessage = messageData.message?.conversation || "";
  } else if (messageType === "extendedTextMessage") {
    userMessage = messageData.message?.extendedTextMessage?.text || "";
  }

  userMessage = userMessage.trim();
  if (!userMessage) {
    return res.status(200).send("Empty message body");
  }

  console.log(`Mensagem recebida de ${remoteJid}: "${userMessage}"`);

  const cleanedPlate = userMessage.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const plateRegex = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;
  
  const digits = userMessage.replace(/\D/g, "");

  let replyText = "";

  try {
    if (plateRegex.test(cleanedPlate)) {
      console.log(`Pesquisando por Placa: ${cleanedPlate}`);
      
      const servicesRef = collection(db, "services");
      const budgetsRef = collection(db, "budgets");

      const qServices = query(servicesRef, where("plate", "==", cleanedPlate));
      const sSnapshot = await getDocs(qServices);
      
      const qBudgets = query(budgetsRef, where("plate", "==", cleanedPlate));
      const bSnapshot = await getDocs(qBudgets);

      const foundServices = sSnapshot.docs.map(doc => doc.data());
      const foundBudgets = bSnapshot.docs.map(doc => doc.data());

      if (foundServices.length === 0 && foundBudgets.length === 0) {
        replyText = `❌ *Pedro Car*

Não encontrei nenhum orçamento ou ordem de serviço ativa para a placa *${userMessage.toUpperCase()}*.

Por favor, confirme se a placa foi digitada corretamente.`;
      } else {
        replyText = `🚗 *Pedro Car - Consulta de Veículo (${cleanedPlate})*

`;

        if (foundServices.length > 0) {
          replyText += `*Ordens de Serviço Encontradas:*
`;
          foundServices.forEach((s, idx) => {
            replyText += `${idx + 1}. *Carro:* ${s.car}
   *Status:* ${s.status === 'Em Execução' ? '⚙️ Em Execução' : '✅ Finalizado'}
   *Data:* ${s.date}
   *Serviços:* ${s.description || 'Gerais'}
   *Total:* R$ ${Number(s.total || 0).toFixed(2)}
`;
          });
          replyText += `\n`;
        }

        if (foundBudgets.length > 0) {
          replyText += `*Orçamentos Pendentes:*
`;
          foundBudgets.forEach((b, idx) => {
            replyText += `${idx + 1}. *Carro:* ${b.car}
   *Status:* ⏳ Pendente de Aprovação
   *Data:* ${b.date}
   *Serviços:* ${b.description || 'Gerais'}
   *Total Projetado:* R$ ${Number(b.total || 0).toFixed(2)}
`;
          });
        }
      }
    } else if (digits.length === 11 || digits.length === 14) {
      const formattedDoc = formatCpfOrCnpj(digits);
      console.log(`Pesquisando por CPF/CNPJ: ${digits} ou ${formattedDoc}`);

      const servicesRef = collection(db, "services");
      const budgetsRef = collection(db, "budgets");

      let foundServices = [];
      let foundBudgets = [];

      const qServicesFormatted = query(servicesRef, where("cpf", "==", formattedDoc));
      const sfSnap = await getDocs(qServicesFormatted);
      sfSnap.forEach(d => foundServices.push(d.data()));

      const qBudgetsFormatted = query(budgetsRef, where("cpf", "==", formattedDoc));
      const bfSnap = await getDocs(qBudgetsFormatted);
      bfSnap.forEach(d => foundBudgets.push(d.data()));

      if (foundServices.length === 0) {
        const qServicesRaw = query(servicesRef, where("cpf", "==", digits));
        const srSnap = await getDocs(qServicesRaw);
        srSnap.forEach(d => foundServices.push(d.data()));
      }
      if (foundBudgets.length === 0) {
        const qBudgetsRaw = query(budgetsRef, where("cpf", "==", digits));
        const brSnap = await getDocs(qBudgetsRaw);
        brSnap.forEach(d => foundBudgets.push(d.data()));
      }

      if (foundServices.length === 0 && foundBudgets.length === 0) {
        replyText = `❌ *Pedro Car*

Não encontrei nenhum registro vinculado ao CPF/CNPJ *${formattedDoc}*.

Por favor, confirme se o documento está correto e cadastrado no sistema.`;
      } else {
        replyText = `📋 *Pedro Car - Consulta por Documento (${formattedDoc})*

`;

        if (foundServices.length > 0) {
          replyText += `*Ordens de Serviço Encontradas:*
`;
          foundServices.forEach((s, idx) => {
            replyText += `${idx + 1}. *Carro:* ${s.car} (${s.plate})
   *Status:* ${s.status === 'Em Execução' ? '⚙️ Em Execução' : '✅ Finalizado'}
   *Data:* ${s.date}
   *Total:* R$ ${Number(s.total || 0).toFixed(2)}
`;
          });
          replyText += `\n`;
        }

        if (foundBudgets.length > 0) {
          replyText += `*Orçamentos Pendentes:*
`;
          foundBudgets.forEach((b, idx) => {
            replyText += `${idx + 1}. *Carro:* ${b.car} (${b.plate})
   *Status:* ⏳ Pendente de Aprovação
   *Data:* ${b.date}
   *Total Projetado:* R$ ${Number(b.total || 0).toFixed(2)}
`;
          });
        }
      }
    } else {
      replyText = `Olá! Seja bem-vindo ao assistente de atendimento da *Oficina Pedro Car*! 🚗💨

Para consultar o andamento do seu veículo ou orçamentos ativos, por favor digite:

👉 A **PLACA** do veículo (Ex: \`ABC1234\`)
ou
👉 O **CPF / CNPJ** cadastrado (apenas números)

Estou aqui para facilitar a sua consulta rápida!`;
    }

    await sendWhatsAppMessage(remoteJid, replyText);
    return res.status(200).send("Success");

  } catch (error) {
    console.error("Erro ao processar webhook:", error);
    return res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
}
