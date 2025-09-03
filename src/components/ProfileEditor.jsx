import { useEffect, useState } from "react";
import apiClient from "../api/axios"; // ✅ axios → apiClient

export default function ProfileEditor({ onSaved }) {
  const [form, setForm] = useState({
    goals: '',
    diet: '',
    exercise: '',
    target_min: 80,
    target_max: 140
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await apiClient.get("/profile"); // ✅ 수정
      if (data) setForm(data);
    })();
  }, []);

  function set(k, v) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  async function save() {
    await apiClient.put("/profile", { // ✅ 수정
      goals: form.goals,
      diet: form.diet,
      exercise: form.exercise,
      target_min: Number(form.target_min),
      target_max: Number(form.target_max)
    });
    setSaved(true);
    onSaved?.(); // ⬅️ 저장 후 콜백 호출
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow">
      <h3 className="text-lg font-semibold mb-3">My Goals & Lifestyle</h3>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1">Goals (자유 서술)</label>
          <textarea className="w-full border rounded px-3 py-2" rows={3}
            value={form.goals} onChange={e => set('goals', e.target.value)} />
        </div>
        <div>
          <label className="block text-sm mb-1">Diet (식습관)</label>
          <textarea className="w-full border rounded px-3 py-2" rows={3}
            value={form.diet} onChange={e => set('diet', e.target.value)} />
        </div>
        <div>
          <label className="block text-sm mb-1">Exercise (운동 습관)</label>
          <textarea className="w-full border rounded px-3 py-2" rows={3}
            value={form.exercise} onChange={e => set('exercise', e.target.value)} />
        </div>
        <div>
          <label className="block text-sm mb-1">Target range (mg/dL)</label>
          <div className="flex gap-2">
            <input type="number" className="border rounded px-3 py-2 w-28"
              value={form.target_min} onChange={e => set('target_min', e.target.value)} />
            <span className="self-center">~</span>
            <input type="number" className="border rounded px-3 py-2 w-28"
              value={form.target_max} onChange={e => set('target_max', e.target.value)} />
          </div>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button onClick={save} className="px-4 py-2 rounded bg-blue-600 text-white">Save</button>
        {saved && <span className="text-green-600 text-sm self-center">Saved ✅</span>}
      </div>
    </div>
  );
}
