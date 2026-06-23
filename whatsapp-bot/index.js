import makeWASocket, { useMultiFileAuthState, DisconnectReason } from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import pino from "pino";
import { db } from "./firebase.js";
import { collection, query, where, getDocs } from "firebase/firestore";

// Helper de formatação de CPF/CNPJ
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

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    logger: pino({ level: "silent" })
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("QR Code gerado! Escaneie com seu WhatsApp:");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "close") {
      const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log("Conexão fechada devido a:", lastDisconnect?.error, ". Reconectando:", shouldReconnect);
      if (shouldReconnect) {
        connectToWhatsApp();
      }
    } else if (connection === "open") {
      console.log("Conexão aberta com sucesso! Bot do WhatsApp ativo.");
    }
  });

  sock.ev.on("messages.upsert", async (m) => {
    const msg = m.messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    
    let userText = "";
    if (msg.message.conversation) {
      userText = msg.message.conversation;
    } else if (msg.message.extendedTextMessage) {
      userText = msg.message.extendedTextMessage.text;
    }

    userText = userText.trim();
    if (!userText) return;

    console.log(`Mensagem recebida de ${from}: "${userText}"`);

    let replyText = "";

    const cleanedPlate = userText.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    const plateRegex = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;
    
    const digits = userText.replace(/\D/g, "");

    try {
      if (plateRegex.test(cleanedPlate)) {
        console.log(`Pesquisando Placa: ${cleanedPlate}`);
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

Não encontrei nenhum orçamento ou ordem de serviço ativa para a placa *${userText.toUpperCase()}*.

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
        console.log(`Pesquisando CPF/CNPJ: ${digits} ou ${formattedDoc}`);

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

      await sock.sendMessage(from, { text: replyText });

    } catch (e) {
      console.error("Erro ao consultar Firestore ou enviar mensagem:", e);
    }
  });
}

console.log("Iniciando Bot do WhatsApp...");
connectToWhatsApp();
