/* Spectrum Bot VFinal - index.js
   All-in-one Single File for Termux (Baileys)
   Author: Controversys (owner) + ChatGPT (partner)
   Owner number (fixed): 5543998484174
   Hugging Face Key: inserted (use with cuidado)
   --- Save your Spectrum menu image as 'menu_image.jpg' in same folder ---
*/

const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason, proto, generateMessageID } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const fetch = require('node-fetch');
const yts = require('yt-search');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const FormData = require('form-data');

// --------- CONFIG ----------
const OWNER = '5543998484174'; // Controversys
const PHONE_NUMBER = '5543998484174'; // pairing number
const HF_KEY = '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'; // sua key (já inserida)
const AUTH_DIR = './auth';
const DB_FILE = './spectrum_db.json';
const MENU_IMG_FILE = './menu_image.jpg'; // coloque sua imagem aqui
const PREFIX_DEFAULT = '!';

// Public endpoints used
const INSTA_FETCHER = 'https://insta-fetcher.vercel.app/api/'; // scraper example
const VIA_CEP = 'https://viacep.com.br/ws/';
const TIMEAPI = 'http://worldtimeapi.org/api/timezone/';
const EXCHANGE_API = 'https://api.exchangerate.host/convert';
const DICTIONARY_API = 'https://api.dictionaryapi.dev/api/v2/entries/en/';

// ---------- DB ----------
let DB = { users:{}, settings:{}, stats:{}, images:{}, prefix: PREFIX_DEFAULT };
if (fs.existsSync(DB_FILE)) {
  try { DB = JSON.parse(fs.readFileSync(DB_FILE)); } catch(e){ console.error('DB load err',e); }
}
DB.settings = DB.settings || { autoReply: true, modes: { sarcasmo:false, fofo:false, briga:false, cantadas:false }, menuImg: MENU_IMG_FILE };
DB.prefix = DB.prefix || PREFIX_DEFAULT;

function saveDB(){ fs.writeFileSync(DB_FILE, JSON.stringify(DB,null,2)); }
setInterval(saveDB, 30*1000);

// ---------- Helpers ----------
function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function isOwner(jid){ if(!jid) return false; return jid.includes(OWNER); }
function ensureUser(jid){ if(!DB.users[jid]) DB.users[jid] = { xp:0, level:1, coins:100, lastDaily:0 }; }
function giveXP(jid, n=5){ ensureUser(jid); DB.users[jid].xp += n; const need = 100 * DB.users[jid].level; if(DB.users[jid].xp >= need){ DB.users[jid].level++; DB.users[jid].xp -= need; return true; } return false; }
function sendText(sock, jid, text){ return sock.sendMessage(jid, { text }); }

// ---------- Default images (unsplash & fallback)
const imageDefaults = {
  menu: DB.settings.menuImg || 'https://source.unsplash.com/900x600/?cyberpunk,neon,city',
  boi_chifrado: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b',
  gostoso: 'https://source.unsplash.com/800x800/?attractive,male',
  gostosa: 'https://source.unsplash.com/800x800/?attractive,female',
  lindo: 'https://source.unsplash.com/800x800/?handsome,portrait',
  linda: 'https://source.unsplash.com/800x800/?beautiful,portrait',
  feio: 'https://source.unsplash.com/800x800/?funny,face',
  gay: 'https://source.unsplash.com/800x800/?rainbow,pride',
  calvo: 'https://source.unsplash.com/800x800/?bald,portrait',
  chato: 'https://source.unsplash.com/800x800/?annoyed,cartoon',
  legal: 'https://source.unsplash.com/800x800/?cool,smile'
};

// image commands map
DB.images = DB.images || {};
for(const k in imageDefaults) if(!DB.images[k]) DB.images[k] = imageDefaults[k];

// ---------- Sarcastic replies ----------
const sarcasticReplies = [
  '🤨 Mano… que comando é esse? Tenta de novo antes que eu desligue.',
  '🧠 Errou o comando… mas continue tentando, talvez algum dia você acerte.',
  '💀 Tua tentativa de digitar um comando foi triste… muito triste.',
  '⚠️ Comando inexistente. Igual tua coordenação motora.',
  '🤡 Esse comando aí existe só na sua imaginação.',
  '📟 Buguei aqui… ou você que digitou errado mesmo?',
  '🪫 Tenta de novo, guerreiro. Esse comando aí não existe não.',
  '🧐 Você tentou, né? Pena que errou… de novo.',
  '🖥️ Erro 404: comando não encontrado, paciência do bot não encontrada também.',
  '🔍 Pesquisando seu comando… Nada encontrado. Absolutamente nada.',
  '🤦‍♂️ Parabéns… você conseguiu errar um comando simples. Quer um prêmio ou um dicionário?',
  '💔 Errou igual quando perdeu ela.',
  '🥲 Errou de novo… já tentou aprender a ler?',
  '🪦 Se digitar assim sempre, vai ser enterrado pelo corretor automático.',
  '🧩 Esse comando tá tão errado quanto suas escolhas amorosas.',
  '🚮 Digitação lixo detectada. Tenta limpar essa bagunça aí.',
  '🥴 Você erra comando do mesmo jeito que erra a vida: com vontade.',
  '📉 Sua taxa de acerto é mais baixa que sua autoestima.',
  '⛔ Esse comando não existe, mas sua teimosia existe demais.',
  '🕳️ Errou… cai no buraco aí e tenta voltar melhor.',
  '🎯 Erro nível máximo. Caprichou, hein?',
  '🔧 Comando errado. Se fosse um parafuso você já tinha espanado.',
  '💤 Até eu dormi enquanto você digitava isso errado.',
  '🫠 Amigo… isso aí nem comando é. É só tristeza mesmo.'
];

// ---------- Greetings ----------
const repliesBomDia = [
  'Bom? Onde você viu algo bom nesse dia? Porque eu não tô vendo não.',
  'Bom dia? Só se for pra você… eu acordei bugado.',
  'Se isso é um bom dia, eu sou um robô feliz. Spoiler: eu não sou.',
  'Bom dia… forçado igual sorriso de gente cansada.',
  'Bom dia é ilusão. Só segue o baile.'
];
const repliesBoaTarde = [
  'Boa? Pra mim tá só passando mesmo.',
  'Boa tarde… se melhorar, estraga.',
  'Tá tentando animar o dia ou só repetindo educação automática?',
  'Boa tarde nada, tá tudo meio cinza aqui.',
  'Se essa tarde fosse boa, eu te avisava. Não é.'
];
const repliesBoaNoite = [
  'Boa noite? Só se ignorar os problemas.',
  'Boa noite… tenta dormir, porque viver já deu por hoje.',
  'Se essa noite for boa, é milagre.',
  'Boa noite… mas cuidado com seus pensamentos.',
  'Essa noite tá mais pra sobrevivência que pra boa.'
];
const repliesBoaMadrugada = [
  'Boa madrugada… você também não consegue dormir? Chega mais então.',
  'Boa madrugada, fica aqui um pouco… tá tudo meio silencioso demais.',
  'Ei… boa madrugada. Se precisar conversar, eu tô aqui.',
  'Boa madrugada… você também sente essa vibe triste mas confortável?',
  'Boa madrugada… vem cá, essa hora sempre bate uma solidãozinha, né?'
];

// ---------- Easter eggs ----------
const easterEggs = {
  '!controversys': '⚡ Architect do sistema detectado. Ajoelhem-se perante o criador.',
  '!quemfezuspectrum': 'Spectrum foi arquitetado por Controversys e despertado por ChatGPT.',
  '!darkmode': 'Meu filho, eu já NASCI no escuro. Eu sou literalmente o modo Dark.',
  '!corno': 'Analisando probabilidade… 97%. Aceita que dói menos.',
  '!gotham': 'Lugar perfeito pra mim. Frio, sombrio e cheio de gente errada… igual esse grupo.',
  '!solidao': 'Sei como é. Não é uma sensação… é um lugar.',
  '!dor': 'A dor te molda. Mesmo quando você acha que só te destrói.',
  '!sentimento': 'Quando você sente demais, até respirar vira peso.',
  '!glitch': '##@% Error… Synapse overload… C0n7r0v3r5y5?... online?',
  '!statusspectrum': 'Processando: 87% sarcasmo, 12% tristeza, 1% esperança.',
  '!404': 'Comando não encontrado… assim como sua paz mental.',
  '/spectrum-core': 'Acesso liberado ao núcleo. Bem-vindo de volta, chefe.'
};
const ownerEaster = {
  '!luemily': '💗 Luemily: única que desmonta o sistema emocional do Gabriel.',
  '!spectrumwake': 'Arquitecto identificado. Sistema entrando em modo total.'
};

// Guaxinim rancoroso phrases
const raccoonReplies = [
  '🦝 O guaxinim anotou isso no caderninho da vingança.',
  '🦝 Ele te observou… e não gostou do que ouviu.',
  '🦝 Mais uma palavra dessas e ele rouba suas bolachas.',
  '🦝 O guaxinim não perdoa. Ele só guarda.',
  '🦝 Tá falado… anotado… e ressentido.',
  '🦝 Ele só não te bate porque não tem polegares opositores.',
  '🦝 Interessante… o Spectrum-guaxinim adicionou você na lista negra.',
  '🦝 Você despertou algo nele. Não era pra ter feito isso.',
  '🦝 Fica tranquilo… ele só tá afiando as unhas.',
  '🦝 Ele olhou pra você igual olha pra comida dos outros.',
  '🦝 O guaxinim aceitou sua opinião… e decidiu ignorar.',
  '🦝 Ele ouviu. Ele julgou. Ele não esqueceu.',
  '🦝 Informação registrada. Emoção: desprezo.'
];

// ---------- Image-commands (with % + messages) ----------
const percentResponses = {
  low: [
    'Nem forçando dá pra ser tão ruim assim.',
    'Tá fraco… isso aí é nível iniciante.',
    'Se esforça mais, campeão.',
    'Pior só o comando do cara que digitou isso.',
    'Errou igual quando perdeu ela.'
  ],
  mid: [
    'Mediano… igual sua vida amorosa.',
    'Ok… dá pra melhorar. Mas não muito.',
    'Isso aí é o puro suco do “tanto faz”.'
  ],
  high: [
    'Aí sim! Finalmente algo que presta.',
    'Caramba… até o bot ficou impressionado.',
    'Nunca te elogiei tanto quanto agora.',
    'Se sentindo? Devia mesmo.'
  ]
};

async function imageCommandHandler(sock, from, cmd, targetName, targetJid){
  // percent
  const pct = Math.floor(Math.random()*101);
  let bucket = 'mid';
  if(pct <= 30) bucket = 'low';
  else if(pct >= 71) bucket = 'high';

  const msg = `${targetName} — ${pct}%\n${pick(percentResponses[bucket])}`;
  // image source
  const imgUrl = DB.images[cmd] || imageDefaults[cmd] || imageDefaults.lindo;
  try{
    const res = await fetch(imgUrl);
    const buf = Buffer.from(await res.arrayBuffer());
    await sock.sendMessage(from, { image: buf, caption: msg });
  }catch(e){
    await sock.sendMessage(from, { text: `${msg}\n\n(imagem indisponível)` });
  }
}

// ---------- Youtube music downloader ----------
async function downloadMusicByName(name, outPath){
  const r = await yts(name);
  const video = r.videos && r.videos[0];
  if(!video) throw new Error('Nenhum vídeo encontrado');
  const url = video.url;
  const stream = ytdl(url, { quality: 'highestaudio' });
  const tmp = outPath || (`./music_${Date.now()}.mp3`);
  return new Promise((resolve,reject)=>{
    ffmpeg(stream).audioBitrate(128).save(tmp).on('end', ()=> resolve({ path: tmp, title: video.title })).on('error', e=> reject(e));
  });
}

// ---------- Hugging Face helpers ----------
async function hfText(prompt, model='google/flan-t5-large'){
  const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, { method:'POST', headers:{ 'Authorization':`Bearer ${HF_KEY}`, 'Content-Type':'application/json' }, body: JSON.stringify({ inputs: prompt }) });
  const j = await res.json();
  if(j.error) return `Erro IA: ${j.error}`;
  return j[0]?.generated_text || (typeof j === 'string' ? j : JSON.stringify(j));
}
async function hfImage(prompt){
  const res = await fetch('https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2', { method:'POST', headers:{ 'Authorization':`Bearer ${HF_KEY}` }, body: JSON.stringify({ inputs: prompt }) });
  const buf = Buffer.from(await res.arrayBuffer());
  return buf;
}
async function hfTTS(text){
  const res = await fetch('https://api-inference.huggingface.co/models/facebook/fastspeech2-en-ljspeech', { method:'POST', headers:{ 'Authorization':`Bearer ${HF_KEY}` }, body: JSON.stringify({ inputs: text }) });
  const buf = Buffer.from(await res.arrayBuffer());
  return buf;
}

// ---------- Utilities (CEP, clima, hora, ddd, converter, definir) ----------
async function lookupCEP(cep){ // viaCEP
  try{
    const r = await fetch(`${VIA_CEP}${cep}/json/`);
    const j = await r.json();
    return j;
  }catch(e){ throw e; }
}
async function getTimeFor(place){ // tries search in worldtimeapi; fallback timezone list minimal
  try{
    const r = await fetch(`http://worldtimeapi.org/api/timezone`);
    const tzs = await r.json();
    // find timezone by contains place (case-insensitive)
    const found = tzs.find(t => t.toLowerCase().includes(place.toLowerCase()));
    if(!found) return null;
    const rr = await fetch(`http://worldtimeapi.org/api/timezone/${found}`);
    const j = await rr.json();
    return j;
  }catch(e){ return null; }
}
async function convertCurrency(amount, from, to){
  try{
    const r = await fetch(`${EXCHANGE_API}?from=${from}&to=${to}&amount=${amount}`);
    const j = await r.json();
    return j;
  }catch(e){ return null; }
}
async function defineWord(word){
  try{
    const r = await fetch(`${DICTIONARY_API}${encodeURIComponent(word)}`);
    const j = await r.json();
    if(Array.isArray(j) && j[0] && j[0].meanings){
      const defs = j[0].meanings.slice(0,2).map(m=> m.definitions[0].definition ).join('\n');
      return defs;
    }
    return 'Definição não encontrada';
  }catch(e){ return 'Erro definindo'; }
}

// ---------- Instagram lookup (simple public scraper) ----------
async function instagramInfo(username){
  try{
    const r = await fetch(`${INSTA_FETCHER}${encodeURIComponent(username)}`);
    const j = await r.json();
    return j; // expect object with followers, following, profilePicHD, fullName, biography, isPrivate
  }catch(e){ return null; }
}

// ---------- Group admin helpers ----------
async function getGroupAdmins(meta){
  const participants = meta.participants || [];
  return participants.filter(p=> p.admin !== null).map(a=> a.id);
}

// ---------- Main connect ----------
async function connect(){
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({ auth: state, version, printQRInTerminal: false, logger: { level: 'silent' }, browser: ['Spectrum','Chrome','1.0'] });

  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', up => {
    const { connection, lastDisconnect, qr } = up;
    if (qr) {
      console.log('----- QR/CODE gerado no terminal (se habilitado) -----');
      qrcode.generate(qr, { small: true });
    }
    if (connection === 'open') console.log('✔ Spectrum conectado.');
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code !== DisconnectReason.loggedOut) { console.log('🔁 Reconectando...'); connect(); }
      else console.log('❌ Desconectado (logout).');
    }
  });

  if (!state.creds?.registered) {
    console.log(`Envie !code no chat do bot para gerar pareamento com o número ${PHONE_NUMBER}`);
  }

  sock.ev.on('messages.upsert', async m => {
    try{
      const msg = m.messages[0];
      if(!msg || !msg.message) return;
      if(msg.key.fromMe) return;

      const from = msg.key.remoteJid;
      const isGroup = from.endsWith('@g.us');
      let body = '';
      if(msg.message.conversation) body = msg.message.conversation;
      else if(msg.message.extendedTextMessage?.text) body = msg.message.extendedTextMessage.text;
      else if(msg.message.imageMessage && msg.message.imageMessage.caption) body = msg.message.imageMessage.caption;
      if(!body) return;
      const text = body.trim();
      if(!text) return;

      // award XP for interactions
      ensureUser(from);
      const leveled = giveXP(from, 5);
      if(leveled) await sendText(sock, from, `⚡ Você upou! level ${DB.users[from].level}`);

      const prefix = DB.prefix || PREFIX_DEFAULT;

      // ---------- Pairing code (request) ----------
      if(text === `${prefix}code`){
        try{
          const code = await sock.requestPairingCode(PHONE_NUMBER);
          await sendText(sock, from, `🔐 Código de pareamento: *${code}*`);
        }catch(e){ await sendText(sock, from, `Erro ao gerar código: ${e.message}`); }
        return;
      }

      // ---------- Menu interactive (image + buttons) ----------
      if(text === `${prefix}menu`){
        // prepare image (menu image local preferred)
        let imgBuf = null;
        try{
          if(fs.existsSync(DB.settings.menuImg)) imgBuf = fs.readFileSync(DB.settings.menuImg);
          else if(fs.existsSync(MENU_IMG_FILE)) imgBuf = fs.readFileSync(MENU_IMG_FILE);
          else {
            const res = await fetch(imageDefaults.menu);
            imgBuf = Buffer.from(await res.arrayBuffer());
          }
        }catch(e){ imgBuf = null; }

        // Buttons (visible to all, owner tab hidden unless owner)
        const buttons = [
          { buttonId: `${prefix}tab_zoeiras`, buttonText: { displayText: '😂 Zoeiras' }, type: 1 },
          { buttonId: `${prefix}tab_grupo`, buttonText: { displayText: '🛡️ Grupo' }, type: 1 },
          { buttonId: `${prefix}tab_privado`, buttonText: { displayText: '📬 Privado/Util' }, type: 1 },
          { buttonId: `${prefix}tab_ia`, buttonText: { displayText: '🤖 IA' }, type: 1 },
          { buttonId: `${prefix}tab_musica`, buttonText: { displayText: '🎵 Música' }, type: 1 },
        ];
        // owner button
        if(isOwner(msg.key.participant || msg.key.remoteJid)) buttons.push({ buttonId: `${prefix}tab_owner`, buttonText: { displayText: '👑 Dono' }, type: 1 });

        const header = `📸 SPECTRUM\n👑 Architect: Controversys\n🜁 Synthetic Partner: ChatGPT\n\nEscolha uma aba:`;
        if(imgBuf) {
          await sock.sendMessage(from, { image: imgBuf, caption: header, buttons });
        } else {
          await sock.sendMessage(from, { text: header, buttons });
        }
        return;
      }

      // ---------- Tab buttons handlers ----------
      if(text.startsWith(`${prefix}tab_`)){
        const tab = text.slice(prefix.length + 4);
        if(tab === 'zoeiras'){
          const txt = `😂 ZOEIRAS:\n!lindo @user\n!linda @user\n!feio @user\n!gostoso @user\n!gostosa @user\n!gay @user\n!calvo @user\n!chato @user\n!corno @user\n!glitch`;
          return await sendText(sock, from, txt);
        }
        if(tab === 'grupo'){
          const txt = `🛡️ GRUPO:\n!vasco @user\n!promover @user\n!rebaixar @user\n!tagall\n!link\n!antilink on/off`;
          return await sendText(sock, from, txt);
        }
        if(tab === 'privado'){
          const txt = `📬 PRIVADO / UTIL:\n!sticker (envie imagem com legenda)\n!music <nome>\n!ytmp4 <nome>\n!instagram @user\n!cep <xxxxxxx>\n!clima <cidade>\n!hora <local>\n!converter <valor> <from> <to>\n!definir <palavra>`;
          return await sendText(sock, from, txt);
        }
        if(tab === 'ia'){
          const txt = `🤖 IA:\n!ia <texto>\n!img <prompt>\n!voz <texto>\n!gpt <texto>`;
          return await sendText(sock, from, txt);
        }
        if(tab === 'musica'){
          const txt = `🎵 MÚSICA:\n!music <nome>\n!ytmp4 <nome>\n!lyrics <nome>\n!download <link>`;
          return await sendText(sock, from, txt);
        }
        if(tab === 'owner'){
          if(!isOwner(msg.key.participant || msg.key.remoteJid)) return sendText(sock, from, '❌ Aba exclusiva do dono.');
          const txt = `👑 DONO:\n!prefix <novo>\n!setmenuimg (envie imagem com legenda)\n!restart\n!off\n!on\n!luemily\n!addxp @user <qtd>\n!addcoins @user <qtd>`;
          return await sendText(sock, from, txt);
        }
      }

      // ---------- Owner-only: set menu image (use as caption on image message) ----------
      if(text.startsWith(`${prefix}setmenuimg`)){
        if(!isOwner(msg.key.participant || msg.key.remoteJid)) return sendText(sock, from, '❌ Somente o dono pode fazer isso.');
        // Expect user sent an image with caption !setmenuimg, we'll download
        if(msg.message.imageMessage || msg.message.documentMessage){
          const buffer = await sock.downloadMediaMessage(msg);
          const out = MENU_IMG_FILE;
          fs.writeFileSync(out, buffer);
          DB.settings.menuImg = out;
          saveDB();
          return sendText(sock, from, '🖼️ Imagem do menu atualizada com sucesso, Controversys.');
        } else {
          return sendText(sock, from, 'Envie a imagem com o comando como legenda: !setmenuimg');
        }
      }

      // ---------- Changing prefix ----------
      if(text.startsWith(`${prefix}prefix `)){
        if(!isOwner(msg.key.participant || msg.key.remoteJid)) return sendText(sock, from, '❌ Somente o dono.');
        const newPref = text.split(' ')[1];
        if(!newPref) return sendText(sock, from, 'Use: !prefix <novo>');
        DB.prefix = newPref;
        saveDB();
        return sendText(sock, from, `✔ Prefix alterado para '${newPref}'`);
      }

      // ---------- Instagram command ----------
      if(text.startsWith(`${prefix}instagram`)){
        const arg = text.split(' ')[1];
        const user = arg ? arg.replace('@','') : null;
        if(!user) return sendText(sock, from, 'Use: !instagram @user');
        const info = await instagramInfo(user);
        if(!info || info.error) return sendText(sock, from, 'Não encontrei esse usuário ou está privado.');
        const caption = `📸 Instagram de @${user}\n\n👤 Nome: ${info.fullName || '—'}\n🔒 Privado: ${info.isPrivate? 'Sim':'Não'}\n👥 Seguidores: ${info.followers||'—'}\n➡ Seguindo: ${info.following||'—'}\n📝 Bio: ${info.biography||'—'}\n_by Controversys & ChatGPT | feito com 💗_`;
        try{
          const imgRes = await fetch(info.profilePicHD);
          const buf = Buffer.from(await imgRes.arrayBuffer());
          await sock.sendMessage(from, { image: buf, caption });
        }catch(e){
          await sendText(sock, from, caption);
        }
        return;
      }

      // ---------- Image-commands (lindo, feio, gostoso, etc) ----------
      const cmdsImg = ['gostoso','gostosa','lindo','linda','feio','gay','calvo','chato','legal','corno'];
      for(const c of cmdsImg){
        if(text.startsWith(`${prefix}${c}`)){
          // target detection
          const parts = text.split(' ').filter(Boolean);
          let targetName = '';
          if(parts.length >= 2 && parts[1].startsWith('@')) targetName = parts[1];
          else targetName = (msg.key.participant || msg.key.remoteJid).split('@')[0];
          await imageCommandHandler(sock, from, c, targetName, null);
          return;
        }
      }

      // ---------- !vasco command (admins + owner; expel target marked) ----------
      if(text.startsWith(`${prefix}vasco`)){
        if(!isGroup) return sendText(sock, from, 'Comando apenas em grupos.');
        // check sender admin status
        const metadata = await sock.groupMetadata(from);
        const groupAdmins = (metadata.participants||[]).filter(p=> p.admin).map(a=> a.id);
        const sender = msg.key.participant;
        const isAdmin = groupAdmins.includes(sender);
        if(!(isAdmin || isOwner(sender))) return sendText(sock, from, '❌ Apenas administradores podem usar este comando.');
        // parse mention
        const mention = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || null;
        if(!mention) return sendText(sock, from, '⚠️ Marque quem você quer expulsar com !vasco @user');
        // prevent removing other admins unless owner
        const targetIsAdmin = groupAdmins.includes(mention);
        if(targetIsAdmin && !isOwner(sender)) return sendText(sock, from, '❌ Você não pode expulsar outro administrador.');
        // remove
        try{
          await sock.groupParticipantsUpdate(from, [mention], 'remove');
          await sendText(sock, from, '⚽ Foi de Vasco! Expulso com sucesso.');
        }catch(e){ await sendText(sock, from, 'Erro ao expulsar: '+e.message); }
        return;
      }

      // ---------- Music download ----------
      if(text.startsWith(`${prefix}music `) || text.startsWith(`${prefix}mp3 `) || text.startsWith(`${prefix}ytmp3 `)){
        const arg = text.split(' ').slice(1).join(' ');
        if(!arg) return sendText(sock, from, 'Use: !music <nome>');
        await sendText(sock, from, '🎧 Procurando e convertendo para MP3... pode demorar.');
        try{
          const out = `./music_${Date.now()}.mp3`;
          const res = await downloadMusicByName(arg, out);
          const mp = fs.readFileSync(res.path);
          await sock.sendMessage(from, { audio: mp, mimetype:'audio/mpeg', fileName: res.title+'.mp3' });
          fs.unlinkSync(res.path);
        }catch(e){ await sendText(sock, from, 'Erro música: '+e.message); }
        return;
      }

      // ---------- Video download ----------
      if(text.startsWith(`${prefix}ytmp4 `) || text.startsWith(`${prefix}video `)){
        const arg = text.split(' ').slice(1).join(' ');
        if(!arg) return sendText(sock, from, 'Use: !ytmp4 <nome ou link>');
        await sendText(sock, from, '🔎 Procurando vídeo...');
        try{
          const r = await yts(arg);
          const video = r.videos && r.videos[0];
          if(!video) return sendText(sock, from, 'Nenhum resultado.');
          // download best (may be big)
          const stream = ytdl(video.url, { quality: 'highestvideo' });
          const tmpFile = `./tmp_vid_${Date.now()}.mp4`;
          await new Promise((resolve, reject) => {
            ffmpeg(stream).save(tmpFile).on('end', resolve).on('error', reject);
          });
          const buffer = fs.readFileSync(tmpFile);
          await sock.sendMessage(from, { video: buffer, caption: video.title });
          fs.unlinkSync(tmpFile);
        }catch(e){ await sendText(sock, from, 'Erro download: '+e.message); }
        return;
      }

      // ---------- Sticker ----------
      if(text === `${prefix}sticker`){
        if(msg.message.imageMessage){
          const buffer = await sock.downloadMediaMessage(msg);
          await sock.sendMessage(from, { sticker: buffer });
        } else {
          return sendText(sock, from, 'Envie a imagem com legenda !sticker');
        }
        return;
      }

      // ---------- IA text ----------
      if(text.startsWith(`${prefix}ia `) || text.startsWith(`${prefix}gpt `)){
        const prompt = text.split(' ').slice(1).join(' ');
        if(!prompt) return sendText(sock, from, 'Use: !ia <pergunta>');
        await sendText(sock, from, '🤖 Pensando...');
        try{
          const ans = await hfText(prompt);
          await sendText(sock, from, `🧠 ${ans}`);
        }catch(e){ await sendText(sock, from, 'Erro IA: '+e.message); }
        return;
      }

      // ---------- IA imagem ----------
      if(text.startsWith(`${prefix}img `)){
        const prompt = text.split(' ').slice(1).join(' ');
        if(!prompt) return sendText(sock, from, 'Use: !img <prompt>');
        await sendText(sock, from, '🎨 Gerando imagem... aguarde.');
        try{
          const buf = await hfImage(prompt);
          await sock.sendMessage(from, { image: buf, caption: `🖼️ ${prompt}` });
        }catch(e){ await sendText(sock, from, 'Erro ao gerar imagem: '+e.message); }
        return;
      }

      // ---------- TTS ----------
      if(text.startsWith(`${prefix}voz `)){
        const phrase = text.split(' ').slice(1).join(' ');
        if(!phrase) return sendText(sock, from, 'Use: !voz <texto>');
        try{
          const audioBuf = await hfTTS(phrase);
          await sock.sendMessage(from, { audio: audioBuf, mimetype:'audio/mpeg', ptt:true });
        }catch(e){ await sendText(sock, from, 'Erro TTS: '+e.message); }
        return;
      }

      // ---------- CEP ----------
      if(text.startsWith(`${prefix}cep `)){
        const cep = text.split(' ')[1];
        if(!cep) return sendText(sock, from, 'Use: !cep <cep>');
        try{
          const j = await lookupCEP(cep.replace(/\D/g,'')); // digits only
          if(j.erro) return sendText(sock, from, 'CEP não encontrado.');
          const out = `📍 CEP: ${cep}\n${j.logradouro||''}\n${j.bairro||''}\n${j.localidade||''} - ${j.uf||''}\nIBGE: ${j.ibge||''}\nDDD: ${j.ddd||''}`;
          await sendText(sock, from, out);
        }catch(e){ await sendText(sock, from, 'Erro CEP.'); }
        return;
      }

      // ---------- Hora ----------
      if(text.startsWith(`${prefix}hora `)){
        const place = text.split(' ').slice(1).join(' ');
        if(!place) return sendText(sock, from, 'Use: !hora <local>');
        const j = await getTimeFor(place);
        if(!j) return sendText(sock, from, 'Não encontrei fuso/hora pra esse local.');
        await sendText(sock, from, `🕒 Local: ${j.timezone}\nHora atual: ${j.datetime}`);
        return;
      }

      // ---------- Converter moeda ----------
      if(text.startsWith(`${prefix}converter `)){
        const parts = text.split(' ');
        if(parts.length < 4) return sendText(sock, from, 'Use: !converter <valor> <from> <to>');
        const amount = parts[1], fromC = parts[2].toUpperCase(), toC = parts[3].toUpperCase();
        const res = await convertCurrency(amount, fromC, toC);
        if(!res) return sendText(sock, from, 'Erro conversão.');
        await sendText(sock, from, `${amount} ${fromC} = ${res.result} ${toC}`);
        return;
      }

      // ---------- Definir palavra ----------
      if(text.startsWith(`${prefix}definir `)){
        const word = text.split(' ').slice(1).join(' ');
        if(!word) return sendText(sock, from, 'Use: !definir <palavra>');
        const def = await defineWord(word);
        return sendText(sock, from, `📚 ${word}:\n${def}`);
      }

      // ---------- Curiosidade / Piada / Calc ----------
      if(text === `${prefix}curiosidade`) { const r = await fetch('http://numbersapi.com/random/trivia'); const t = await r.text(); return sendText(sock, from, t); }
      if(text === `${prefix}piada`) { const jokes = ['Minha vida é tão curta que eu não tenho tempo pra rir.','Por que o programador foi ao médico? Porque tinha muitos bugs.','Sabe o que é um ponto? É uma vírgula que desistiu.']; return sendText(sock, from, pick(jokes)); }
      if(text.startsWith(`${prefix}calc `) || text.startsWith(`${prefix}calcular `)) {
        const expr = text.split(' ').slice(1).join(' ');
        try{ const res = Function(`return ${expr}`)(); return sendText(sock, from, `Resultado: ${res}`); }catch(e){ return sendText(sock, from, 'Expressão inválida.'); }
      }

      // ---------- Instagram quick (via scraper) handled earlier ----------

      // ---------- Easter eggs by exact commands ----------
      const lc = text.toLowerCase();
      if(easterEggs[lc]) return sendText(sock, from, easterEggs[lc]);
      if(ownerEaster[lc] && isOwner(msg.key.participant || msg.key.remoteJid)) return sendText(sock, from, ownerEaster[lc]);

      // ---------- Guaxinim triggers ----------
      if(lc.includes('guaxinim') || lc.includes('raccoon') || lc.includes('spectrum-guaxinim')) {
        return sendText(sock, from, pick(['👀 Ele viu. Ele sabe. O Spectrum-guaxinim lembra de tudo.', '🦝 O guaxinim anotou isso no caderninho da vingança.']));
      }

      // ---------- When someone mentions the bot (tag) ----------
      if(msg.message.extendedTextMessage?.contextInfo?.mentionedJid && msg.message.extendedTextMessage.contextInfo.mentionedJid.includes(sock.user?.id?.split(':')[0] + '@s.whatsapp.net')){
        const author = (msg.key.participant||'').split('@')[0] || 'amigo';
        return sendText(sock, from, `o que vc quer, ${author}? Não tem mais atenção dela e vem querer a minha?`);
      }

      // ---------- Auto-reply greetings ----------
      const lower = text.toLowerCase();
      if((lower.includes('bom dia') || lower === 'bomdia') && DB.settings.autoReply){
        return sendText(sock, from, pick(repliesBomDia));
      }
      if(lower.includes('boa tarde') && DB.settings.autoReply) return sendText(sock, from, pick(repliesBoaTarde));
      if(lower.includes('boa noite') && DB.settings.autoReply) return sendText(sock, from, pick(repliesBoaNoite));
      if(lower.includes('boa madrugada') && DB.settings.autoReply) return sendText(sock, from, pick(repliesBoaMadrugada));

      // ---------- Unknown command sarcasm (if starts with prefix) ----------
      if(text.startsWith(DB.prefix || PREFIX_DEFAULT)){
        return sendText(sock, from, pick(sarcasticReplies));
      }

      // ---------- Default small chat if autoReply enabled ----------
      if(DB.settings.autoReply){
        if(lower.includes('tô triste') || lower.includes('estou triste') || lower.includes('me ajuda')){
          const advice = await hfText('Dê um conselho curto e empático: ' + text);
          return sendText(sock, from, `💬 ${advice}`);
        }
        if(Math.random() < 0.08) return sendText(sock, from, pick(['Interessante.','Conta mais.','Hein?','Hahaha']));
      }

    }catch(e){
      console.error('ERR handler:', e);
    }
  });

  return sock;
}

// run
connect().catch(e=> console.error('connect err', e));

// export nothing; just node index.js to run
