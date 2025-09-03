import { useMemo, useState } from "react";
import apiClient from "../api/axios"; // ✅ 수정
import { mgdlToMmol, statusClassByMmolFromMg } from "../utils";

export default function LogsTable({ logs = [], onChanged }) {
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());

  const rows = useMemo(() =>
    logs.map(r => ({
      ...r,
      mmol: mgdlToMmol(r.value)
    })), [logs]
  );

  function toggleSelected(id) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function onDeleteButton() {
    if (!selectMode) {
      setSelectMode(true);
      setSelected(new Set());
      return;
    }

    if (selected.size > 0) {
      const ids = Array.from(selected);
      await apiClient.delete("/logs", { data: { ids } }); // ✅ 수정
      setSelected(new Set());
      setSelectMode(false);
      onChanged?.(); // 새로고침 콜백
    } else {
      setSelectMode(false);
    }
  }

  const deleteLabel = !selectMode ? "삭제" : (selected.size > 0 ? "선택 삭제" : "완료");

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow overflow-auto">
      <div className="flex items-center mb-3">
        <h3 className="text-lg font-semibold">Recent Logs</h3>
        <button
          onClick={onDeleteButton}
          className="ml-auto px-3 py-1 rounded bg-red-600 text-white"
        >
          {deleteLabel}
        </button>
      </div>

      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            {selectMode && <th className="py-2 pr-2 w-8"></th>}
            <th className="py-2 pr-4">Date</th>
            <th className="py-2 pr-4">Time</th>
            <th className="py-2 pr-4">Meal</th>
            <th className="py-2 pr-4">Value (mmol/L)</th>
            <th className="py-2 pr-4">Memo</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b last:border-none align-top">
              {selectMode && (
                <td className="py-2 pr-2">
                  <input
                    type="checkbox"
                    checked={selected.has(row.id)}
                    onChange={() => toggleSelected(row.id)}
                  />
                </td>
              )}
              <td className="py-2 pr-4">{row.date}</td>
              <td className="py-2 pr-4">{row.timeSlot}</td>
              <td className="py-2 pr-4">{row.mealState || "-"}</td>
              <td className={`py-2 pr-4 font-semibold ${statusClassByMmolFromMg(row.value, row.mealState || 'Fasting')}`}>
                {row.mmol.toFixed(1)}
              </td>
              <td className="py-2 pr-4 whitespace-pre-wrap">{row.note || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
