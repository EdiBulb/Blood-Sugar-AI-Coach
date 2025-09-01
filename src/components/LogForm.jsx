import { useState } from "react";
import axios from "axios";
import { TIME_SLOTS, MEAL_STATES, todayLocalISO, mmolToMgdl, shiftISO } from "../utils";

export default function LogForm({ onSaved, setCoachMessage }){
  const [valueMmol, setValueMmol] = useState("");       // mmol/L로 입력
  const [dateISO, setDateISO] = useState(todayLocalISO()); //  날짜 상태 추가
  const [timeSlot, setTimeSlot] = useState(TIME_SLOTS[0]);
  const [mealState, setMealState] = useState(MEAL_STATES[0]); // Fasting | Post-meal
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState("");
  const today = todayLocalISO();

  async function handleSubmit(e){
    e.preventDefault();
    const mmol = Number(valueMmol);
    if (!mmol || mmol < 2 || mmol > 40) return;
    const mgdl = mmolToMgdl(mmol);

    await axios.post("/api/logs", {
      date: dateISO,                  // ⬅️ 선택한 날짜로 저장
      timeSlot, value: mgdl, note: showNote ? note : "", mealState
    });

    const { data } = await axios.post("/api/coach", { value: mgdl, timeSlot, mealState });
    setCoachMessage?.(data.message);

    setValueMmol(""); setNote("");
    onSaved?.();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow">
      <h2 className="text-xl font-semibold mb-3">Log today’s blood sugar</h2>

      <div className="flex gap-3 items-end flex-wrap">
        {/* 날짜 + 위/아래 토글 */}
        <div>
          <label className="block text-sm">Date</label>
          <div className="flex items-center gap-1">
            <input
              type="date"
              className="border rounded px-3 py-2 w-44 bg-white dark:bg-gray-700 dark:text-gray-100"
              value={dateISO}
              onChange={(e)=>setDateISO(e.target.value)}
            />
            <div className="flex flex-col">
              <button
                type="button"
                title="다음 날"
                className="w-6 h-6 text-xs border rounded-t flex items-center justify-center bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600"
                onClick={()=>setDateISO(prev=>shiftISO(prev, +1))}
              >▲</button>
              <button
                type="button"
                title="이전 날"
                className="w-6 h-6 text-xs border rounded-t flex items-center justify-center bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600"
                onClick={()=>setDateISO(prev=>shiftISO(prev, -1))}
              >▼</button>
            </div>
          </div>
        </div>

        {/* 시간대 */}
        <div>
          <label className="block text-sm">Time</label>
          <select
            className="border rounded px-3 py-2 bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100"
            value={timeSlot}
            onChange={(e)=>setTimeSlot(e.target.value)}
          >
            {TIME_SLOTS.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>

        {/* 식전/식후 */}
        <div>
          <label className="block text-sm">Fasting / Post-meal</label>
          <select
            className="border rounded px-3 py-2 bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100"
            value={mealState}
            onChange={(e)=>setMealState(e.target.value)}
          >
            {MEAL_STATES.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>

        {/* 혈당 (mmol/L) */}
        <div>
          <label className="block text-sm">Blood sugar (mmol/L)</label>
          <input
            type="number" step="0.1" min={2} max={40}
            className="border rounded px-3 py-2 w-44"
            placeholder="예: 7.2"
            value={valueMmol}
            onChange={(e)=>setValueMmol(e.target.value)}
            required
          />
        </div>

        {/* 메모 토글 */}
        <button
          type="button"
          onClick={()=>setShowNote(v=>!v)}
          className="px-3 py-2 rounded border bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600"
        >
          {showNote ? "메모 닫기" : "Memo add"}
        </button>

        {/* 저장 */}
        <button className="ml-auto bg-blue-600 text-white px-4 py-2 rounded-lg hover:opacity-90">
          Save & Get Tip
        </button>
      </div>

      {showNote && (
        <div className="mt-3">
          <label className="block text-sm mb-1">메모 (먹은 것/운동/공복 여부 등)</label>
          <textarea
            className="w-full border rounded px-3 py-2"
            rows={3}
            placeholder="예: 아침 오트밀, 20분 산책, 공복 채혈"
            value={note}
            onChange={(e)=>setNote(e.target.value)}
          />
        </div>
      )}
    </form>
  );
}