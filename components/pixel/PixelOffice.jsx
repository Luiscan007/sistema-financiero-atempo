import { useState, useEffect, useRef, useCallback } from "react";

// ─── SPRITE / DRAWING FUNCTIONS (sin cambios) ───────────────────────────────

function drawCharacterDirect(ctx, x, y, config, tick, frame) {
  const { skin, hair, shirt, pants, state, selected } = config;
  const ps = 3;
  const walk = Math.floor((tick + frame * 7) / 6) % 4;
  const bob = state === "walk" ? Math.sin((tick + frame * 5) * 0.4) * 2 : 0;
  const alertPulse = Math.sin(tick * 0.12) > 0;
  const bx = Math.round(x);
  const by = Math.round(y + bob);
  ctx.save(); ctx.globalAlpha = 0.3; ctx.fillStyle = "#000";
  ctx.beginPath(); ctx.ellipse(bx+8*ps,by+26*ps,7*ps,2.5*ps,0,0,Math.PI*2); ctx.fill(); ctx.restore();
  if (selected) {
    ctx.save(); ctx.globalAlpha = 0.4+Math.sin(tick*0.08)*0.3; ctx.fillStyle="#FFF";
    ctx.beginPath(); ctx.ellipse(bx+8*ps,by+14*ps,11*ps,16*ps,0,0,Math.PI*2); ctx.fill(); ctx.restore();
  }
  const lLegX = state==="walk"?[0,2,-2,0][walk]*ps:0;
  const rLegX = state==="walk"?[0,-2,2,0][walk]*ps:0;
  ctx.fillStyle="#1A0A05";
  ctx.fillRect(bx+2*ps+lLegX,by+23*ps,4*ps,3*ps);
  ctx.fillRect(bx+10*ps+rLegX,by+23*ps,4*ps,3*ps);
  ctx.fillStyle=pants;
  if(state==="sit"){ctx.fillRect(bx,by+16*ps,6*ps,7*ps);ctx.fillRect(bx+10*ps,by+16*ps,6*ps,7*ps);}
  else{ctx.fillRect(bx+2*ps+lLegX,by+15*ps,5*ps,9*ps);ctx.fillRect(bx+9*ps+rLegX,by+15*ps,5*ps,9*ps);}
  ctx.fillStyle=shirt;
  ctx.fillRect(bx+ps,by+9*ps,14*ps,8*ps);
  const armSwing=state==="walk"?[0,-2,0,2][walk]*ps:0;
  ctx.fillStyle=shirt;
  ctx.fillRect(bx-2*ps,by+9*ps+armSwing,4*ps,7*ps);
  ctx.fillRect(bx+14*ps,by+9*ps-armSwing,4*ps,7*ps);
  ctx.fillStyle=skin;
  ctx.fillRect(bx-2*ps,by+14*ps+armSwing,4*ps,3*ps);
  ctx.fillRect(bx+14*ps,by+14*ps-armSwing,4*ps,3*ps);
  ctx.fillStyle=skin;
  ctx.fillRect(bx+6*ps,by+7*ps,4*ps,3*ps);
  ctx.fillRect(bx+2*ps,by-ps,12*ps,10*ps);
  ctx.fillRect(bx+ps,by+ps,2*ps,4*ps);
  ctx.fillRect(bx+13*ps,by+ps,2*ps,4*ps);
  ctx.fillStyle=hair;
  ctx.fillRect(bx+2*ps,by-3*ps,12*ps,6*ps);
  ctx.fillRect(bx+ps,by-2*ps,2*ps,5*ps);
  ctx.fillRect(bx+13*ps,by-2*ps,2*ps,5*ps);
  const blink=Math.floor((tick+frame*33)/80)%12===0;
  ctx.fillStyle="#111";
  if(!blink){
    ctx.fillRect(bx+4*ps,by+3*ps,3*ps,3*ps); ctx.fillRect(bx+9*ps,by+3*ps,3*ps,3*ps);
    ctx.fillStyle="#FFF"; ctx.fillRect(bx+5*ps,by+3*ps,ps,ps); ctx.fillRect(bx+10*ps,by+3*ps,ps,ps);
    ctx.fillStyle="#222"; ctx.fillRect(bx+5*ps,by+4*ps,2*ps,2*ps); ctx.fillRect(bx+10*ps,by+4*ps,2*ps,2*ps);
  } else { ctx.fillRect(bx+4*ps,by+5*ps,3*ps,ps); ctx.fillRect(bx+9*ps,by+5*ps,3*ps,ps); }
  ctx.fillStyle="#9B5535"; ctx.fillRect(bx+6*ps,by+7*ps,4*ps,ps);
  if(state==="alert"&&alertPulse){
    ctx.fillStyle="#FF3333"; ctx.fillRect(bx+7*ps,by-10*ps,2*ps,7*ps); ctx.fillRect(bx+7*ps,by-1*ps,2*ps,2*ps);
    ctx.fillStyle="#FF8888"; ctx.fillRect(bx+7*ps,by-9*ps,ps,ps);
  }
}
function drawWoodFloor(ctx,x,y,w,h){
  ctx.fillStyle="#C8905A"; ctx.fillRect(x,y,w,h);
  const plankH=18;
  for(let py=y;py<y+h;py+=plankH){
    const pi=Math.floor((py-y)/plankH);
    ctx.fillStyle=pi%2===0?"#C8905A":"#B87848";
    ctx.fillRect(x,py,w,Math.min(plankH-1,y+h-py));
    ctx.fillStyle="rgba(90,50,10,0.18)"; ctx.fillRect(x,py+plankH-1,w,1);
    ctx.fillStyle="rgba(180,120,60,0.15)";
    for(let gx=x+(pi*37%60);gx<x+w;gx+=70) ctx.fillRect(gx,py+3,1,plankH-4);
    const offset=(pi%2)*80; ctx.fillStyle="rgba(80,40,10,0.25)";
    for(let jx=x+offset;jx<x+w;jx+=160) ctx.fillRect(jx,py,1,plankH-1);
  }
  ctx.fillStyle="rgba(200,140,60,0.06)"; ctx.fillRect(x,y,w,h);
}
function drawTileFloor(ctx,x,y,w,h,dark=false){
  const base=dark?"#485E6C":"#D0C4B0",alt=dark?"#3A4E5A":"#BEB2A0",grout=dark?"#2A3A48":"#A89880";
  const ts=20;
  for(let ty=0;ty<Math.ceil(h/ts);ty++){
    for(let tx=0;tx<Math.ceil(w/ts);tx++){
      ctx.fillStyle=(tx+ty)%2===0?base:alt;
      const fx=x+tx*ts,fy=y+ty*ts;
      ctx.fillRect(fx,fy,Math.min(ts-1,x+w-fx),Math.min(ts-1,y+h-fy));
      ctx.fillStyle=dark?"rgba(255,255,255,0.06)":"rgba(255,255,255,0.20)";
      ctx.fillRect(fx+1,fy+1,Math.min(ts-4,x+w-fx-3),2);
    }
  }
  ctx.fillStyle=grout;
  for(let gx=0;gx<=Math.ceil(w/ts);gx++) ctx.fillRect(x+gx*ts-1,y,1,h);
  for(let gy=0;gy<=Math.ceil(h/ts);gy++) ctx.fillRect(x,y+gy*ts-1,w,1);
}
function drawWallSegment(ctx,x,y,w,color,accentColor){
  ctx.fillStyle=color; ctx.fillRect(x,y,w,40);
  ctx.fillStyle=accentColor; ctx.fillRect(x,y+37,w,3);
  ctx.fillStyle="rgba(0,0,0,0.4)"; ctx.fillRect(x,y+39,w,2);
  ctx.fillStyle="rgba(255,255,255,0.04)"; ctx.fillRect(x,y,w,8);
}
function drawDesk(ctx,x,y,w=60){
  ctx.fillStyle="#B08050"; ctx.fillRect(x,y,w,20);
  ctx.fillStyle="rgba(255,255,255,0.15)"; ctx.fillRect(x+1,y+1,w-2,3);
  ctx.fillStyle="#7A5228"; ctx.fillRect(x,y+20,w,8);
  ctx.fillStyle="#5A3A18"; ctx.fillRect(x+3,y+26,5,10); ctx.fillRect(x+w-8,y+26,5,10);
  ctx.fillStyle="rgba(0,0,0,0.2)"; ctx.fillRect(x+8,y+8,w-16,1);
  ctx.fillStyle="#C8A060"; ctx.fillRect(x+w/2-5,y+10,10,3);
  ctx.fillStyle="rgba(0,0,0,0.3)"; ctx.fillRect(x+w/2-4,y+11,8,1);
}
function drawMonitor(ctx,x,y){
  ctx.fillStyle="#2A2A3A"; ctx.fillRect(x+10,y+24,6,5); ctx.fillRect(x+6,y+28,14,3);
  ctx.fillStyle="#1E1E2E"; ctx.fillRect(x,y,26,24);
  ctx.fillStyle="#2A2A3E"; ctx.fillRect(x+1,y+1,24,22);
  ctx.fillStyle="#1A3A5A"; ctx.fillRect(x+2,y+2,22,18);
  ctx.fillStyle="#2A5A8A"; ctx.fillRect(x+3,y+3,20,16);
  ctx.fillStyle="#4A8AC8"; ctx.fillRect(x+4,y+4,18,3);
  ctx.fillStyle="#2A6A9A"; ctx.fillRect(x+4,y+9,12,2); ctx.fillRect(x+4,y+13,8,2);
  ctx.fillStyle="rgba(255,255,255,0.08)"; ctx.fillRect(x+3,y+3,20,5);
  ctx.fillStyle="#30FF80"; ctx.fillRect(x+23,y+21,2,2);
}
function drawChair(ctx,x,y){
  ctx.fillStyle="rgba(0,0,0,0.15)"; ctx.fillRect(x-2,y+2,26,32);
  ctx.fillStyle="#C8A860"; ctx.fillRect(x,y,22,14);
  ctx.fillStyle="#A07838"; ctx.fillRect(x+1,y+12,20,2);
  ctx.fillStyle="#C8A860"; ctx.fillRect(x+1,y+14,20,12);
  ctx.fillStyle="rgba(255,255,255,0.12)"; ctx.fillRect(x+2,y+14,18,3);
  ctx.fillStyle="#A07838"; ctx.fillRect(x+1,y+25,20,2);
  ctx.fillStyle="#484840";
  ctx.fillRect(x+2,y+26,3,8); ctx.fillRect(x+17,y+26,3,8); ctx.fillRect(x+2,y+30,18,2);
}
function drawShelf(ctx,x,y,w=70,dark=false){
  const woodC=dark?"#5A3A18":"#9B7040",darkC=dark?"#3A2008":"#6A4820";
  ctx.fillStyle=dark?"#2A1808":"#4A2808"; ctx.fillRect(x,y,w,44);
  ctx.fillStyle=woodC; ctx.fillRect(x,y,w,6); ctx.fillRect(x,y+20,w,5); ctx.fillRect(x,y+38,w,6);
  ctx.fillStyle=darkC; ctx.fillRect(x,y,4,44); ctx.fillRect(x+w-4,y,4,44);
  const books1=[{c:"#C83030",w:6},{c:"#2850C0",w:8},{c:"#30A040",w:5},{c:"#D09030",w:7},{c:"#8030A0",w:6},{c:"#D06020",w:5},{c:"#C83030",w:4}];
  let bx=x+5;
  books1.forEach(b=>{
    if(bx+b.w>x+w-5)return;
    ctx.fillStyle=b.c; ctx.fillRect(bx,y+7,b.w,12);
    ctx.fillStyle="rgba(255,255,255,0.2)"; ctx.fillRect(bx,y+7,1,12);
    ctx.fillStyle="rgba(0,0,0,0.25)"; ctx.fillRect(bx+b.w-1,y+7,1,12);
    bx+=b.w+1;
  });
  const books2=[{c:"#2050C0",w:5},{c:"#30A030",w:7},{c:"#C03030",w:4},{c:"#C09020",w:8},{c:"#702090",w:6},{c:"#2050C0",w:5}];
  bx=x+5;
  books2.forEach(b=>{
    if(bx+b.w>x+w-5)return;
    ctx.fillStyle=b.c; ctx.fillRect(bx,y+26,b.w,11);
    ctx.fillStyle="rgba(255,255,255,0.18)"; ctx.fillRect(bx,y+26,1,11);
    bx+=b.w+1;
  });
}
function drawPlant(ctx,x,y,tall=false){
  const h=tall?50:36;
  ctx.fillStyle="#6A4020"; ctx.fillRect(x+3,y+h-12,14,2);
  ctx.fillStyle="#8B5A30"; ctx.fillRect(x+2,y+h-10,16,12);
  ctx.fillStyle="#5A3010"; ctx.fillRect(x+2,y+h-10,16,2);
  ctx.fillStyle="#2A1408"; ctx.fillRect(x+3,y+h-9,14,4);
  ctx.fillStyle="#2A4A1A"; ctx.fillRect(x+9,y+h-18,2,tall?20:12);
  if(tall){ctx.fillRect(x+5,y+h-30,2,14);ctx.fillRect(x+13,y+h-25,2,10);}
  const drawLeaf=(lx,ly,size)=>{
    ctx.fillStyle="#3A6A2A";
    ctx.beginPath();ctx.ellipse(lx,ly,size*1.4,size*0.8,-0.5,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(lx,ly,size*1.4,size*0.8,0.5,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#5A9A40";ctx.beginPath();ctx.ellipse(lx,ly-1,size*0.8,size*0.5,0,0,Math.PI*2);ctx.fill();
  };
  if(tall){drawLeaf(x+10,y+h-40,10);drawLeaf(x+5,y+h-30,8);drawLeaf(x+14,y+h-26,7);drawLeaf(x+10,y+h-20,9);}
  else{drawLeaf(x+10,y+h-26,9);drawLeaf(x+10,y+h-18,8);}
}
function drawMirrorWall(ctx,x,y,w){
  ctx.fillStyle="#7A5228"; ctx.fillRect(x,y,w,28);
  ctx.fillStyle="#C0D8E8"; ctx.fillRect(x+2,y+2,w-4,22);
  ctx.fillStyle="rgba(255,255,255,0.35)"; ctx.fillRect(x+3,y+3,w-6,5);
  ctx.fillStyle="rgba(255,255,255,0.12)"; ctx.fillRect(x+3,y+3,4,18);
  ctx.fillStyle="#9B7040"; ctx.fillRect(x,y+28,w,5);
  ctx.fillStyle="rgba(255,255,255,0.2)"; ctx.fillRect(x,y+28,w,2);
}
function drawSpeaker(ctx,x,y){
  ctx.fillStyle="#222"; ctx.fillRect(x,y,18,26);
  ctx.fillStyle="#333"; ctx.fillRect(x+1,y+1,16,24);
  ctx.fillStyle="#1A3050";ctx.beginPath();ctx.ellipse(x+9,y+12,7,7,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#2A5080";ctx.beginPath();ctx.ellipse(x+9,y+12,5,5,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#3A70A0";ctx.beginPath();ctx.ellipse(x+9,y+12,3,3,0,0,Math.PI*2);ctx.fill();
}
function drawCoffeeMachine(ctx,x,y){
  ctx.fillStyle="#3A3A3A";ctx.fillRect(x,y,36,44);
  ctx.fillStyle="#282828";ctx.fillRect(x+1,y+1,34,42);
  ctx.fillStyle="#C83030";ctx.fillRect(x+1,y+1,34,5);
  ctx.fillStyle="#0A1A0A";ctx.fillRect(x+3,y+8,30,14);
  ctx.fillStyle="#003000";ctx.fillRect(x+4,y+9,28,12);
  ctx.fillStyle="#00FF80";ctx.fillRect(x+5,y+10,16,2);ctx.fillRect(x+5,y+14,10,2);
  [0,1,2].forEach(i=>{
    ctx.fillStyle=i===0?"#D03030":i===1?"#3050C0":"#888";
    ctx.beginPath();ctx.ellipse(x+8+i*10,y+28,4,4,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="rgba(255,255,255,0.2)";ctx.beginPath();ctx.ellipse(x+7+i*10,y+27,2,2,0,0,Math.PI*2);ctx.fill();
  });
  ctx.fillStyle="#555";ctx.fillRect(x+14,y+33,8,6);
  ctx.fillStyle="#3A3A3A";ctx.fillRect(x+2,y+38,32,6);
  ctx.fillStyle="#282828";ctx.fillRect(x+3,y+39,30,4);
}
function drawFridge(ctx,x,y){
  ctx.fillStyle="#C8D4DC";ctx.fillRect(x,y,34,48);
  ctx.fillStyle="#E0EAF0";ctx.fillRect(x+1,y+1,32,46);
  ctx.fillStyle="#D0DCE4";ctx.fillRect(x+2,y+2,30,20);ctx.fillRect(x+2,y+24,30,22);
  ctx.fillStyle="#A0B0BC";ctx.fillRect(x+26,y+8,4,8);ctx.fillRect(x+26,y+30,4,8);
  ctx.fillStyle="#A0B0BC";ctx.fillRect(x+2,y+22,30,2);
  ctx.fillStyle="#A0B4C0";ctx.fillRect(x+8,y+10,12,4);
}
function drawClock(ctx,x,y,tick){
  const r=16;
  ctx.fillStyle="#F0E8D8";ctx.beginPath();ctx.ellipse(x,y,r,r,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle="#3A2A1A";ctx.lineWidth=2;ctx.stroke();
  for(let i=0;i<12;i++){
    const a=(i/12)*Math.PI*2-Math.PI/2;
    ctx.fillStyle="#3A2A1A";ctx.fillRect(x+Math.cos(a)*(r-3)-1,y+Math.sin(a)*(r-3)-1,2,2);
  }
  const hr=((tick*0.001)%(Math.PI*2))-Math.PI/2;
  const mn=((tick*0.006)%(Math.PI*2))-Math.PI/2;
  ctx.strokeStyle="#1A1A1A";ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(hr)*8,y+Math.sin(hr)*8);ctx.stroke();
  ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(mn)*12,y+Math.sin(mn)*12);ctx.stroke();
  ctx.fillStyle="#C83030";ctx.beginPath();ctx.ellipse(x,y,2,2,0,0,Math.PI*2);ctx.fill();
}
function drawCafeTable(ctx,x,y){
  ctx.fillStyle="#9B6A38";ctx.beginPath();ctx.ellipse(x,y,22,13,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#B07840";ctx.beginPath();ctx.ellipse(x,y,20,11,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="rgba(255,255,255,0.12)";ctx.beginPath();ctx.ellipse(x-3,y-2,14,7,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#7A5228";ctx.fillRect(x-3,y+12,6,10);ctx.fillRect(x-8,y+20,16,4);
  ctx.fillStyle="#E8DCC8";ctx.fillRect(x-4,y-5,8,8);
  ctx.fillStyle="#3A1808";ctx.fillRect(x-3,y-3,6,4);
  ctx.fillStyle="#E8DCC8";ctx.fillRect(x+3,y-3,3,4);
}
function drawBoxes(ctx,x,y){
  ctx.fillStyle="#B07838";ctx.fillRect(x,y,28,20);
  ctx.fillStyle="#C89048";ctx.fillRect(x,y,28,8);
  ctx.fillStyle="#907030";ctx.fillRect(x+13,y,2,20);ctx.fillRect(x,y+9,28,2);
  ctx.fillStyle="#9A6828";ctx.fillRect(x+4,y-14,22,16);
  ctx.fillStyle="#B07838";ctx.fillRect(x+4,y-14,22,6);
  ctx.fillStyle="#7A5018";ctx.fillRect(x+14,y-14,2,16);
}
function drawPainting(ctx,x,y){
  ctx.fillStyle="#5A3A20";ctx.fillRect(x,y,44,32);
  ctx.fillStyle="#87CEEB";ctx.fillRect(x+2,y+2,40,28);
  ctx.fillStyle="#A0D8EF";ctx.fillRect(x+2,y+2,40,14);
  ctx.fillStyle="#5A9A3A";ctx.fillRect(x+2,y+18,40,12);
  ctx.fillStyle="#4A8030";ctx.fillRect(x+2,y+22,40,8);
  ctx.fillStyle="rgba(255,255,255,0.85)";
  ctx.beginPath();ctx.ellipse(x+15,y+8,8,5,0,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.ellipse(x+30,y+11,7,4,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="rgba(255,255,255,0.15)";ctx.fillRect(x,y,44,2);ctx.fillRect(x,y,2,32);
}
function drawCafeCounter(ctx,x,y,w){
  ctx.fillStyle="#6A3C18";ctx.fillRect(x,y,w,22);
  ctx.fillStyle="rgba(255,255,255,0.08)";ctx.fillRect(x,y,w,3);
  ctx.fillStyle="#4A2808";ctx.fillRect(x,y+22,w,10);
  ctx.fillStyle="#8B5A30";ctx.fillRect(x,y+20,w,3);
}

// ─── CLAUDE API CALL (via proxy server-side) ────────────────────────────────
async function callClaude(systemPrompt, messages) {
  const res = await fetch("/api/chat-agente", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system: systemPrompt, messages }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.text || "...";
}

// ─── AGENTE CONFIG ───────────────────────────────────────────────────────────
const AGENT_INFO = [
  { id:"fin",  name:"Luna",  role:"Finanzas",   emoji:"💰", color:"#EF4444", shirt:"#C83030" },
  { id:"alm",  name:"Marco", role:"Alumnos",    emoji:"🎓", color:"#818CF8", shirt:"#3050C8" },
  { id:"cob",  name:"Sofia", role:"Cobros",     emoji:"📋", color:"#34D399", shirt:"#30A040" },
  { id:"asi",  name:"Diego", role:"Asistencia", emoji:"✅", color:"#F472B6", shirt:"#C03030" },
  { id:"gas",  name:"Ana",   role:"Gastos",     emoji:"📊", color:"#FBBF24", shirt:"#C8A030" },
];

function buildSystemPrompt(agent, studioData, otherAgents) {
  const others = otherAgents.map(a => `- ${a.name} (${a.role}): ${a.statusSummary}`).join("\n");
  return `Eres ${agent.name}, agente de ${agent.role} del Estudio ATEMPO en Venezuela.
Eres conciso, directo y profesional. Respondes en español. Máximo 2-3 oraciones cortas.
Puedes mencionar a tus compañeros por nombre si es relevante.

ESTADO ACTUAL DEL ESTUDIO:
- Ventas hoy: Bs ${studioData.ventasHoy.toLocaleString("es-VE")}
- Alumnos activos: ${studioData.alumnosActivos}
- Alumnos con pocas clases: ${studioData.conPocasClases}
- Cuentas vencidas: ${studioData.cuentasVencidas}
- Presentes hoy: ${studioData.presentesHoy}
- Gastos del mes: Bs ${studioData.gastosMes.toLocaleString("es-VE")}

TUS COMPAÑEROS:
${others}

Tu área específica: ${agent.role}. Responde desde tu perspectiva profesional.
Cuando el jefe te habla directamente, responde con tu análisis y coordínate con otros agentes si es necesario.`;
}

// ─── COMPONENTE PRINCIPAL ───────────────────────────────────────────────────
export default function PixelOffice({
  ventasHoy=0, alumnosActivos=0, cuentasVencidas=0,
  presentesHoy=0, conPocasClases=0, gastosMes=0
}) {
  const canvasRef = useRef(null);
  const tickRef   = useRef(0);
  const spritesRef = useRef([]);
  const rafRef    = useRef(null);
  const chatEndRef = useRef(null);

  const [selected, setSelected]   = useState(null);
  const [messages, setMessages]   = useState([]);   // {from, text, ts, type}
  const [input, setInput]         = useState("");
  const [loadingAgent, setLoadingAgent] = useState(null);
  const [agentHistories, setAgentHistories] = useState({});  // id -> [{role,content}]

  const CW=960, CH=420;

  const studioData = { ventasHoy, alumnosActivos, cuentasVencidas, presentesHoy, conPocasClases, gastosMes };

  // Auto-scroll chat
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);

  // Mensaje de bienvenida al montar
  useEffect(() => {
    const alertas = [];
    if (ventasHoy === 0) alertas.push("Luna reporta sin ventas hoy");
    if (conPocasClases > 0) alertas.push(`Marco reporta ${conPocasClases} alumnos con pocas clases`);
    if (cuentasVencidas > 0) alertas.push(`Sofia reporta ${cuentasVencidas} cuentas vencidas`);

    const bienvenida = alertas.length > 0
      ? `Sistema iniciado. Alertas activas: ${alertas.join(", ")}.`
      : "Sistema iniciado. Todos los agentes operando normalmente.";

    setMessages([{ from:"sistema", text: bienvenida, ts: new Date(), type:"sistema" }]);
  // eslint-disable-next-line
  }, []);

  // ── ROOMS & SPRITES ─────────────────────────────────────────────────────
  const ROOMS = [
    {id:"salon_a",      x:0,   y:0,   w:230, h:200, floor:"wood", wall:"#1E2840", accent:"#3A5A90", label:"Salon A 💃"},
    {id:"salon_b",      x:232, y:0,   w:220, h:200, floor:"wood", wall:"#28182E", accent:"#6040A0", label:"Salon B 🎭"},
    {id:"salon_c",      x:454, y:0,   w:220, h:200, floor:"wood", wall:"#102830", accent:"#208090", label:"Salon C 🎶"},
    {id:"cafetín",      x:676, y:0,   w:284, h:200, floor:"tile", wall:"#2E1A08", accent:"#A07020", label:"Cafetín ☕"},
    {id:"oficina_admin",x:0,   y:202, w:320, h:218, floor:"wood", wall:"#102018", accent:"#208040", label:"Admin 🖥️"},
    {id:"oficina_conta",x:322, y:202, w:318, h:218, floor:"dark", wall:"#18082E", accent:"#8020A0", label:"Contabilidad 📊"},
    {id:"hall",         x:642, y:202, w:318, h:218, floor:"tile", wall:"#181828", accent:"#303858", label:""},
  ];

  const CHAR_CONFIGS = [
    {id:"fin", name:"Luna",  role:"Finanzas",   roomId:"oficina_conta",
     skin:"#F5C5A3",hair:"#1A0808",shirt:"#C83030",pants:"#2A3A5A",
     alertMsg:ventasHoy===0?"Sin ventas hoy":undefined,
     statValue:ventasHoy>0?`Bs ${(ventasHoy/1000).toFixed(0)}k`:"-", initState:ventasHoy>0?"sit":"idle"},
    {id:"alm", name:"Marco", role:"Alumnos",    roomId:"oficina_admin",
     skin:"#C8906A",hair:"#1A0E02",shirt:"#3050C8",pants:"#2A3018",
     alertMsg:conPocasClases>0?`${conPocasClases} con pocas clases`:undefined,
     statValue:String(alumnosActivos), initState:conPocasClases>0?"alert":alumnosActivos>0?"sit":"idle"},
    {id:"cob", name:"Sofia", role:"Cobros",     roomId:"oficina_conta",
     skin:"#F0DCC0",hair:"#D8D0C8",shirt:"#30A040",pants:"#1A2040",
     alertMsg:cuentasVencidas>0?`${cuentasVencidas} vencidas`:undefined,
     statValue:cuentasVencidas>0?`${cuentasVencidas}!`:"OK", initState:cuentasVencidas>0?"alert":"idle"},
    {id:"asi", name:"Diego", role:"Asistencia", roomId:"salon_a",
     skin:"#1A0A05",hair:"#0A0505",shirt:"#C03030",pants:"#1A2030",
     alertMsg:undefined, statValue:String(presentesHoy), initState:presentesHoy>0?"walk":"idle"},
    {id:"gas", name:"Ana",   role:"Gastos",     roomId:"cafetín",
     skin:"#F5C5A3",hair:"#3D1C02",shirt:"#C8A030",pants:"#3A2018",
     alertMsg:undefined, statValue:gastosMes>0?`${(gastosMes/1000).toFixed(0)}k`:"-", initState:"idle"},
  ];

  useEffect(() => {
    spritesRef.current = CHAR_CONFIGS.map((cfg,i) => {
      const room = ROOMS.find(r=>r.id===cfg.roomId);
      const px=room.x+40+(i%3)*55, py=room.y+80+Math.floor(i/3)*50;
      return {...cfg, pos:{x:px,y:py}, target:{x:px,y:py}, frame:i*2.8,
              state:cfg.initState||"idle", sitTimer:200+i*70, waitTimer:0};
    });
  // eslint-disable-next-line
  },[ventasHoy,alumnosActivos,cuentasVencidas,presentesHoy,conPocasClases,gastosMes]);

  // ── CANVAS LOOP ──────────────────────────────────────────────────────────
  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas)return;
    const ctx=canvas.getContext("2d"); ctx.imageSmoothingEnabled=false;
    const loop=()=>{
      tickRef.current++; const tick=tickRef.current;
      ctx.fillStyle="#080C14"; ctx.fillRect(0,0,CW,CH);
      ROOMS.forEach(r=>{
        if(r.floor==="wood")      drawWoodFloor(ctx,r.x,r.y+42,r.w,r.h-42);
        else if(r.floor==="dark") drawTileFloor(ctx,r.x,r.y+42,r.w,r.h-42,true);
        else                      drawTileFloor(ctx,r.x,r.y+42,r.w,r.h-42,false);
      });
      ctx.fillStyle="rgba(0,0,0,0.6)";
      [[230,0,2,200],[452,0,2,200],[674,0,2,200],[0,200,960,2],[320,202,2,218],[640,202,2,218]]
        .forEach(([x,y,w,h])=>ctx.fillRect(x,y,w,h));
      ROOMS.forEach(r=>{
        if(r.label){ drawWallSegment(ctx,r.x,r.y,r.w,r.wall,r.accent);
          ctx.fillStyle=r.accent; ctx.font="bold 11px monospace"; ctx.textAlign="left";
          ctx.fillText(r.label,r.x+8,r.y+26); }
      });
      drawMirrorWall(ctx,2,42,226); drawSpeaker(ctx,208,52); drawPlant(ctx,5,100,true); drawPlant(ctx,200,138);
      drawMirrorWall(ctx,234,42,216); drawSpeaker(ctx,234,52); drawSpeaker(ctx,428,52); drawPlant(ctx,340,130);
      drawMirrorWall(ctx,456,42,216); drawSpeaker(ctx,456,52); drawPlant(ctx,458,120,true); drawPlant(ctx,648,148);
      drawClock(ctx,800,58,tick); drawCoffeeMachine(ctx,678,45); drawFridge(ctx,920,48);
      drawCafeCounter(ctx,678,100,250); drawCafeTable(ctx,740,152); drawCafeTable(ctx,810,168); drawCafeTable(ctx,890,155); drawPlant(ctx,924,105,true);
      drawShelf(ctx,2,244,70); drawShelf(ctx,78,244,70);
      drawChair(ctx,30,308); drawDesk(ctx,24,294,64); drawMonitor(ctx,34,268);
      drawChair(ctx,170,308); drawDesk(ctx,164,294,64); drawMonitor(ctx,174,268);
      drawBoxes(ctx,5,330); drawPlant(ctx,290,290,true); drawPlant(ctx,4,380); drawPlant(ctx,290,380);
      drawShelf(ctx,324,244,68,true); drawShelf(ctx,398,244,68,true);
      drawChair(ctx,340,310); drawDesk(ctx,334,296,68); drawMonitor(ctx,344,270);
      drawChair(ctx,490,336); drawDesk(ctx,484,322,68); drawMonitor(ctx,494,296);
      drawPainting(ctx,548,248); drawPlant(ctx,614,290,true); drawPlant(ctx,614,375);
      // Hall status panel
      ctx.fillStyle="#080C18"; ctx.fillRect(654,214,300,92);
      ctx.strokeStyle="#1E3060"; ctx.lineWidth=2; ctx.strokeRect(654,214,300,92);
      ctx.fillStyle="#0C1424"; ctx.fillRect(658,218,292,84);
      ctx.fillStyle="#1E4080"; ctx.font="bold 10px monospace"; ctx.textAlign="left";
      ctx.fillText("> ATEMPO STATUS",668,232);
      spritesRef.current.forEach((sp,i)=>{
        const iy=244+i*14; const pulse=Math.sin(tick*0.12+i)>0;
        ctx.fillStyle=sp.state==="alert"?(pulse?"#EF4444":"#7F1D1D"):sp.shirt;
        ctx.beginPath(); ctx.ellipse(668,iy,4,4,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle="#6A7A8A"; ctx.font="9px monospace"; ctx.textAlign="left"; ctx.fillText(sp.role,678,iy+3);
        if(sp.statValue){ctx.fillStyle=sp.shirt;ctx.font="bold 9px monospace";ctx.textAlign="right";ctx.fillText(sp.statValue,940,iy+3);}
      });
      [660,698,736].forEach(cx=>drawChair(ctx,cx,330)); drawPlant(ctx,920,260);
      // Sprites
      spritesRef.current=spritesRef.current.map(sp=>{
        if(sp.waitTimer>0) return{...sp,state:"sit",waitTimer:sp.waitTimer-1};
        const dx=sp.target.x-sp.pos.x, dy=sp.target.y-sp.pos.y;
        const dist=Math.sqrt(dx*dx+dy*dy);
        if(dist>3){
          const speed=sp.alertMsg?1.8:1.0;
          return{...sp,pos:{x:sp.pos.x+(dx/dist)*speed,y:sp.pos.y+(dy/dist)*speed},state:sp.alertMsg?"alert":"walk"};
        }
        let{sitTimer}=sp; sitTimer--;
        if(sitTimer<=0){
          const base=ROOMS.find(r=>r.id===sp.roomId);
          const dest=Math.random()<0.1?ROOMS.find(r=>r.id==="cafetín"):base;
          const m=30, tx=dest.x+m+Math.random()*(dest.w-m*2), ty=dest.y+70+Math.random()*(dest.h-110);
          return{...sp,target:{x:tx,y:ty},state:"walk",sitTimer:180+Math.random()*200,waitTimer:dest.id.startsWith("oficina")?80+Math.random()*120:0};
        }
        return{...sp,state:sp.alertMsg?"alert":"sit",sitTimer};
      });
      const sorted=[...spritesRef.current].sort((a,b)=>a.pos.y-b.pos.y);
      sorted.filter(sp=>sp.id!==selected).forEach(sp=>drawCharacterDirect(ctx,sp.pos.x,sp.pos.y,{...sp,selected:false},tick,sp.frame));
      const sel=sorted.find(sp=>sp.id===selected);
      if(sel) drawCharacterDirect(ctx,sel.pos.x,sel.pos.y,{...sel,selected:true},tick,sel.frame);
      ctx.fillStyle="rgba(0,0,0,0.03)";
      for(let sl=0;sl<CH;sl+=4) ctx.fillRect(0,sl,CW,2);
      const vg=ctx.createRadialGradient(CW/2,CH/2,CH*0.3,CW/2,CH/2,CH*0.8);
      vg.addColorStop(0,"rgba(0,0,0,0)"); vg.addColorStop(1,"rgba(0,0,0,0.25)");
      ctx.fillStyle=vg; ctx.fillRect(0,0,CW,CH);
      rafRef.current=requestAnimationFrame(loop);
    };
    rafRef.current=requestAnimationFrame(loop);
    return()=>cancelAnimationFrame(rafRef.current);
  },[selected]);

  const handleClick=useCallback(e=>{
    const canvas=canvasRef.current; if(!canvas)return;
    const rect=canvas.getBoundingClientRect();
    const mx=(e.clientX-rect.left)*(CW/rect.width), my=(e.clientY-rect.top)*(CH/rect.height);
    const hit=spritesRef.current.find(sp=>Math.abs(sp.pos.x+8-mx)<20&&Math.abs(sp.pos.y+8-my)<24);
    if(hit) { setSelected(p=>p===hit.id?null:hit.id); }
    else { setSelected(null); }
  },[]);

  // ── ENVIAR MENSAJE A LOS AGENTES ─────────────────────────────────────────
  const sendMessage = useCallback(async (text, targetAgentId = null) => {
    if(!text.trim()) return;

    // Añadir mensaje del jefe
    setMessages(prev=>[...prev, { from:"jefe", text, ts:new Date(), type:"jefe" }]);
    setInput("");

    // Construir estado de otros agentes para contexto compartido
    const agentsToRespond = targetAgentId
      ? AGENT_INFO.filter(a=>a.id===targetAgentId)
      : AGENT_INFO; // todos responden si no hay target

    for (const agent of agentsToRespond) {
      setLoadingAgent(agent.id);
      try {
        const otherAgents = AGENT_INFO.filter(a=>a.id!==agent.id).map(a=>({
          name: a.name,
          role: a.role,
          statusSummary: getAgentSummary(a.id, studioData),
        }));
        const systemPrompt = buildSystemPrompt(agent, studioData, otherAgents);
        const history = agentHistories[agent.id] || [];
        const newUserMsg = { role:"user", content: text };
        const allMessages = [...history, newUserMsg];

        const reply = await callClaude(systemPrompt, allMessages);

        // Actualizar historial del agente
        setAgentHistories(prev=>({
          ...prev,
          [agent.id]: [...allMessages, { role:"assistant", content:reply }].slice(-20),
        }));

        setMessages(prev=>[...prev, {
          from: agent.id, name: agent.name, role: agent.role,
          emoji: agent.emoji, color: agent.color,
          text: reply, ts: new Date(), type:"agente"
        }]);
      } catch(err) {
        setMessages(prev=>[...prev, {
          from: agent.id, name: agent.name, role: agent.role,
          emoji: agent.emoji, color: agent.color,
          text:"[Error de conexión]", ts:new Date(), type:"agente"
        }]);
      }
    }
    setLoadingAgent(null);
  }, [agentHistories, studioData]);

  // Hacer clic en agente desde canvas → abrir chat directo con ese agente
  const handleAgentClick = useCallback((agentId) => {
    setSelected(prev=>prev===agentId?null:agentId);
  }, []);

  // ── DATA PILLS ───────────────────────────────────────────────────────────
  const agents = AGENT_INFO.map(a=>({
    ...a,
    alert: getAgentAlert(a.id, studioData),
    val: getAgentVal(a.id, studioData),
  }));

  return (
    <div style={{fontFamily:"'Courier New',monospace",background:"#080C14",borderRadius:"14px",overflow:"hidden",color:"#E2E8F0",border:"1px solid #1E293B"}}>

      {/* ── HEADER ── */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",borderBottom:"1px solid #1E293B",background:"#0A0F1E"}}>
        <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
          <span style={{fontSize:"18px"}}>🏢</span>
          <div>
            <div style={{fontSize:"13px",fontWeight:"bold",letterSpacing:"0.05em"}}>ATEMPO STUDIO — CENTRO DE CONTROL</div>
            <div style={{fontSize:"9px",color:"#334155",letterSpacing:"0.1em"}}>SISTEMA MULTI-AGENTE IA ACTIVO</div>
          </div>
        </div>
        <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
          {agents.filter(a=>a.alert).map(a=>(
            <span key={a.id} style={{fontSize:"9px",padding:"2px 8px",borderRadius:"999px",
              background:"rgba(239,68,68,0.12)",border:"1px solid rgba(239,68,68,0.3)",color:"#F87171"}}>
              {a.emoji} {a.name}: {a.alert}
            </span>
          ))}
        </div>
      </div>

      {/* ── CANVAS ── */}
      <div style={{position:"relative",background:"#080C14"}}>
        <canvas ref={canvasRef} width={CW} height={CH}
          onClick={handleClick}
          style={{width:"100%",display:"block",cursor:"pointer",imageRendering:"pixelated"}}/>
        <div style={{position:"absolute",bottom:"8px",right:"12px",fontSize:"9px",color:"#1E293B"}}>
          ATEMPO v2.0 · {new Date().toLocaleTimeString("es-VE",{hour:"2-digit",minute:"2-digit"})}
        </div>
      </div>

      {/* ── AGENTES PILLS ── */}
      <div style={{display:"flex",gap:"6px",flexWrap:"wrap",padding:"10px 12px",borderTop:"1px solid #0F172A",background:"#090D1A"}}>
        {agents.map(a=>(
          <button key={a.id} onClick={()=>{ handleAgentClick(a.id); }}
            style={{display:"flex",alignItems:"center",gap:"6px",padding:"6px 12px",borderRadius:"8px",border:"1px solid",
              borderColor:selected===a.id?a.color:"#1E293B",
              background:selected===a.id?a.color+"18":"#0F172A",
              cursor:"pointer",color:"#E2E8F0",flex:"1",minWidth:"120px",transition:"all 0.15s"}}>
            <span style={{fontSize:"14px"}}>{a.emoji}</span>
            <div style={{textAlign:"left",flex:1}}>
              <div style={{fontSize:"10px",fontWeight:"bold"}}>{a.name}</div>
              <div style={{fontSize:"9px",color:a.alert?"#F87171":a.color}}>{a.alert?`⚠ ${a.alert}`:a.val}</div>
            </div>
            <span style={{width:"7px",height:"7px",borderRadius:"50%",flexShrink:0,
              background:loadingAgent===a.id?"#F59E0B":a.alert?"#EF4444":"#22C55E",
              boxShadow:`0 0 6px ${loadingAgent===a.id?"#F59E0B":a.alert?"#EF4444":"#22C55E"}`,
              animation:loadingAgent===a.id?"pulse 0.8s infinite":"none"}}/>
          </button>
        ))}
      </div>

      {/* ── TERMINAL DE COMUNICACIONES ── */}
      <div style={{borderTop:"1px solid #1E293B"}}>
        {/* Terminal header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 14px",background:"#0A0F1E",borderBottom:"1px solid #0F172A"}}>
          <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
            <div style={{width:"8px",height:"8px",borderRadius:"50%",background:"#22C55E",boxShadow:"0 0 6px #22C55E"}}/>
            <span style={{fontSize:"10px",color:"#475569",letterSpacing:"0.1em"}}>TERMINAL JEFE → AGENTES</span>
          </div>
          {selected && (
            <span style={{fontSize:"9px",color:agents.find(a=>a.id===selected)?.color,padding:"2px 8px",
              border:`1px solid ${agents.find(a=>a.id===selected)?.color}40`,borderRadius:"4px"}}>
              → {agents.find(a=>a.id===selected)?.name} ({agents.find(a=>a.id===selected)?.role})
            </span>
          )}
          {!selected && (
            <span style={{fontSize:"9px",color:"#475569"}}>→ TODOS LOS AGENTES</span>
          )}
        </div>

        {/* Mensajes */}
        <div style={{height:"220px",overflowY:"auto",padding:"10px 14px",display:"flex",flexDirection:"column",gap:"6px",background:"#060A12"}}>
          {messages.map((m,i)=>(
            <div key={i} style={{display:"flex",gap:"8px",alignItems:"flex-start",
              flexDirection:m.type==="jefe"?"row-reverse":"row"}}>
              {m.type==="sistema" && (
                <div style={{width:"100%",textAlign:"center",fontSize:"9px",color:"#1E3A5F",
                  padding:"4px 0",borderTop:"1px solid #0F172A",borderBottom:"1px solid #0F172A"}}>
                  ⬡ {m.text}
                </div>
              )}
              {m.type==="agente" && (
                <>
                  <div style={{width:"22px",height:"22px",borderRadius:"4px",flexShrink:0,
                    background:m.color+"20",border:`1px solid ${m.color}40`,
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px"}}>
                    {m.emoji}
                  </div>
                  <div style={{maxWidth:"75%"}}>
                    <div style={{fontSize:"8px",color:m.color,marginBottom:"2px",letterSpacing:"0.05em"}}>
                      {m.name.toUpperCase()} · {m.role}
                    </div>
                    <div style={{fontSize:"11px",color:"#CBD5E1",background:"#0F172A",
                      padding:"6px 10px",borderRadius:"0 6px 6px 6px",border:`1px solid ${m.color}20`,
                      lineHeight:"1.5"}}>
                      {m.text}
                    </div>
                  </div>
                </>
              )}
              {m.type==="jefe" && (
                <>
                  <div style={{width:"22px",height:"22px",borderRadius:"4px",flexShrink:0,
                    background:"#1E3A5F",border:"1px solid #2A5A8A",
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px"}}>
                    👑
                  </div>
                  <div style={{maxWidth:"75%"}}>
                    <div style={{fontSize:"8px",color:"#3B82F6",marginBottom:"2px",letterSpacing:"0.05em",textAlign:"right"}}>
                      JEFE · {selected ? `→ ${agents.find(a=>a.id===selected)?.name}` : "→ TODOS"}
                    </div>
                    <div style={{fontSize:"11px",color:"#93C5FD",background:"#0F2040",
                      padding:"6px 10px",borderRadius:"6px 0 6px 6px",border:"1px solid #1E3A5F",
                      lineHeight:"1.5"}}>
                      {m.text}
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
          {loadingAgent && (
            <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
              <div style={{width:"22px",height:"22px",borderRadius:"4px",
                background:AGENT_INFO.find(a=>a.id===loadingAgent)?.color+"20",
                border:`1px solid ${AGENT_INFO.find(a=>a.id===loadingAgent)?.color}40`,
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px"}}>
                {AGENT_INFO.find(a=>a.id===loadingAgent)?.emoji}
              </div>
              <div style={{fontSize:"11px",color:"#475569",background:"#0F172A",
                padding:"6px 10px",borderRadius:"0 6px 6px 6px",border:"1px solid #1E293B"}}>
                <span style={{animation:"blink 1s infinite"}}>●●●</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef}/>
        </div>

        {/* Input */}
        <div style={{padding:"10px 12px",background:"#0A0F1E",borderTop:"1px solid #0F172A"}}>
          {/* Botones rápidos */}
          <div style={{display:"flex",gap:"5px",marginBottom:"8px",flexWrap:"wrap"}}>
            {[
              {label:"📊 Reporte general", msg:"Dame un reporte rápido del estado del estudio hoy."},
              {label:"⚠️ Alertas", msg:"¿Qué alertas o problemas activos hay que deba atender?"},
              {label:"💬 Coordinación", msg:"Coordínense entre ustedes y dígame qué acciones tomar hoy."},
            ].map(q=>(
              <button key={q.label} onClick={()=>sendMessage(q.msg, selected)}
                style={{fontSize:"9px",padding:"4px 10px",borderRadius:"6px",
                  background:"#0F172A",border:"1px solid #1E293B",color:"#64748B",
                  cursor:"pointer",transition:"all 0.1s",whiteSpace:"nowrap"}}
                onMouseOver={e=>e.currentTarget.style.borderColor="#334155"}
                onMouseOut={e=>e.currentTarget.style.borderColor="#1E293B"}>
                {q.label}
              </button>
            ))}
          </div>
          {/* Campo de texto */}
          <div style={{display:"flex",gap:"8px"}}>
            <input
              value={input}
              onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); sendMessage(input, selected); }}}
              placeholder={selected ? `Escribir a ${agents.find(a=>a.id===selected)?.name}…` : "Escribir a todos los agentes… (Enter para enviar)"}
              disabled={!!loadingAgent}
              style={{flex:1,background:"#060A12",border:"1px solid #1E293B",borderRadius:"6px",
                padding:"8px 12px",fontSize:"11px",color:"#CBD5E1",outline:"none",
                fontFamily:"'Courier New',monospace",opacity:loadingAgent?0.5:1}}
            />
            <button onClick={()=>sendMessage(input, selected)} disabled={!!loadingAgent || !input.trim()}
              style={{padding:"8px 16px",borderRadius:"6px",border:"none",
                background:loadingAgent||!input.trim()?"#1E293B":"#1E3A5F",
                color:loadingAgent||!input.trim()?"#334155":"#93C5FD",
                cursor:loadingAgent||!input.trim()?"not-allowed":"pointer",
                fontSize:"11px",fontWeight:"bold",transition:"all 0.15s"}}>
              ENVIAR
            </button>
          </div>
          <div style={{fontSize:"8px",color:"#1E293B",marginTop:"4px",letterSpacing:"0.05em"}}>
            {selected ? `CANAL DIRECTO → ${agents.find(a=>a.id===selected)?.name.toUpperCase()}` : "BROADCAST → TODOS LOS AGENTES"} · Click en agente para canal directo
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.2} }
      `}</style>
    </div>
  );
}

// ── HELPERS ──────────────────────────────────────────────────────────────────
function getAgentAlert(id, d) {
  if(id==="fin")  return d.ventasHoy===0?"Sin ventas hoy":undefined;
  if(id==="alm")  return d.conPocasClases>0?`${d.conPocasClases} pocas clases`:undefined;
  if(id==="cob")  return d.cuentasVencidas>0?`${d.cuentasVencidas} vencidas`:undefined;
  return undefined;
}
function getAgentVal(id, d) {
  if(id==="fin")  return `Bs ${(d.ventasHoy/1000).toFixed(0)}k`;
  if(id==="alm")  return `${d.alumnosActivos} activos`;
  if(id==="cob")  return d.cuentasVencidas>0?`${d.cuentasVencidas} cuentas`:"Sin vencidas";
  if(id==="asi")  return `${d.presentesHoy} presentes`;
  if(id==="gas")  return `Bs ${(d.gastosMes/1000).toFixed(0)}k mes`;
  return "-";
}
function getAgentSummary(id, d) {
  if(id==="fin")  return d.ventasHoy>0?`Ventas hoy: Bs ${d.ventasHoy.toLocaleString("es-VE")}`:"Sin ventas hoy";
  if(id==="alm")  return `${d.alumnosActivos} activos, ${d.conPocasClases} con pocas clases`;
  if(id==="cob")  return `${d.cuentasVencidas} cuentas vencidas`;
  if(id==="asi")  return `${d.presentesHoy} presentes hoy`;
  if(id==="gas")  return `Gastos del mes: Bs ${d.gastosMes.toLocaleString("es-VE")}`;
  return "OK";
}

function Stat({ label, val, color }) {
  return (
    <div style={{padding:"10px 12px",borderRadius:"8px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)"}}>
      <div style={{fontSize:"9px",color:"#64748B",textTransform:"uppercase",letterSpacing:"0.05em"}}>{label}</div>
      <div style={{fontSize:"13px",fontWeight:"bold",color,marginTop:"3px"}}>{val}</div>
    </div>
  );
}
