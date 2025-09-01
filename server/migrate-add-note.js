import Database from "better-sqlite3";
const db = new Database("./data.db");
try { db.exec("ALTER TABLE logs ADD COLUMN note TEXT;"); console.log("note column added"); }
catch(e){ console.log("maybe already exists:", e.message); }
