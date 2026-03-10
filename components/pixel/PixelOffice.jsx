import { useState, useEffect, useRef, useCallback } from "react";

// ─── PIXEL CHARACTER RENDERER ────────────────────────────────────────────────
function drawCharacterDirect(ctx, x, y, config, tick, frame) {
  const { skin, hair, shirt, pants, state, selected } = config;
  const ps = 3;
  const walk = Math.floor((tick + frame * 7) / 6) % 4;
  const bob = state === "walk" ? Math.sin((tick + frame * 5) * 0.4) * 2 : 0;
  const alertPulse = Math.sin(tick * 0.12) > 0;

  const bx = Math.round(x);
  const by = Math.round(y + bob);

  // Shadow
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(bx + 8 * ps, by + 26 * ps, 7 * ps, 2.5 * ps, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Selected glow
  if (selected) {
    ctx.save();
    ctx.globalAlpha = 0.4 + Math.sin(tick * 0.08) * 0.3;
    ctx.fillStyle = "#00FF88";
    ctx.beginPath();
    ctx.ellipse(bx + 8 * ps, by + 14 * ps, 11 * ps, 16 * ps, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Shoes
  const lLegX = state === "walk" ? [0, 2, -2, 0][walk] * ps : 0;
  const rLegX = state === "walk" ? [0, -2, 2, 0][walk] * ps : 0;
  ctx.fillStyle = "#1A0A05";
  ctx.fillRect(bx + 2 * ps + lLegX, by + 23 * ps, 4 * ps, 3 * ps);
  ctx.fillRect(bx + 10 * ps + rLegX, by + 23 * ps, 4 * ps, 3 * ps);

  // Legs
  ctx.fillStyle = pants;
  if (state === "sit") {
    ctx.fillRect(bx, by + 16 * ps, 6 * ps, 7 * ps);
    ctx.fillRect(bx + 10 * ps, by + 16 * ps, 6 * ps, 7 * ps);
  } else {
    ctx.fillRect(bx + 2 * ps + lLegX, by + 15 * ps, 5 * ps, 9 * ps);
    ctx.fillRect(bx + 9 * ps + rLegX, by + 15 * ps, 5 * ps, 9 * ps);
  }

  // Torso
  ctx.fillStyle = shirt;
  ctx.fillRect(bx + ps, by + 9 * ps, 14 * ps, 8 * ps);
  const armSwing = state === "walk" ? [0, -2, 0, 2][walk] * ps : 0;
  ctx.fillStyle = shirt;
  ctx.fillRect(bx - 2 * ps, by + 9 * ps + armSwing, 4 * ps, 7 * ps);
  ctx.fillRect(bx + 14 * ps, by + 9 * ps - armSwing, 4 * ps, 7 * ps);
  ctx.fillStyle = skin;
  ctx.fillRect(bx - 2 * ps, by + 14 * ps + armSwing, 4 * ps, 3 * ps);
  ctx.fillRect(bx + 14 * ps, by + 14 * ps - armSwing, 4 * ps, 3 * ps);

  // Neck + Head
  ctx.fillStyle = skin;
  ctx.fillRect(bx + 6 * ps, by + 7 * ps, 4 * ps, 3 * ps);
  ctx.fillRect(bx + 2 * ps, by - ps, 12 * ps, 10 * ps);
  ctx.fillRect(bx + ps, by + ps, 2 * ps, 4 * ps);
  ctx.fillRect(bx + 13 * ps, by + ps, 2 * ps, 4 * ps);

  // Hair
  ctx.fillStyle = hair;
  ctx.fillRect(bx + 2 * ps, by - 3 * ps, 12 * ps, 6 * ps);
  ctx.fillRect(bx + ps, by - 2 * ps, 2 * ps, 5 * ps);
  ctx.fillRect(bx + 13 * ps, by - 2 * ps, 2 * ps, 5 * ps);

  // Eyes
  const blink = Math.floor((tick + frame * 33) / 80) % 12 === 0;
  ctx.fillStyle = "#111";
  if (!blink) {
    ctx.fillRect(bx + 4 * ps, by + 3 * ps, 3 * ps, 3 * ps);
    ctx.fillRect(bx + 9 * ps, by + 3 * ps, 3 * ps, 3 * ps);
    ctx.fillStyle = "#FFF";
    ctx.fillRect(bx + 5 * ps, by + 3 * ps, ps, ps);
    ctx.fillRect(bx + 10 * ps, by + 3 * ps, ps, ps);
    ctx.fillStyle = "#222";
    ctx.fillRect(bx + 5 * ps, by + 4 * ps, 2 * ps, 2 * ps);
    ctx.fillRect(bx + 10 * ps, by + 4 * ps, 2 * ps, 2 * ps);
  } else {
    ctx.fillRect(bx + 4 * ps, by + 5 * ps, 3 * ps, ps);
    ctx.fillRect(bx + 9 * ps, by + 5 * ps, 3 * ps, ps);
  }

  // Mouth
  ctx.fillStyle = "#9B5535";
  ctx.fillRect(bx + 6 * ps, by + 7 * ps, 4 * ps, ps);

  // Alert
  if (state === "alert" && alertPulse) {
    ctx.fillStyle = "#FF3333";
    ctx.fillRect(bx + 7 * ps, by - 10 * ps, 2 * ps, 7 * ps);
    ctx.fillRect(bx + 7 * ps, by - 1 * ps, 2 * ps, 2 * ps);
    ctx.fillStyle = "#FF8888";
    ctx.fillRect(bx + 7 * ps, by - 9 * ps, ps, ps);
  }
}

// ─── FLOOR RENDERERS ─────────────────────────────────────────────────────────
function drawWoodFloor(ctx, x, y, w, h) {
  ctx.fillStyle = "#C8905A";
  ctx.fillRect(x, y, w, h);
  const plankH = 18;
  for (let py = y; py < y + h; py += plankH) {
    const plankIdx = Math.floor((py - y) / plankH);
    ctx.fillStyle = plankIdx % 2 === 0 ? "#C8905A" : "#B87848";
    ctx.fillRect(x, py, w, Math.min(plankH - 1, y + h - py));
    ctx.fillStyle = "rgba(90,50,10,0.18)";
    ctx.fillRect(x, py + plankH - 1, w, 1);
    ctx.fillStyle = "rgba(180,120,60,0.15)";
    for (let gx = x + (plankIdx * 37 % 60); gx < x + w; gx += 70)
      ctx.fillRect(gx, py + 3, 1, plankH - 4);
    const offset = (plankIdx % 2) * 80;
    ctx.fillStyle = "rgba(80,40,10,0.25)";
    for (let jx = x + offset; jx < x + w; jx += 160)
      ctx.fillRect(jx, py, 1, plankH - 1);
  }
  ctx.fillStyle = "rgba(200,140,60,0.06)";
  ctx.fillRect(x, y, w, h);
}

function drawTileFloor(ctx, x, y, w, h, dark = false) {
  const base = dark ? "#485E6C" : "#D0C4B0";
  const alt = dark ? "#3A4E5A" : "#BEB2A0";
  const grout = dark ? "#2A3A48" : "#A89880";
  const ts = 20;
  for (let ty = 0; ty < Math.ceil(h / ts); ty++) {
    for (let tx = 0; tx < Math.ceil(w / ts); tx++) {
      ctx.fillStyle = (tx + ty) % 2 === 0 ? base : alt;
      const fx = x + tx * ts, fy = y + ty * ts;
      ctx.fillRect(fx, fy, Math.min(ts - 1, x + w - fx), Math.min(ts - 1, y + h - fy));
      ctx.fillStyle = dark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.20)";
      ctx.fillRect(fx + 1, fy + 1, Math.min(ts - 4, x + w - fx - 3), 2);
    }
  }
  ctx.fillStyle = grout;
  for (let gx = 0; gx <= Math.ceil(w / ts); gx++) ctx.fillRect(x + gx * ts - 1, y, 1, h);
  for (let gy = 0; gy <= Math.ceil(h / ts); gy++) ctx.fillRect(x, y + gy * ts - 1, w, 1);
}

// ─── FURNITURE ───────────────────────────────────────────────────────────────
function drawWallSegment(ctx, x, y, w, color, accentColor) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, 40);
  ctx.fillStyle = accentColor;
  ctx.fillRect(x, y + 37, w, 3);
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(x, y + 39, w, 2);
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.fillRect(x, y, w, 8);
}

function drawDesk(ctx, x, y, w = 60, color = "#B08050") {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, 20);
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillRect(x + 1, y + 1, w - 2, 3);
  ctx.fillStyle = "#7A5228";
  ctx.fillRect(x, y + 20, w, 8);
  ctx.fillStyle = "#5A3A18";
  ctx.fillRect(x + 3, y + 26, 5, 10);
  ctx.fillRect(x + w - 8, y + 26, 5, 10);
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.fillRect(x + 8, y + 8, w - 16, 1);
  ctx.fillStyle = "#C8A060";
  ctx.fillRect(x + w / 2 - 5, y + 10, 10, 3);
}

function drawMonitor(ctx, x, y) {
  ctx.fillStyle = "#2A2A3A";
  ctx.fillRect(x + 10, y + 24, 6, 5);
  ctx.fillRect(x + 6, y + 28, 14, 3);
  ctx.fillStyle = "#1E1E2E";
  ctx.fillRect(x, y, 26, 24);
  ctx.fillStyle = "#2A2A3E";
  ctx.fillRect(x + 1, y + 1, 24, 22);
  ctx.fillStyle = "#1A3A5A";
  ctx.fillRect(x + 2, y + 2, 22, 18);
  ctx.fillStyle = "#2A5A8A";
  ctx.fillRect(x + 3, y + 3, 20, 16);
  ctx.fillStyle = "#4A8AC8";
  ctx.fillRect(x + 4, y + 4, 18, 3);
  ctx.fillStyle = "#2A6A9A";
  ctx.fillRect(x + 4, y + 9, 12, 2);
  ctx.fillRect(x + 4, y + 13, 8, 2);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(x + 3, y + 3, 20, 5);
  ctx.fillStyle = "#30FF80";
  ctx.fillRect(x + 23, y + 21, 2, 2);
}

function drawChair(ctx, x, y) {
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.fillRect(x - 2, y + 2, 26, 32);
  ctx.fillStyle = "#C8A860";
  ctx.fillRect(x, y, 22, 14);
  ctx.fillStyle = "#A07838";
  ctx.fillRect(x + 1, y + 12, 20, 2);
  ctx.fillStyle = "#C8A860";
  ctx.fillRect(x + 1, y + 14, 20, 12);
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(x + 2, y + 14, 18, 3);
  ctx.fillStyle = "#A07838";
  ctx.fillRect(x + 1, y + 25, 20, 2);
  ctx.fillStyle = "#484840";
  ctx.fillRect(x + 2, y + 26, 3, 8);
  ctx.fillRect(x + 17, y + 26, 3, 8);
  ctx.fillRect(x + 2, y + 30, 18, 2);
}

function drawShelf(ctx, x, y, w = 70, dark = false) {
  const woodC = dark ? "#5A3A18" : "#9B7040";
  const darkC = dark ? "#3A2008" : "#6A4820";
  ctx.fillStyle = dark ? "#2A1808" : "#4A2808";
  ctx.fillRect(x, y, w, 44);
  ctx.fillStyle = woodC;
  ctx.fillRect(x, y, w, 6);
  ctx.fillRect(x, y + 20, w, 5);
  ctx.fillRect(x, y + 38, w, 6);
  ctx.fillStyle = darkC;
  ctx.fillRect(x, y, 4, 44);
  ctx.fillRect(x + w - 4, y, 4, 44);
  const books1 = [
    { c: "#C83030", w: 6 }, { c: "#2850C0", w: 8 }, { c: "#30A040", w: 5 },
    { c: "#D09030", w: 7 }, { c: "#8030A0", w: 6 }, { c: "#D06020", w: 5 }, { c: "#C83030", w: 4 },
  ];
  let bx = x + 5;
  books1.forEach(b => {
    if (bx + b.w > x + w - 5) return;
    ctx.fillStyle = b.c;
    ctx.fillRect(bx, y + 7, b.w, 12);
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fillRect(bx, y + 7, 1, 12);
    bx += b.w + 1;
  });
  const books2 = [
    { c: "#2050C0", w: 5 }, { c: "#30A030", w: 7 }, { c: "#C03030", w: 4 },
    { c: "#C09020", w: 8 }, { c: "#702090", w: 6 }, { c: "#2050C0", w: 5 },
  ];
  bx = x + 5;
  books2.forEach(b => {
    if (bx + b.w > x + w - 5) return;
    ctx.fillStyle = b.c;
    ctx.fillRect(bx, y + 26, b.w, 11);
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(bx, y + 26, 1, 11);
    bx += b.w + 1;
  });
}

function drawPlant(ctx, x, y, tall = false) {
  const h = tall ? 50 : 36;
  ctx.fillStyle = "#6A4020";
  ctx.fillRect(x + 3, y + h - 12, 14, 2);
  ctx.fillStyle = "#8B5A30";
  ctx.fillRect(x + 2, y + h - 10, 16, 12);
  ctx.fillStyle = "#5A3010";
  ctx.fillRect(x + 2, y + h - 10, 16, 2);
  ctx.fillStyle = "#2A1408";
  ctx.fillRect(x + 3, y + h - 9, 14, 4);
  ctx.fillStyle = "#2A4A1A";
  ctx.fillRect(x + 9, y + h - 18, 2, tall ? 20 : 12);
  if (tall) {
    ctx.fillRect(x + 5, y + h - 30, 2, 14);
    ctx.fillRect(x + 13, y + h - 25, 2, 10);
  }
  const drawLeaf = (lx, ly, size) => {
    ctx.fillStyle = "#3A6A2A";
    ctx.beginPath();
    ctx.ellipse(lx, ly, size * 1.4, size * 0.8, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(lx, ly, size * 1.4, size * 0.8, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#5A9A40";
    ctx.beginPath();
    ctx.ellipse(lx, ly - 1, size * 0.8, size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  if (tall) {
    drawLeaf(x + 10, y + h - 40, 10);
    drawLeaf(x + 5, y + h - 30, 8);
    drawLeaf(x + 14, y + h - 26, 7);
    drawLeaf(x + 10, y + h - 20, 9);
  } else {
    drawLeaf(x + 10, y + h - 26, 9);
    drawLeaf(x + 10, y + h - 18, 8);
  }
}

function drawMirrorWall(ctx, x, y, w) {
  ctx.fillStyle = "#7A5228";
  ctx.fillRect(x, y, w, 28);
  ctx.fillStyle = "#C0D8E8";
  ctx.fillRect(x + 2, y + 2, w - 4, 22);
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillRect(x + 3, y + 3, w - 6, 5);
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(x + 3, y + 3, 4, 18);
  ctx.fillStyle = "#9B7040";
  ctx.fillRect(x, y + 28, w, 5);
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.fillRect(x, y + 28, w, 2);
}

function drawSpeaker(ctx, x, y) {
  ctx.fillStyle = "#222";
  ctx.fillRect(x, y, 18, 26);
  ctx.fillStyle = "#333";
  ctx.fillRect(x + 1, y + 1, 16, 24);
  ctx.fillStyle = "#1A3050";
  ctx.beginPath();
  ctx.ellipse(x + 9, y + 12, 7, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2A5080";
  ctx.beginPath();
  ctx.ellipse(x + 9, y + 12, 5, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3A70A0";
  ctx.beginPath();
  ctx.ellipse(x + 9, y + 12, 3, 3, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawCoffeeMachine(ctx, x, y) {
  ctx.fillStyle = "#3A3A3A";
  ctx.fillRect(x, y, 36, 44);
  ctx.fillStyle = "#282828";
  ctx.fillRect(x + 1, y + 1, 34, 42);
  ctx.fillStyle = "#C83030";
  ctx.fillRect(x + 1, y + 1, 34, 5);
  ctx.fillStyle = "#0A1A0A";
  ctx.fillRect(x + 3, y + 8, 30, 14);
  ctx.fillStyle = "#003000";
  ctx.fillRect(x + 4, y + 9, 28, 12);
  ctx.fillStyle = "#00FF80";
  ctx.fillRect(x + 5, y + 10, 16, 2);
  ctx.fillRect(x + 5, y + 14, 10, 2);
  [0, 1, 2].forEach(i => {
    ctx.fillStyle = i === 0 ? "#D03030" : i === 1 ? "#3050C0" : "#888";
    ctx.beginPath();
    ctx.ellipse(x + 8 + i * 10, y + 28, 4, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = "#555";
  ctx.fillRect(x + 14, y + 33, 8, 6);
  ctx.fillStyle = "#3A3A3A";
  ctx.fillRect(x + 2, y + 38, 32, 6);
  ctx.fillStyle = "#282828";
  ctx.fillRect(x + 3, y + 39, 30, 4);
}

function drawFridge(ctx, x, y) {
  ctx.fillStyle = "#C8D4DC";
  ctx.fillRect(x, y, 34, 48);
  ctx.fillStyle = "#E0EAF0";
  ctx.fillRect(x + 1, y + 1, 32, 46);
  ctx.fillStyle = "#D0DCE4";
  ctx.fillRect(x + 2, y + 2, 30, 20);
  ctx.fillRect(x + 2, y + 24, 30, 22);
  ctx.fillStyle = "#A0B0BC";
  ctx.fillRect(x + 26, y + 8, 4, 8);
  ctx.fillRect(x + 26, y + 30, 4, 8);
  ctx.fillRect(x + 2, y + 22, 30, 2);
  ctx.fillStyle = "#A0B4C0";
  ctx.fillRect(x + 8, y + 10, 12, 4);
}

function drawClock(ctx, x, y, tick) {
  const r = 16;
  ctx.fillStyle = "#F0E8D8";
  ctx.beginPath();
  ctx.ellipse(x, y, r, r, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3A2A1A";
  ctx.lineWidth = 2;
  ctx.stroke();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    ctx.fillStyle = "#3A2A1A";
    ctx.fillRect(x + Math.cos(a) * (r - 3) - 1, y + Math.sin(a) * (r - 3) - 1, 2, 2);
  }
  const hr = ((tick * 0.001) % (Math.PI * 2)) - Math.PI / 2;
  const mn = ((tick * 0.006) % (Math.PI * 2)) - Math.PI / 2;
  ctx.strokeStyle = "#1A1A1A";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(hr) * 8, y + Math.sin(hr) * 8);
  ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(mn) * 12, y + Math.sin(mn) * 12);
  ctx.stroke();
  ctx.fillStyle = "#C83030";
  ctx.beginPath();
  ctx.ellipse(x, y, 2, 2, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawCafeTable(ctx, x, y) {
  ctx.fillStyle = "#9B6A38";
  ctx.beginPath();
  ctx.ellipse(x, y, 22, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#B07840";
  ctx.beginPath();
  ctx.ellipse(x, y, 20, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.beginPath();
  ctx.ellipse(x - 3, y - 2, 14, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#7A5228";
  ctx.fillRect(x - 3, y + 12, 6, 10);
  ctx.fillRect(x - 8, y + 20, 16, 4);
  ctx.fillStyle = "#E8DCC8";
  ctx.fillRect(x - 4, y - 5, 8, 8);
  ctx.fillStyle = "#3A1808";
  ctx.fillRect(x - 3, y - 3, 6, 4);
  ctx.fillStyle = "#E8DCC8";
  ctx.fillRect(x + 3, y - 3, 3, 4);
}

function drawBoxes(ctx, x, y) {
  ctx.fillStyle = "#B07838";
  ctx.fillRect(x, y, 28, 20);
  ctx.fillStyle = "#C89048";
  ctx.fillRect(x, y, 28, 8);
  ctx.fillStyle = "#907030";
  ctx.fillRect(x + 13, y, 2, 20);
  ctx.fillRect(x, y + 9, 28, 2);
  ctx.fillStyle = "#9A6828";
  ctx.fillRect(x + 4, y - 14, 22, 16);
  ctx.fillStyle = "#B07838";
  ctx.fillRect(x + 4, y - 14, 22, 6);
  ctx.fillStyle = "#7A5018";
  ctx.fillRect(x + 14, y - 14, 2, 16);
}

function drawPainting(ctx, x, y) {
  ctx.fillStyle = "#5A3A20";
  ctx.fillRect(x, y, 44, 32);
  ctx.fillStyle = "#87CEEB";
  ctx.fillRect(x + 2, y + 2, 40, 28);
  ctx.fillStyle = "#A0D8EF";
  ctx.fillRect(x + 2, y + 2, 40, 14);
  ctx.fillStyle = "#5A9A3A";
  ctx.fillRect(x + 2, y + 18, 40, 12);
  ctx.fillStyle = "#4A8030";
  ctx.fillRect(x + 2, y + 22, 40, 8);
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath(); ctx.ellipse(x + 15, y + 8, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + 30, y + 11, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillRect(x, y, 44, 2);
  ctx.fillRect(x, y, 2, 32);
}

function drawCafeCounter(ctx, x, y, w) {
  ctx.fillStyle = "#6A3C18";
  ctx.fillRect(x, y, w, 22);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(x, y, w, 3);
  ctx.fillStyle = "#4A2808";
  ctx.fillRect(x, y + 22, w, 10);
  ctx.fillStyle = "#8B5A30";
  ctx.fillRect(x, y + 20, w, 3);
}

// ─── AGENT CONFIG ─────────────────────────────────────────────────────────────
const AGENT_META = [
  { id: "fin",  name: "Luna",  role: "Finanzas",   emoji: "💰", color: "#EF4444", accent: "#FCA5A5", model: "claude-sonnet-4-6" },
  { id: "alm",  name: "Marco", role: "Alumnos",    emoji: "🎓", color: "#818CF8", accent: "#C4B5FD", model: "claude-sonnet-4-6" },
  { id: "cob",  name: "Sofia", role: "Cobros",     emoji: "📋", color: "#34D399", accent: "#6EE7B7", model: "claude-haiku-4-5" },
  { id: "asi",  name: "Diego", role: "Asistencia", emoji: "✅", color: "#F472B6", accent: "#F9A8D4", model: "claude-haiku-4-5" },
  { id: "gas",  name: "Ana",   role: "Gastos",     emoji: "📊", color: "#FBBF24", accent: "#FDE68A", model: "claude-sonnet-4-6" },
];

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function PixelOffice({
  ventasHoy = 0, alumnosActivos = 0, cuentasVencidas = 0,
  presentesHoy = 0, conPocasClases = 0, gastosMes = 0
}) {
  const canvasRef = useRef(null);
  const tickRef = useRef(0);
  const spritesRef = useRef([]);
  const rafRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const [time, setTime] = useState(new Date());

  const CW = 960, CH = 420;

  const ROOMS = [
    { id: "salon_a",      x: 0,   y: 0,   w: 230, h: 200, floor: "wood",  wall: "#1E2840", accent: "#3A5A90", label: "Salon A 💃" },
    { id: "salon_b",      x: 232, y: 0,   w: 220, h: 200, floor: "wood",  wall: "#28182E", accent: "#6040A0", label: "Salon B 🎭" },
    { id: "salon_c",      x: 454, y: 0,   w: 220, h: 200, floor: "wood",  wall: "#102830", accent: "#208090", label: "Salon C 🎶" },
    { id: "cafetín",      x: 676, y: 0,   w: 284, h: 200, floor: "tile",  wall: "#2E1A08", accent: "#A07020", label: "Cafetín ☕" },
    { id: "oficina_admin",x: 0,   y: 202, w: 320, h: 218, floor: "wood",  wall: "#102018", accent: "#208040", label: "Admin 🖥️" },
    { id: "oficina_conta",x: 322, y: 202, w: 318, h: 218, floor: "dark",  wall: "#18082E", accent: "#8020A0", label: "Contabilidad 📊" },
    { id: "hall",         x: 642, y: 202, w: 318, h: 218, floor: "tile",  wall: "#181828", accent: "#303858", label: "" },
  ];

  const CHAR_CONFIGS = [
    { id: "fin",  name: "Luna",  role: "Finanzas",   roomId: "oficina_conta",
      skin: "#F5C5A3", hair: "#1A0808", shirt: "#C83030", pants: "#2A3A5A",
      alertMsg: ventasHoy === 0 ? "Sin ventas hoy" : undefined,
      statValue: ventasHoy > 0 ? `Bs ${(ventasHoy / 1000).toFixed(0)}k` : "-",
      initState: ventasHoy > 0 ? "sit" : "idle" },
    { id: "alm",  name: "Marco", role: "Alumnos",    roomId: "oficina_admin",
      skin: "#C8906A", hair: "#1A0E02", shirt: "#3050C8", pants: "#2A3018",
      alertMsg: conPocasClases > 0 ? `${conPocasClases} con pocas clases` : undefined,
      statValue: String(alumnosActivos),
      initState: conPocasClases > 0 ? "alert" : alumnosActivos > 0 ? "sit" : "idle" },
    { id: "cob",  name: "Sofia", role: "Cobros",     roomId: "oficina_conta",
      skin: "#F0DCC0", hair: "#D8D0C8", shirt: "#30A040", pants: "#1A2040",
      alertMsg: cuentasVencidas > 0 ? `${cuentasVencidas} vencidas` : undefined,
      statValue: cuentasVencidas > 0 ? `${cuentasVencidas}!` : "OK",
      initState: cuentasVencidas > 0 ? "alert" : "idle" },
    { id: "asi",  name: "Diego", role: "Asistencia", roomId: "salon_a",
      skin: "#1A0A05", hair: "#0A0505", shirt: "#C03030", pants: "#1A2030",
      alertMsg: undefined, statValue: String(presentesHoy),
      initState: presentesHoy > 0 ? "walk" : "idle" },
    { id: "gas",  name: "Ana",   role: "Gastos",     roomId: "cafetín",
      skin: "#F5C5A3", hair: "#3D1C02", shirt: "#C8A030", pants: "#3A2018",
      alertMsg: undefined,
      statValue: gastosMes > 0 ? `${(gastosMes / 1000).toFixed(0)}k` : "-",
      initState: "idle" },
  ];

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    spritesRef.current = CHAR_CONFIGS.map((cfg, i) => {
      const room = ROOMS.find(r => r.id === cfg.roomId);
      const px = room.x + 40 + (i % 3) * 55;
      const py = room.y + 80 + Math.floor(i / 3) * 50;
      return { ...cfg, pos: { x: px, y: py }, target: { x: px, y: py },
        frame: i * 2.8, state: cfg.initState || "idle",
        sitTimer: 200 + i * 70, waitTimer: 0 };
    });
  // eslint-disable-next-line
  }, [ventasHoy, alumnosActivos, cuentasVencidas, presentesHoy, conPocasClases, gastosMes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    const loop = () => {
      tickRef.current++;
      const tick = tickRef.current;
      ctx.fillStyle = "#080C14";
      ctx.fillRect(0, 0, CW, CH);

      ROOMS.forEach(r => {
        if (r.floor === "wood") drawWoodFloor(ctx, r.x, r.y + 42, r.w, r.h - 42);
        else if (r.floor === "dark") drawTileFloor(ctx, r.x, r.y + 42, r.w, r.h - 42, true);
        else drawTileFloor(ctx, r.x, r.y + 42, r.w, r.h - 42, false);
      });

      ctx.fillStyle = "rgba(0,0,0,0.6)";
      [[230, 0, 2, 200], [452, 0, 2, 200], [674, 0, 2, 200],
       [0, 200, 960, 2], [320, 202, 2, 218], [640, 202, 2, 218]].forEach(([x, y, w, h]) => {
        ctx.fillRect(x, y, w, h);
      });

      ROOMS.forEach(r => {
        if (r.label) {
          drawWallSegment(ctx, r.x, r.y, r.w, r.wall, r.accent);
          ctx.fillStyle = r.accent;
          ctx.font = "bold 11px monospace";
          ctx.textAlign = "left";
          ctx.fillText(r.label, r.x + 8, r.y + 26);
        }
      });

      drawMirrorWall(ctx, 2, 42, 226);
      drawSpeaker(ctx, 208, 52);
      drawPlant(ctx, 5, 100, true);
      drawPlant(ctx, 200, 138);
      drawMirrorWall(ctx, 234, 42, 216);
      drawSpeaker(ctx, 234, 52);
      drawSpeaker(ctx, 428, 52);
      drawPlant(ctx, 340, 130);
      drawMirrorWall(ctx, 456, 42, 216);
      drawSpeaker(ctx, 456, 52);
      drawPlant(ctx, 458, 120, true);
      drawPlant(ctx, 648, 148);
      drawClock(ctx, 800, 58, tick);
      drawCoffeeMachine(ctx, 678, 45);
      drawFridge(ctx, 920, 48);
      drawCafeCounter(ctx, 678, 100, 250);
      drawCafeTable(ctx, 740, 152);
      drawCafeTable(ctx, 810, 168);
      drawCafeTable(ctx, 890, 155);
      drawPlant(ctx, 924, 105, true);
      drawShelf(ctx, 2, 244, 70);
      drawShelf(ctx, 78, 244, 70);
      drawChair(ctx, 30, 308);
      drawDesk(ctx, 24, 294, 64);
      drawMonitor(ctx, 34, 268);
      drawChair(ctx, 170, 308);
      drawDesk(ctx, 164, 294, 64);
      drawMonitor(ctx, 174, 268);
      drawBoxes(ctx, 5, 330);
      drawPlant(ctx, 290, 290, true);
      drawPlant(ctx, 4, 380);
      drawPlant(ctx, 290, 380);
      drawShelf(ctx, 324, 244, 68, true);
      drawShelf(ctx, 398, 244, 68, true);
      drawChair(ctx, 340, 310);
      drawDesk(ctx, 334, 296, 68, "#9A6040");
      drawMonitor(ctx, 344, 270);
      drawChair(ctx, 490, 336);
      drawDesk(ctx, 484, 322, 68, "#7A4A30");
      drawMonitor(ctx, 494, 296);
      drawPainting(ctx, 548, 248);
      drawPlant(ctx, 614, 290, true);
      drawPlant(ctx, 614, 375);

      // Status panel — Pixelagent terminal style
      ctx.fillStyle = "#050810";
      ctx.fillRect(654, 214, 300, 200);
      ctx.strokeStyle = "#00FF8820";
      ctx.lineWidth = 1;
      ctx.strokeRect(655, 215, 298, 198);
      // Header bar
      ctx.fillStyle = "#0A1A0A";
      ctx.fillRect(655, 215, 298, 18);
      ctx.fillStyle = "#00FF88";
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "left";
      ctx.fillText("● ATEMPO AGENTS", 664, 227);
      ctx.fillStyle = "#1A3A1A";
      ctx.font = "9px monospace";
      ctx.textAlign = "right";
      ctx.fillText("v2.0", 946, 227);

      spritesRef.current.forEach((sp, i) => {
        const iy = 242 + i * 38;
        const meta = AGENT_META.find(a => a.id === sp.id);
        const isAlert = sp.state === "alert";
        const pulse = Math.sin(tick * 0.12 + i) > 0;

        // Row bg
        ctx.fillStyle = selected === sp.id ? "rgba(0,255,136,0.06)" : "rgba(255,255,255,0.015)";
        ctx.fillRect(658, iy - 10, 290, 34);

        // Status dot
        ctx.fillStyle = isAlert ? (pulse ? "#EF4444" : "#7F1D1D") : "#00FF88";
        ctx.beginPath();
        ctx.ellipse(668, iy + 6, 4, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Agent name
        ctx.fillStyle = meta?.color || "#CBD5E1";
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "left";
        ctx.fillText(sp.name, 678, iy + 4);

        // Role tag
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        ctx.fillRect(678, iy + 8, 52, 12);
        ctx.fillStyle = "#64748B";
        ctx.font = "8px monospace";
        ctx.fillText(`/${sp.role.toLowerCase()}`, 680, iy + 17);

        // Model badge
        const modelStr = meta?.model === "claude-sonnet-4-6" ? "sonnet-4-6" : "haiku-4-5";
        ctx.fillStyle = "rgba(100,116,139,0.15)";
        ctx.fillRect(735, iy + 8, 60, 12);
        ctx.fillStyle = "#475569";
        ctx.font = "7px monospace";
        ctx.textAlign = "left";
        ctx.fillText(modelStr, 737, iy + 17);

        // Value
        if (sp.statValue) {
          ctx.fillStyle = isAlert ? "#F87171" : meta?.color || sp.shirt;
          ctx.font = "bold 9px monospace";
          ctx.textAlign = "right";
          ctx.fillText(sp.statValue, 942, iy + 4);
        }

        // Separator
        ctx.fillStyle = "rgba(255,255,255,0.04)";
        ctx.fillRect(658, iy + 22, 290, 1);
      });

      // Waiting chairs
      [660, 698, 736].forEach(cx => drawChair(ctx, cx, 330));
      drawPlant(ctx, 920, 260);

      spritesRef.current = spritesRef.current.map(sp => {
        if (sp.waitTimer > 0) return { ...sp, state: "sit", waitTimer: sp.waitTimer - 1 };
        const dx = sp.target.x - sp.pos.x;
        const dy = sp.target.y - sp.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 3) {
          const speed = sp.alertMsg ? 1.8 : 1.0;
          return { ...sp,
            pos: { x: sp.pos.x + (dx / dist) * speed, y: sp.pos.y + (dy / dist) * speed },
            state: sp.alertMsg ? "alert" : "walk" };
        }
        let { sitTimer } = sp;
        sitTimer--;
        if (sitTimer <= 0) {
          const base = ROOMS.find(r => r.id === sp.roomId);
          const dest = Math.random() < 0.1 ? ROOMS.find(r => r.id === "cafetín") : base;
          const m = 30;
          const tx = dest.x + m + Math.random() * (dest.w - m * 2);
          const ty = dest.y + 70 + Math.random() * (dest.h - 110);
          const isOffice = dest.id.startsWith("oficina");
          return { ...sp, target: { x: tx, y: ty }, state: "walk",
            sitTimer: 180 + Math.random() * 200,
            waitTimer: isOffice ? 80 + Math.random() * 120 : 0 };
        }
        return { ...sp, state: sp.alertMsg ? "alert" : "sit", sitTimer };
      });

      const sorted = [...spritesRef.current].sort((a, b) => a.pos.y - b.pos.y);
      sorted.filter(sp => sp.id !== selected).forEach(sp =>
        drawCharacterDirect(ctx, sp.pos.x, sp.pos.y, { ...sp, selected: false }, tick, sp.frame));
      const sel = sorted.find(sp => sp.id === selected);
      if (sel) drawCharacterDirect(ctx, sel.pos.x, sel.pos.y, { ...sel, selected: true }, tick, sel.frame);

      // CRT overlay
      ctx.fillStyle = "rgba(0,0,0,0.03)";
      for (let sl = 0; sl < CH; sl += 4) ctx.fillRect(0, sl, CW, 2);
      const vg = ctx.createRadialGradient(CW / 2, CH / 2, CH * 0.3, CW / 2, CH / 2, CH * 0.8);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(0,0,0,0.25)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, CW, CH);

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [selected]);

  const handleClick = useCallback(e => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (CW / rect.width);
    const my = (e.clientY - rect.top) * (CH / rect.height);
    const hit = spritesRef.current.find(sp =>
      Math.abs(sp.pos.x + 8 - mx) < 20 && Math.abs(sp.pos.y + 8 - my) < 24
    );
    setSelected(hit ? p => p === hit.id ? null : hit.id : null);
  }, []);

  const agents = CHAR_CONFIGS.map(cfg => {
    const meta = AGENT_META.find(a => a.id === cfg.id);
    return {
      ...meta,
      alert: cfg.alertMsg,
      val: cfg.statValue,
    };
  });

  const alerts = agents.filter(a => a.alert);
  const selAgent = agents.find(a => a.id === selected);
  const selCfg = CHAR_CONFIGS.find(c => c.id === selected);

  return (
    <div style={{
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
      background: "#050810",
      borderRadius: "12px",
      color: "#CBD5E1",
      border: "1px solid #0F2040",
      overflow: "hidden",
    }}>

      {/* ── Top bar ── */}
      <div style={{
        background: "#080D1A",
        borderBottom: "1px solid #0F2040",
        padding: "10px 16px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "12px",
        flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Traffic lights */}
          <div style={{ display: "flex", gap: "6px" }}>
            {["#EF4444", "#FBBF24", "#22C55E"].map((c, i) => (
              <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: c, opacity: 0.8 }} />
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "11px", color: "#00FF88", fontWeight: "bold", letterSpacing: "0.1em" }}>
              ATEMPO
            </span>
            <span style={{ fontSize: "9px", color: "#334155", background: "#0F1A2E", padding: "2px 8px", borderRadius: "4px", border: "1px solid #1E3050" }}>
              agent-runtime v2.0
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {alerts.map(a => (
            <span key={a.id} style={{
              fontSize: "9px", padding: "3px 10px", borderRadius: "4px",
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.25)",
              color: "#F87171",
              fontWeight: "bold",
              letterSpacing: "0.05em",
            }}>
              ⚠ {a.name}: {a.alert}
            </span>
          ))}
          <span style={{ fontSize: "9px", color: "#334155" }}>
            {time.toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
        </div>
      </div>

      {/* ── Canvas ── */}
      <div style={{ position: "relative", background: "#080C14" }}>
        <canvas
          ref={canvasRef}
          width={CW}
          height={CH}
          onClick={handleClick}
          style={{ width: "100%", display: "block", cursor: "pointer", imageRendering: "pixelated" }}
        />
      </div>

      {/* ── Agent cards — Pixelagent style ── */}
      <div style={{
        background: "#060A14",
        borderTop: "1px solid #0F2040",
        padding: "12px 16px",
      }}>
        {/* Section header */}
        <div style={{
          fontSize: "9px", color: "#334155", letterSpacing: "0.12em",
          textTransform: "uppercase", marginBottom: "10px",
          display: "flex", alignItems: "center", gap: "8px",
        }}>
          <span style={{ color: "#00FF88" }}>●</span>
          <span>Agents</span>
          <span style={{ flex: 1, height: "1px", background: "#0F2040" }} />
          <span>{agents.length} running</span>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {agents.map(a => {
            const isSelected = selected === a.id;
            const hasAlert = !!a.alert;
            return (
              <button
                key={a.id}
                onClick={() => setSelected(p => p === a.id ? null : a.id)}
                style={{
                  flex: "1",
                  minWidth: "160px",
                  background: isSelected ? `${a.color}0A` : "#080D1A",
                  border: `1px solid ${isSelected ? a.color + "50" : "#0F2040"}`,
                  borderRadius: "8px",
                  padding: "10px 12px",
                  cursor: "pointer",
                  textAlign: "left",
                  color: "#CBD5E1",
                  transition: "all 0.15s",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Accent line top */}
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: "2px",
                  background: isSelected ? a.color : "transparent",
                  transition: "background 0.15s",
                }} />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{
                      width: "6px", height: "6px", borderRadius: "50%", flexShrink: 0,
                      background: hasAlert ? "#EF4444" : "#22C55E",
                      boxShadow: `0 0 8px ${hasAlert ? "#EF4444" : "#22C55E"}88`,
                    }} />
                    <span style={{ fontSize: "11px", fontWeight: "bold", color: isSelected ? a.color : "#94A3B8" }}>
                      {a.name}
                    </span>
                  </div>
                  <span style={{
                    fontSize: "8px", padding: "1px 6px", borderRadius: "3px",
                    background: "#0F1A2E",
                    color: "#475569",
                    border: "1px solid #1E2A40",
                  }}>
                    {a.model === "claude-sonnet-4-6" ? "sonnet-4-6" : "haiku-4-5"}
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{
                    fontSize: "9px",
                    background: "#0F1A2E",
                    border: "1px solid #1E2A40",
                    color: "#64748B",
                    padding: "2px 6px",
                    borderRadius: "3px",
                  }}>
                    /{a.role.toLowerCase()}
                  </span>
                  <span style={{
                    fontSize: "11px",
                    fontWeight: "bold",
                    color: hasAlert ? "#F87171" : a.color,
                  }}>
                    {hasAlert ? `⚠ ${a.alert}` : a.val}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Detail panel ── */}
      {selAgent && selCfg && (
        <div style={{
          background: "#060A14",
          borderTop: "1px solid #0F2040",
          padding: "12px 16px",
        }}>
          {/* Panel header */}
          <div style={{ fontSize: "9px", color: "#334155", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: selAgent.color }}>●</span>
            <span>agent.inspect({selAgent.name.toLowerCase()})</span>
            <span style={{ flex: 1, height: "1px", background: "#0F2040" }} />
          </div>

          <div style={{
            background: "#080D1A",
            border: `1px solid ${selAgent.color}25`,
            borderRadius: "8px",
            padding: "12px",
            fontFamily: "monospace",
          }}>
            {/* Code-like header */}
            <div style={{ marginBottom: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ color: "#475569", fontSize: "10px" }}>const</span>
              <span style={{ color: selAgent.color, fontSize: "10px", fontWeight: "bold" }}>{selAgent.name.toLowerCase()}</span>
              <span style={{ color: "#475569", fontSize: "10px" }}>=</span>
              <span style={{ color: "#94A3B8", fontSize: "10px" }}>new Agent({"{"}</span>
            </div>

            <div style={{ paddingLeft: "16px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "6px", marginBottom: "10px" }}>
              {[
                { key: "name", val: `"${selAgent.name}"`, color: "#FBBF24" },
                { key: "role", val: `"${selAgent.role}"`, color: "#FBBF24" },
                { key: "model", val: `"${selAgent.model}"`, color: "#86EFAC" },
                { key: "status", val: selCfg.alertMsg ? `"alert"` : `"running"`, color: selCfg.alertMsg ? "#F87171" : "#86EFAC" },
                selAgent.id === "fin" && { key: "ventasHoy", val: `Bs ${ventasHoy.toLocaleString("es-VE")}`, color: selAgent.color },
                selAgent.id === "alm" && { key: "alumnosActivos", val: String(alumnosActivos), color: selAgent.color },
                selAgent.id === "alm" && conPocasClases > 0 && { key: "⚠ pocasClases", val: String(conPocasClases), color: "#F87171" },
                selAgent.id === "cob" && { key: "cuentasVencidas", val: cuentasVencidas > 0 ? String(cuentasVencidas) : "0 ✓", color: cuentasVencidas > 0 ? "#F87171" : "#86EFAC" },
                selAgent.id === "asi" && { key: "presentesHoy", val: String(presentesHoy), color: selAgent.color },
                selAgent.id === "gas" && { key: "gastosMes", val: `Bs ${gastosMes.toLocaleString("es-VE")}`, color: "#F87171" },
              ].filter(Boolean).map((item, i) => (
                <div key={i} style={{ fontSize: "9px", display: "flex", gap: "6px" }}>
                  <span style={{ color: "#6272A4" }}>{item.key}:</span>
                  <span style={{ color: item.color, fontWeight: "bold" }}>{item.val}</span>
                </div>
              ))}
            </div>

            <div style={{ color: "#94A3B8", fontSize: "10px" }}>{"});"}</div>
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <div style={{
        background: "#060A14",
        borderTop: "1px solid #0A1828",
        padding: "6px 16px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <span style={{ fontSize: "8px", color: "#1E3050", letterSpacing: "0.08em" }}>
          ATEMPO AGENT RUNTIME · POWERED BY PIXELAGENT
        </span>
        <div style={{ display: "flex", gap: "12px" }}>
          {[
            { label: "AGENTS", val: `${agents.length}/5` },
            { label: "ALERTS", val: String(alerts.length), alert: alerts.length > 0 },
            { label: "UPTIME", val: "100%" },
          ].map(item => (
            <div key={item.label} style={{ fontSize: "8px", display: "flex", gap: "4px", alignItems: "center" }}>
              <span style={{ color: "#1E3050" }}>{item.label}</span>
              <span style={{ color: item.alert ? "#EF4444" : "#334155", fontWeight: "bold" }}>{item.val}</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
      `}</style>
    </div>
  );
}

function Stat({ label, val, color }) {
  return (
    <div style={{ padding: "8px 10px", borderRadius: "6px", background: "#080D1A", border: "1px solid #0F2040" }}>
      <div style={{ fontSize: "8px", color: "#334155", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "3px" }}>{label}</div>
      <div style={{ fontSize: "12px", fontWeight: "bold", color, fontFamily: "monospace" }}>{val}</div>
    </div>
  );
}
