import { useState } from "react";
import axios from "axios";

export default function WeeklySummary(){
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);

  async function generate(){
    setLoading(true);
    try{
      const { data } = await axios.get("/api/summary/weekly");
      setReport(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow">
      <div className="flex items-center gap-3">
        <h3 className="text-lg font-semibold">Weekly Summary</h3>
        <button
          onClick={generate}
          disabled={loading}
          className="px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate"}
        </button>
      </div>
      {report && (
        <div className="mt-3 space-y-2">
          <div className="text-sm opacity-70">7-day avg: <b>{report.avg} mg/dL</b></div>
          {report.spike?.delta>0 && (
            <div className="text-sm opacity-70">
              Largest spike: +{report.spike.delta} mg/dL (around {report.spike.to?.date} {report.spike.to?.timeSlot})
            </div>
          )}
          <div className="p-3 rounded border bg-green-50 dark:bg-green-900/30">
            {report.message}
          </div>
        </div>
      )}
    </div>
  );
}
