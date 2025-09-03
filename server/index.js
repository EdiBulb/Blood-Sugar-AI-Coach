import express from "express";
import cors from "cors";
import Database from "better-sqlite3";
import OpenAI from "openai";

const app = express();

// ✅ Netlify 도메인 허용 (배포된 주소)
const allowedOrigins = [
  'https://rad-concha-673e68.netlify.app', // 실제 배포된 Netlify 프론트 URL
];

app.use(cors({
  origin: function (origin, callback) {
    // ❗ Postman이나 Render 자체 요청은 origin이 undefined임
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS blocked'));
    }
  },
  credentials: true
}));
app.use(express.json());



// ---- SQLite ----
const db = new Database("./data.db");

// logs 테이블 (note 컬럼 포함)
db.exec(`
CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,        -- YYYY-MM-DD
  timeSlot TEXT NOT NULL,    -- Morning|Noon|Evening
  value INTEGER NOT NULL,
  note TEXT,
  mealState TEXT            -- 'Fasting' | 'Post-meal'
);
`);

// profile 테이블 (개인 목표/습관)
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

// ---- Logs API ----
app.post("/api/logs", (req, res) => {
  const { date, timeSlot, value, note = '', mealState = 'Fasting' } = req.body || {};
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
  const to   = today.toLocaleDateString("en-CA");

  const items = db.prepare(`
  SELECT id, date, timeSlot, value, note, mealState
  FROM logs
  WHERE date BETWEEN ? AND ?
  ORDER BY date DESC, id DESC
`).all(from, to);


  res.json({ items });
});

//선택 삭제 API
app.delete("/api/logs", (req, res) => {
  const { ids } = req.body || {};
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "ids array required" });
  }
  const stmt = db.prepare(`DELETE FROM logs WHERE id IN (${ids.map(()=>"?").join(",")})`);
  const info = stmt.run(ids);
  res.json({ ok: true, deleted: info.changes });
});


// ---- Profile API ----
app.get("/api/profile", (req,res)=>{
  const row = db.prepare("SELECT * FROM profile WHERE id=1").get();
  res.json(row);
});

app.put("/api/profile", (req,res)=>{
  const { goals='', diet='', exercise='', target_min=80, target_max=140 } = req.body || {};
  db.prepare(`
    UPDATE profile SET goals=?, diet=?, exercise=?, target_min=?, target_max=? WHERE id=1
  `).run(goals, diet, exercise, target_min, target_max);
  res.json({ ok:true });
});

// ---- Weekly summary (raw + AI) ----
app.get("/api/summary/weekly/raw", (req,res)=>{
  const today=new Date(); const past=new Date(today); past.setDate(today.getDate()-7);
  const from=past.toLocaleDateString("en-CA"), to=today.toLocaleDateString("en-CA");
  const items = db.prepare(`
  SELECT date,timeSlot,value,note,mealState
  FROM logs
  WHERE date BETWEEN ? AND ?
  ORDER BY date ASC
`).all(from,to);


  const avg = items.length ? Math.round(items.reduce((s,r)=>s+r.value,0)/items.length) : 0;

  // 최대 스파이크(인접 증가폭)
  let spike = { delta:0, from:null, to:null };
  for (let i=1;i<items.length;i++){
    const d = items[i].value - items[i-1].value;
    if (d>spike.delta) spike = { delta:d, from:items[i-1], to:items[i] };
  }
  res.json({ avg, items, spike });
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.get("/api/summary/weekly", async (req,res)=>{
  const profile = db.prepare("SELECT * FROM profile WHERE id=1").get() || {};
  const today=new Date(); const past=new Date(today); past.setDate(today.getDate()-7);
  const from=past.toLocaleDateString("en-CA"), to=today.toLocaleDateString("en-CA");
  const items = db.prepare(`
    SELECT date,timeSlot,value,note FROM logs WHERE date BETWEEN ? AND ? ORDER BY date ASC
  `).all(from,to);

  const avg = items.length ? Math.round(items.reduce((s,r)=>s+r.value,0)/items.length) : 0;
  let spike = { delta:0, from:null, to:null };
  for (let i=1;i<items.length;i++){
    const d = items[i].value - items[i-1].value;
    if (d>spike.delta) spike = { delta:d, from:items[i-1], to:items[i] };
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
      messages: [{ role:"user", content: prompt }],
      temperature: 0.6,
    });
    const message = out.choices?.[0]?.message?.content?.trim() || "이번 주 보고를 생성하지 못했습니다.";
    res.json({ avg, spike, message });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error:"AI summary error" });
  }
});

// ---- Coach (personalized) ----
app.post("/api/coach", async (req,res)=>{
  const { value, timeSlot } = req.body || {};
  const profile = db.prepare("SELECT * FROM profile WHERE id=1").get() || {};
  const recent = db.prepare("SELECT date,timeSlot,value,note,mealState FROM logs ORDER BY id DESC LIMIT 3").all();

  const prompt = `
Act as a concise diabetes lifestyle coach in Korean (1–2 sentences).
Current reading: ${value} mg/dL at ${timeSlot} (${req.body.mealState || 'Fasting'}).
User profile: goals=${profile.goals}; diet=${profile.diet}; exercise=${profile.exercise}; target=${profile.target_min}-${profile.target_max}.
Recent logs: ${JSON.stringify(recent)}
Give one encouraging, practical tip aligned with target range and profile. No diagnosis.
  `;
  try {
    const out = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role:"user", content: prompt }],
      temperature: 0.7,
    });
    const message = out.choices?.[0]?.message?.content?.trim() || "좋은 습관을 꾸준히 이어가요!";
    res.json({ message });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error:"AI coach error" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log("Server running on http://localhost:" + PORT));
