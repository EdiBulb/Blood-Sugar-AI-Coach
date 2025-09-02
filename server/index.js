// server/index.js
import express from "express";
import cors from "cors";
import Database from "better-sqlite3";
import OpenAI from "openai";
import fs from "node:fs";
import path from "node:path";

const app = express();

// ===== CORS (프로덕션 도메인만 허용) =====
const allowList = [
  process.env.FRONTEND_ORIGIN,          // 예: https://bsc.vercel.app (배포 후 설정)
  "http://localhost:5173"               // 로컬 개발
];
const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true); // curl/모바일앱 등 Origin 없는 요청 허용
    const ok =
      allowList.includes(origin) ||
      /^https:\/\/.*\.vercel\.app$/.test(origin); // Vercel 프리뷰도 허용
    cb(ok ? null : new Error("CORS blocked"), ok);
  }
};
app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));

// ===== SQLite 경로 (Render 디스크 권장) =====
const dbFile = process.env.DB_FILE_PATH || path.join(process.cwd(), "server", "data.db");
fs.mkdirSync(path.dirname(dbFile), { recursive: true });
const db = new Database(dbFile);

// ---- 테이블 보장 ----
db.exec(`
CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  timeSlot TEXT NOT NULL,
  value INTEGER NOT NULL,
  note TEXT,
  mealState TEXT
);
`);
db.exec(`
CREATE TABLE IF NOT EXISTS profile (
  id INTEGER PRIMARY KEY CHECK (id=1),
  goals TEXT,
  diet TEXT,
  exercise TEXT,
  target_min INTEGER,
  target_max INTEGER
);
`);
db.prepare(`
INSERT OR IGNORE INTO profile (id, goals, diet, exercise, target_min, target_max)
VALUES (1, '', '', '', 80, 140);
`).run();

// ===== Health Check =====
app.get("/health", (_req, res) => {
  try {
    db.prepare("SELECT 1").get();
    res.status(200).json({
      status: "ok",
      uptime: process.uptime(),
      dbPath: dbFile
    });
  } catch (e) {
    res.status(500).json({ status: "db_error", message: String(e) });
  }
});

// ===== 기존 API들 (그대로 유지) =====
app.post("/api/logs", (req, res) => {
  const { date, timeSlot, value, note = "", mealState = "Fasting" } = req.body || {};
  if (!date || !timeSlot || typeof value !== "number") {
    return res.status(400).json({ error: "Invalid payload" });
  }
  db.prepare("INSERT INTO logs (date,timeSlot,value,note,mealState) VALUES (?,?,?,?,?)")
    .run(date, timeSlot, value, note, mealState);
  res.json({ ok: true });
});

app.get("/api/logs", (req, res) => {
  const { range = "week" } = req.query;
  const today = new Date();
  const past = new Date(today);
  past.setDate(today.getDate() - (range === "week" ? 7 : 30));
  const from = past.toLocaleDateString("en-CA");
  const to = today.toLocaleDateString("en-CA");

  const items = db.prepare(`
    SELECT id, date, timeSlot, value, note, mealState
    FROM logs
    WHERE date BETWEEN ? AND ?
    ORDER BY date DESC, id DESC
  `).all(from, to);

  res.json({ items });
});

app.delete("/api/logs", (req, res) => {
  const { ids } = req.body || {};
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "ids array required" });
  }
  const stmt = db.prepare(`DELETE FROM logs WHERE id IN (${ids.map(() => "?").join(",")})`);
  const info = stmt.run(ids);
  res.json({ ok: true, deleted: info.changes });
});

app.get("/api/profile", (_req, res) => {
  const row = db.prepare("SELECT * FROM profile WHERE id=1").get();
  res.json(row);
});

app.put("/api/profile", (req, res) => {
  const { goals = "", diet = "", exercise = "", target_min = 80, target_max = 140 } = req.body || {};
  db.prepare(`
    UPDATE profile SET goals=?, diet=?, exercise=?, target_min=?, target_max=? WHERE id=1
  `).run(goals, diet, exercise, target_min, target_max);
  res.json({ ok: true });
});

app.get("/api/summary/weekly/raw", (_req, res) => {
  const today = new Date();
  const past = new Date(today);
  past.setDate(today.getDate() - 7);
  const from = past.toLocaleDateString("en-CA"),
    to = today.toLocaleDateString("en-CA");

  const items = db.prepare(`
    SELECT date,timeSlot,value,note,mealState
    FROM logs
    WHERE date BETWEEN ? AND ?
    ORDER BY date ASC
  `).all(from, to);

  const avg = items.length ? Math.round(items.reduce((s, r) => s + r.value, 0) / items.length) : 0;

  let spike = { delta: 0, from: null, to: null };
  for (let i = 1; i < items.length; i++) {
    const d = items[i].value - items[i - 1].value;
    if (d > spike.delta) spike = { delta: d, from: items[i - 1], to: items[i] };
  }
  res.json({ avg, items, spike });
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.get("/api/summary/weekly", async (_req, res) => {
  const profile = db.prepare("SELECT * FROM profile WHERE id=1").get() || {};
  const today = new Date();
  const past = new Date(today);
  past.setDate(today.getDate() - 7);
  const from = past.toLocaleDateString("en-CA"),
    to = today.toLocaleDateString("en-CA");
  const items = db.prepare(`
    SELECT date,timeSlot,value,note FROM logs WHERE date BETWEEN ? AND ? ORDER BY date ASC
  `).all(from, to);

  const avg = items.length ? Math.round(items.reduce((s, r) => s + r.value, 0) / items.length) : 0;
  let spike = { delta: 0, from: null, to: null };
  for (let i = 1; i < items.length; i++) {
    const d = items[i].value - items[i - 1].value;
    if (d > spike.delta) spike = { delta: d, from: items[i - 1], to: items[i] };
  }

  const prompt = `
You are a supportive diabetes coach. Create a brief weekly report in Korean (3–5 sentences).
Data (last 7 days):
Average mg/dL: ${avg}
Largest spike: ${spike.delta} (from ${spike.from?.value ?? "-"} to ${spike.to?.value ?? "-"}), around ${spike.to?.date ?? "-"} ${spike.to?.timeSlot ?? "-"}.
Logs (JSON): ${JSON.stringify(items)}
User profile:
- Goals: ${profile.goals}
- Diet: ${profile.diet}
- Exercise: ${profile.exercise}
- Target range: ${profile.target_min}-${profile.target_max} mg/dL

Instructions:
- Hypothesize likely causes using notes (meal/exercise/fasting).
- Give 1–2 concrete tips tailored to the user's profile and target range.
- Avoid medical diagnosis; give general, safe lifestyle coaching.
- Keep it concise.
  `;

  try {
    const out = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6
    });
    const message = out.choices?.[0]?.message?.content?.trim() || "이번 주 보고를 생성하지 못했습니다.";
    res.json({ avg, spike, message });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "AI summary error" });
  }
});

app.post("/api/coach", async (req, res) => {
  const { value, timeSlot } = req.body || {};
  const profile = db.prepare("SELECT * FROM profile WHERE id=1").get() || {};
  const recent = db.prepare("SELECT date,timeSlot,value,note,mealState FROM logs ORDER BY id DESC LIMIT 3").all();

  const prompt = `
Act as a concise diabetes lifestyle coach in Korean (1–2 sentences).
Current reading: ${value} mg/dL at ${timeSlot} (${req.body.mealState || "Fasting"}).
User profile: goals=${profile.goals}; diet=${profile.diet}; exercise=${profile.exercise}; target=${profile.target_min}-${profile.target_max}.
Recent logs: ${JSON.stringify(recent)}
Give one encouraging, practical tip aligned with target range and profile. No diagnosis.
  `;
  try {
    const out = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7
    });
    const message = out.choices?.[0]?.message?.content?.trim() || "좋은 습관을 꾸준히 이어가요!";
    res.json({ message });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "AI coach error" });
  }
});

const PORT = process.env.PORT || 3001;
// Render에서 외부접속이 필요하므로 0.0.0.0 바인드 권장(선택)
app.listen(PORT, "0.0.0.0", () =>
  console.log("Server running on http://localhost:" + PORT)
);
