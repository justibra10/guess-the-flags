const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

const PAGE = "\n<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n<title>Guess the Flags \u2014 Teams</title>\n<script src=\"/socket.io/socket.io.js\"></script>\n<style>\n:root{font-family:Inter,system-ui,-apple-system,Segoe UI,sans-serif;color:#172033;background:#f6f8fb}\n*{box-sizing:border-box}body{margin:0}.wrap{max-width:850px;margin:0 auto;padding:28px 18px}\nh1{margin:0 0 6px;font-size:30px}.sub{color:#64748b;margin-bottom:22px}\n.card{background:white;border:1px solid #dfe5ee;border-radius:18px;padding:24px;box-shadow:0 8px 30px rgba(15,23,42,.06)}\n.row{display:flex;gap:10px;flex-wrap:wrap}.row>*{flex:1;min-width:180px}\ninput{width:100%;padding:13px 14px;border:1px solid #cbd5e1;border-radius:10px;font-size:16px}\nbutton{border:0;border-radius:10px;padding:12px 16px;font-weight:800;font-size:15px;cursor:pointer}\n.primary{background:#2563eb;color:white}.secondary{background:#eef2f7;color:#172033}\n.hidden{display:none}.center{text-align:center}.code{font-size:40px;font-weight:900;letter-spacing:7px;margin:8px 0}\n.flag{font-size:120px;margin:12px 0;font-family:\"Apple Color Emoji\",\"Segoe UI Emoji\",\"Noto Color Emoji\",sans-serif}\n.options{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:18px}\n.option{background:#f8fafc;border:1px solid #dbe2ea;min-height:56px}.option:hover{background:#eaf2ff;border-color:#2563eb}\n.option.correct{background:#dcfce7;border-color:#16a34a}.option.wrong{background:#fee2e2;border-color:#dc2626}\n.meta{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;color:#475569;font-weight:750}\n.timer{font-size:22px}.notice{min-height:25px;font-weight:750;margin-top:12px}\ntable{width:100%;border-collapse:collapse;margin-top:12px}th,td{text-align:left;padding:10px;border-bottom:1px solid #e5e7eb}th{color:#64748b;font-size:13px}\n@media(max-width:560px){.options{grid-template-columns:1fr}.flag{font-size:88px}.code{font-size:32px}}\n</style>\n</head>\n<body>\n<div class=\"wrap\">\n  <h1>\ud83c\udf0d Guess the Flags</h1>\n  <div class=\"sub\">Multiplayer quiz for a Teams meeting \u2014 no screen sharing needed.</div>\n\n  <section id=\"home\" class=\"card\">\n    <div class=\"row\">\n      <div><label>Your name</label><input id=\"name\" maxlength=\"24\" placeholder=\"e.g. Alex\"></div>\n    </div>\n    <div class=\"row\" style=\"margin-top:12px\">\n      <button class=\"primary\" id=\"create\">Create a host game</button>\n      <div style=\"display:flex;gap:8px;flex:1;min-width:260px\"><input id=\"room\" maxlength=\"4\" placeholder=\"4-letter code\"><button class=\"secondary\" id=\"join\">Join</button></div>\n    </div>\n    <div id=\"msg\" class=\"notice\" aria-live=\"polite\"></div>\n  </section>\n\n  <section id=\"lobby\" class=\"card hidden\">\n    <div class=\"center\">Share this code in the Teams chat:</div>\n    <div id=\"roomCode\" class=\"code center\">----</div>\n    <div class=\"center\" style=\"color:#64748b\">Players join from the same website using this code.</div>\n    <h3>Players</h3><div id=\"players\"></div>\n    <div class=\"center\" style=\"margin-top:18px\"><button class=\"primary hidden\" id=\"start\">Start 20-round game</button></div>\n  </section>\n\n  <section id=\"game\" class=\"card hidden\">\n    <div class=\"meta\"><span>Round <b id=\"round\">1/20</b></span><span>Score <b id=\"score\">0</b></span><span class=\"timer\">\u23f1 <b id=\"timer\">15</b></span></div>\n    <div class=\"center\">\n      <div class=\"flag\" id=\"flag\">\ud83c\uddef\ud83c\uddf5</div>\n      <div style=\"font-size:18px;font-weight:800\">Which country does this flag belong to?</div>\n    </div>\n    <div class=\"options\" id=\"options\"></div>\n    <div id=\"notice\" class=\"notice center\" aria-live=\"polite\"></div>\n  </section>\n\n  <section id=\"results\" class=\"card hidden\">\n    <div class=\"center\"><h2>\ud83c\udfc6 Final leaderboard</h2></div>\n    <div id=\"board\"></div>\n    <div class=\"center\" style=\"margin-top:18px\"><button class=\"secondary\" onclick=\"location.reload()\">Back to start</button></div>\n  </section>\n</div>\n\n<script>\nconst socket=io();\nlet isHost=false, myScore=0, timerInt=null, answered=false;\nconst $=id=>document.getElementById(id);\nfunction show(id){$(id).classList.remove(\"hidden\")} function hide(id){$(id).classList.add(\"hidden\")}\nfunction name(){return $(\"name\").value.trim()||\"Player\"}\nfunction msg(t){$(\"msg\").textContent=t}\nfunction renderPlayers(players){\n $(\"players\").innerHTML=players.map(p=>`<div style=\"padding:8px 0;border-bottom:1px solid #e5e7eb\">${escapeHtml(p.name)}</div>`).join(\"\");\n}\nfunction escapeHtml(s){return s.replace(/[&<>\"']/g,c=>({\"&\":\"&amp;\",\"<\":\"&lt;\",\">\":\"&gt;\",'\"':\"&quot;\",\"'\":\"&#39;\"}[c]))}\n$(\"create\").onclick=()=>{isHost=true;socket.emit(\"createRoom\",{name:name()})};\n$(\"join\").onclick=()=>{isHost=false;socket.emit(\"joinRoom\",{name:name(),code:$(\"room\").value})};\n$(\"start\").onclick=()=>socket.emit(\"startGame\");\n\nsocket.on(\"created\",d=>{hide(\"home\");show(\"lobby\");$(\"roomCode\").textContent=d.code;$(\"start\").classList.remove(\"hidden\")});\nsocket.on(\"joined\",d=>{hide(\"home\");show(\"lobby\");$(\"roomCode\").textContent=d.code});\nsocket.on(\"lobby\",d=>{if(!$(\"lobby\").classList.contains(\"hidden\"))renderPlayers(d.players);if(d.started){hide(\"lobby\");show(\"game\")}});\nsocket.on(\"errorMsg\",msg);\nsocket.on(\"question\",q=>{\n hide(\"lobby\");hide(\"results\");show(\"game\");answered=false;\n $(\"round\").textContent=`${q.round}/${q.total}`;$(\"flag\").textContent=q.flag;$(\"notice\").textContent=\"\";\n $(\"options\").innerHTML=q.options.map(o=>`<button class=\"option\" data-answer=\"${escapeHtml(o)}\">${escapeHtml(o)}</button>`).join(\"\");\n document.querySelectorAll(\".option\").forEach(b=>b.onclick=()=>answer(b,b.dataset.answer));\n let t=q.seconds;$(\"timer\").textContent=t;clearInterval(timerInt);\n timerInt=setInterval(()=>{t--;$(\"timer\").textContent=Math.max(0,t);if(t<=0){clearInterval(timerInt);disableOptions()}},1000);\n});\nfunction answer(btn,ans){\n if(answered)return;answered=true;clearInterval(timerInt);disableOptions();\n socket.emit(\"answer\",{answer:ans});\n}\nfunction disableOptions(){document.querySelectorAll(\".option\").forEach(b=>b.disabled=true)}\nsocket.on(\"answerResult\",r=>{\n myScore=r.score;$(\"score\").textContent=myScore;\n document.querySelectorAll(\".option\").forEach(b=>{if(b.textContent===r.correctAnswer)b.classList.add(\"correct\")});\n $(\"notice\").textContent=r.correct?\"\u2705 Correct!\":\"\u274c The answer was \"+r.correctAnswer;\n});\nsocket.on(\"roundEnded\",r=>{if(!answered)$(\"notice\").textContent=\"\u23f0 Time! The answer was \"+r.correctAnswer;renderBoard(r.leaderboard)});\nsocket.on(\"leaderboard\",renderBoard);\nfunction renderBoard(list){\n $(\"board\").innerHTML=\"<table><thead><tr><th>#</th><th>Player</th><th>Score</th></tr></thead><tbody>\"+\n list.map(p=>`<tr><td>${p.rank}</td><td>${escapeHtml(p.name)}</td><td>${p.score}</td></tr>`).join(\"\")+\n \"</tbody></table>\";\n}\nsocket.on(\"gameOver\",d=>{clearInterval(timerInt);hide(\"game\");show(\"results\");renderBoard(d.leaderboard)});\nsocket.on(\"closed\",()=>{clearInterval(timerInt);hide(\"game\");hide(\"lobby\");show(\"home\");msg(\"The host ended the game.\")});\n</script>\n</body>\n</html>\n";

app.get("/", (req,res) => {
  res.type("html").send(PAGE);
});

const flags = [
  ["🇯🇵","Japan"],["🇧🇷","Brazil"],["🇨🇦","Canada"],["🇫🇷","France"],
  ["🇬🇧","United Kingdom"],["🇩🇪","Germany"],["🇮🇹","Italy"],["🇪🇸","Spain"],
  ["🇺🇸","United States"],["🇦🇺","Australia"],["🇳🇿","New Zealand"],["🇮🇳","India"],
  ["🇿🇦","South Africa"],["🇲🇽","Mexico"],["🇳🇴","Norway"],["🇸🇪","Sweden"],
  ["🇬🇷","Greece"],["🇰🇷","South Korea"],["🇹🇷","Turkey"],["🇦🇷","Argentina"],
  ["🇵🇹","Portugal"],["🇨🇭","Switzerland"],["🇮🇪","Ireland"],["🇳🇱","Netherlands"],
  ["🇩🇰","Denmark"],["🇫🇮","Finland"],["🇵🇱","Poland"],["🇺🇦","Ukraine"],
  ["🇸🇬","Singapore"],["🇹🇭","Thailand"]
];
const rooms = new Map();
function code() { let c; do c=Math.random().toString(36).slice(2,6).toUpperCase(); while(rooms.has(c)); return c; }
function shuffle(a) { a=[...a]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]} return a; }
function board(room) { return [...room.players.values()].sort((a,b)=>b.score-a.score).map((p,i)=>({rank:i+1,name:p.name,score:p.score})); }
function lobby(rc) { const r=rooms.get(rc); if(r) io.to(rc).emit("lobby",{code:rc,started:r.started,players:[...r.players.values()].map(p=>({name:p.name,score:p.score}))}); }

io.on("connection", socket => {
 socket.on("createRoom",({name})=>{
  const rc=code(), r={host:socket.id,players:new Map(),started:false,round:0,order:[],current:null,answered:new Set(),timer:null};
  r.players.set(socket.id,{name:(name||"Host").trim().slice(0,24),score:0});
  rooms.set(rc,r); socket.join(rc); socket.roomCode=rc; socket.emit("created",{code:rc}); lobby(rc);
 });
 socket.on("joinRoom",({code:rc,name})=>{
  rc=(rc||"").trim().toUpperCase(); const r=rooms.get(rc);
  if(!r)return socket.emit("errorMsg","Room not found.");
  if(r.started)return socket.emit("errorMsg","That game has already started.");
  const clean=(name||"Player").trim().slice(0,24);
  if(!clean)return socket.emit("errorMsg","Please enter your name.");
  if([...r.players.values()].some(p=>p.name.toLowerCase()===clean.toLowerCase()))return socket.emit("errorMsg","That name is already in use.");
  r.players.set(socket.id,{name:clean,score:0}); socket.join(rc); socket.roomCode=rc; socket.emit("joined",{code:rc}); lobby(rc);
 });
 socket.on("startGame",()=>{const rc=socket.roomCode,r=rooms.get(rc);if(!r||r.host!==socket.id)return;r.started=true;r.round=0;r.order=shuffle(flags).slice(0,20);next(rc);});
 socket.on("answer",({answer})=>{
  const rc=socket.roomCode,r=rooms.get(rc);if(!r||!r.started||r.answered.has(socket.id))return;
  const p=r.players.get(socket.id);if(!p)return;r.answered.add(socket.id);const ok=answer===r.current[1];if(ok)p.score++;
  socket.emit("answerResult",{correct:ok,correctAnswer:r.current[1],score:p.score});io.to(rc).emit("leaderboard",board(r));
  if(r.answered.size>=r.players.size)endRound(rc);
 });
 socket.on("disconnect",()=>{
  const rc=socket.roomCode,r=rooms.get(rc);if(!r)return;r.players.delete(socket.id);
  if(r.host===socket.id){if(r.timer)clearTimeout(r.timer);io.to(rc).emit("closed");rooms.delete(rc);return;}
  lobby(rc);io.to(rc).emit("leaderboard",board(r));if(r.started&&r.answered.size>=r.players.size)endRound(rc);
 });
});

function next(rc) {
 const r=rooms.get(rc);if(!r)return;
 if(r.round>=20){io.to(rc).emit("gameOver",{leaderboard:board(r)});r.started=false;lobby(rc);return;}
 r.current=r.order[r.round];r.answered=new Set();
 const options=shuffle([r.current,...shuffle(flags.filter(f=>f[1]!==r.current[1])).slice(0,3)]).map(f=>f[1]);
 io.to(rc).emit("question",{round:r.round+1,total:20,flag:r.current[0],options,seconds:15});
 if(r.timer)clearTimeout(r.timer);r.timer=setTimeout(()=>endRound(rc),15000);
}
function endRound(rc) {
 const r=rooms.get(rc);if(!r||!r.started)return;if(r.timer){clearTimeout(r.timer);r.timer=null;}
 io.to(rc).emit("roundEnded",{correctAnswer:r.current[1],leaderboard:board(r)});r.round++;setTimeout(()=>next(rc),1800);
}
server.listen(PORT,()=>console.log("Guess the Flags running on port "+PORT));
