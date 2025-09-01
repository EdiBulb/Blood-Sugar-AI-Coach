import Database from "better-sqlite3";
const db = new Database("./data.db");
try {
  db.exec("ALTER TABLE logs ADD COLUMN mealState TEXT DEFAULT 'Fasting';");
  console.log("mealState column added");
} catch (e) {
  console.log("maybe already exists:", e.message);
}
