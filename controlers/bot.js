const tmi = require('tmi.js');
const axios = require('axios');
const canaisTwitch = require('../twitch.json').filter(e => e.ativo);
const socketIo = require('socket.io');
const canais = canaisTwitch.map(e => e.canal);
const config = require('../config.json')
const nomePersonagem = config.nomePersonagem;

let io = null; // criar variável para guardar o io

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function numeroAleatorio(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function setSocket(socketIoInstance) {
  io = socketIoInstance;
}

function getCanaisTwitch(){
  return canaisTwitch
}

let antSpam = false;

const client = new tmi.Client({
  options: { debug: false }, // opcional: desliga debug do tmi.js
  identity: {
    username: config.userNameTwitch,
    password: `oauth:${config.authTmi}`
  },
  channels: canais
});

client.connect();
client.on('connected', () => {
  console.log('Conectado ao user')
  if(io){
    io.emit('chat message','Conectado')
  }
});

// Monitoramento de mensagens automáticas (Bots como Nightbot ou StreamElements)
client.on('usernotice', async (channel, tags, user, mensagem) => {
  let bot = user['display-name'];
  const botsMonitorados = ['nightbot', 'streamelements'];
  const segundos = numeroAleatorio(5, 19) * 1000;

  if (botsMonitorados.includes(bot.toLowerCase()) && mensagem.includes(config.nomeUsuarioTwitchExibicao)) {
    const canalEnviarMsg = tags.split('#')[1];
    setTimeout(() => {
      client.say(canalEnviarMsg, nomePersonagem);
      io.emit('log win', `Win no canal - ${canalEnviarMsg}`)
    }, segundos);
  }
});

// Função para pegar o token da Twitch
async function getAccessToken() {
  const response = await axios.post(`https://id.twitch.tv/oauth2/token`, null, {
    params: {
      client_id: config.client_id,
      client_secret: config.client_secret,
      grant_type: 'client_credentials'
    }
  });
  return response.data.access_token;
}

// Verifica se o canal está online e jogando MU Online
async function verificarSeCanalEstaOnline(accessToken, canal) {
  const response = await axios.get(`https://api.twitch.tv/helix/streams?user_login=${canal}`, {
    headers: {
      'Client-ID': config.client_id,
      'Authorization': `Bearer ${accessToken}`
    }
  });

  const data = response.data.data;
  return data.length > 0 && data[0].game_name === 'MU Online';
}

// Função de envio disparada pelo server.js
async function enviarMensagens() {
  if (antSpam) {
    if(io){
      io.emit('chat message','🚫 As mensagens estão sendo enviadas, aguarde...')
    }
    return;
  }
  io.emit('chat message', '🔄 Enviando mensagens...')
  
  antSpam = true;

  const token = await getAccessToken();

  for (let canal of canais) {
    const canalEnviar = canal.split('#')[1];
    const canalEncontrado = canaisTwitch.find(e => e.canal == canalEnviar);
    const msg = canalEncontrado.comando || '!sorteio';

    const verificador = await verificarSeCanalEstaOnline(token, canalEnviar);

    if (!verificador) {
      io.emit('chat message',`🚫 ${canalEnviar} - Falha ao enviar canal Offline - ${msg}`)
      continue
    };

    await sleep(3000);
    if(io){
      io.emit('chat message',`${canalEnviar} - Enviado com successo - ${msg}`)
    }
    client.say(canalEnviar, msg);
  }

  antSpam = false;
  return '✅ Finalizou envio de mensagens';
}

// Exporta as funções necessárias
module.exports = {
  enviarMensagens,
  setSocket,
  getCanaisTwitch
};
