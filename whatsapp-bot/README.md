# 🚗 Pedro Car - Bot de WhatsApp Autônomo

Este é o projeto do assistente virtual (Chatbot) de WhatsApp para a **Oficina Pedro Car**. Ele é 100% autônomo e gratuito (usa a biblioteca `@whiskeysockets/baileys`), permitindo que seus clientes consultem o status e andamento de veículos e orçamentos diretamente pelo WhatsApp.

---

## 🛠️ Como Executar e Conectar o Bot (Tutorial)

### Pré-requisitos
Antes de começar, certifique-se de ter o **Node.js** instalado no seu computador. Você pode baixá-lo em [nodejs.org](https://nodejs.org/).

### Passo 1: Instalação
Abra o terminal do seu computador (Prompt de Comando, PowerShell ou Terminal do Mac/Linux) e execute os seguintes comandos:

1. Navegue até a pasta do bot:
   ```bash
   cd whatsapp-bot
   ```
2. Instale as dependências necessárias:
   ```bash
   npm install
   ```

### Passo 2: Executar o Bot
Inicie o robô com o comando:
```bash
npm start
```

### Passo 3: Conectar seu WhatsApp
1. Ao iniciar o comando acima, um **QR Code** será gerado e exibido diretamente no seu terminal.
2. Abra o WhatsApp no celular da oficina.
3. Vá em **Configurações / Ajustes** -> **Aparelhos Conectados** -> **Conectar um aparelho**.
4. Aponte a câmera do celular para o terminal e escaneie o QR Code.
5. Pronto! O terminal exibirá a mensagem `Conexão aberta com sucesso! Bot do WhatsApp ativo.`

*Nota: A sessão é salva na pasta `auth_info_baileys/`. Você não precisará escanear o QR Code novamente ao reiniciar o bot no mesmo computador.*

---

## 💬 Como Interagir com o Bot

O robô monitora as mensagens recebidas e responde de acordo com as seguintes regras:

1. **Consulta por Placa:**
   * O cliente envia a placa do veículo (Ex: `ABC1234`, `ABC-1234` ou placa Mercosul `ABC1D23`).
   * O bot consulta a placa no banco Firestore e retorna todas as ordens de serviço e orçamentos vinculados àquele carro, contendo **Status (Em Execução / Finalizado)**, data, descrição do serviço e o valor.
2. **Consulta por CPF / CNPJ:**
   * O cliente envia o CPF ou CNPJ (apenas os números ou formatado).
   * O bot busca no banco por registros do cliente e lista os veículos e status encontrados.
3. **Menu Inicial (Outras mensagens):**
   * Se o cliente enviar qualquer mensagem de saudação (ex: "Olá", "Bom dia"), o bot responde com instruções claras sobre como realizar a consulta.

---

## ☁️ Hospedagem na Nuvem (Bot ativo 24/7)

Para deixar o bot rodando o tempo todo sem depender de manter o seu computador pessoal ligado:
1. Crie uma conta no **[Railway.app](https://railway.app/)** ou **[Render.com](https://render.com/)**.
2. Conecte sua conta do GitHub e importe este repositório (`pedro-car`).
3. Nas configurações do deploy, defina a pasta raiz (Root Directory) como `whatsapp-bot`.
4. Defina o comando de inicialização (Start Command) como `npm start`.
5. Abra a guia de Logs da hospedagem para visualizar e escanear o QR Code de conexão pela primeira vez.
