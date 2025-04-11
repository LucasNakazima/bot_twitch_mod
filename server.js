const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const exphbs = require('express-handlebars');
const twitchBot = require('./controlers/bot');

const app = express();
const server = createServer(app);
const io = new Server(server);


const path = require('path');
const fs = require('fs');

function getExternalFile(fileName) {
  return path.join(process.cwd(), fileName);
}

const config = JSON.parse(fs.readFileSync(getExternalFile('config.json'), 'utf-8'));
const twitch = JSON.parse(fs.readFileSync(getExternalFile('twitch.json'), 'utf-8'));

// Configuração do Handlebars
app.engine('hbs', exphbs.engine({ extname: '.hbs' }));
app.set('view engine', 'hbs');
app.set('views', './views');
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.render('home');
});

// Lista de usuários conectados
const users = new Map();

app.use(express.static('public'));

app.get('/enviar', async (req, res) => {
  const resultado = await twitchBot.enviarMensagens();
  res.send(resultado);
});

app.get('/getJson', async (req, res) => {
  console.log('caiu aqui')
  const canais = twitchBot.getCanaisTwitch()
  console.log("🦝 ~ canais:", canais)
  res.send(canais)
});

io.on('connection', (socket) => {
  console.log(`Usuário conectado: ${socket.id}`);

  // Quando o usuário entra, adiciona no mapa
  users.set(socket.id, { id: socket.id });

  // Envia a lista atualizada para todos
  io.emit('user list', Array.from(users.values()));

  socket.on('chat message', (msg) => {
    io.emit('chat message', msg);
  });

  socket.on('disconnect', () => {
    console.log(`Usuário desconectado: ${socket.id}`);
    users.delete(socket.id);
    io.emit('user list', Array.from(users.values()));
  });
});

twitchBot.setSocket(io)

server.listen(3000, () => {
  console.log('Servidor rodando em http://localhost:3000');
});
