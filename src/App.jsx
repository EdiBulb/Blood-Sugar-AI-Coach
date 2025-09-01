import { useEffect, useState } from "react";
import axios from "axios";
import LogForm from "./components/LogForm";
import CoachCard from "./components/CoachCard";
import LogsTable from "./components/LogsTable";
import TrendChart from "./components/TrendChart";

// ⬇️ 새로 추가
import ProfileFab from "./components/ProfileFab";
import SidePanel from "./components/SidePanel";
import ProfileEditor from "./components/ProfileEditor";
import WeeklySummary from "./components/WeeklySummary";

import { mgdlToMmol } from "./utils";


export default function App(){
  const [logs, setLogs] = useState([]);
  const [range, setRange] = useState("week");
  const [chartFasting, setChartFasting] = useState([]);
  const [chartPost, setChartPost] = useState([]);
  const [coachMessage, setCoachMessage] = useState("");
  const [profileOpen, setProfileOpen] = useState(false); // 패널 상태

  const [showLogs, setShowLogs] = useState(true); // ⬅️ Recent Logs 토글


  async function fetchLogs(){
    const { data } = await axios.get(`/api/logs?range=${range}`);
    setLogs(data.items);

    const sorted = [...data.items].sort((a,b)=>a.date.localeCompare(b.date));
    const fasting = sorted.filter(r=> (r.mealState||'Fasting') === 'Fasting');
    const post    = sorted.filter(r=> r.mealState === 'Post-meal');

    setChartFasting(
      fasting.map(r => ({ label: r.date.slice(5), value: mgdlToMmol(r.value) })) // mmol로 변환
    );
    setChartPost(
      post.map(r => ({ label: r.date.slice(5), value: mgdlToMmol(r.value) }))    // mmol로 변환
    );
  }
  useEffect(()=>{ fetchLogs(); }, [range]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <header className="py-4 border-b bg-white/70 dark:bg-gray-800/50 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 flex items-center">
          <h1 className="text-2xl font-bold">Blood Sugar Companion</h1>
          <span className="ml-3 text-xs opacity-60">MVP • Done &gt; Perfect</span>
          <div className="ml-auto flex gap-2">
            <button
              className={`px-3 py-1 rounded ${range==='week'?'bg-blue-600 text-white':'bg-gray-200 dark:bg-gray-700'}`}
              onClick={()=>setRange('week')}
            >Week</button>
            <button
              className={`px-3 py-1 rounded ${range==='month'?'bg-blue-600 text-white':'bg-gray-200 dark:bg-gray-700'}`}
              onClick={()=>setRange('month')}
            >Month</button>
          </div>
        </div>
      </header>

      {/* ⬇️ 우측 상단 고정 프로필 버튼 */}
      <ProfileFab onClick={()=>setProfileOpen(true)} />

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <LogForm onSaved={fetchLogs} setCoachMessage={setCoachMessage}/>
        <CoachCard message={coachMessage}/>
        <div className="grid md:grid-cols-2 gap-6">
          <TrendChart title="Fasting Trend (week/month)" data={chartFasting} />
          <TrendChart title="Post-meal Trend (week/month)" data={chartPost} />
        </div>
        {/* Recent Logs + 토글 버튼 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow">
          <div className="flex items-center">
            <h3 className="text-lg font-semibold">Recent Logs</h3>
            <button
              onClick={()=>setShowLogs(v=>!v)}
              className="ml-auto px-3 py-1 rounded bg-gray-200 dark:bg-gray-700"
            >
              {showLogs ? "Hide" : "Open"}
            </button>
          </div>
          {showLogs && (
            <div className="mt-3">
              <LogsTable logs={logs} onChanged={fetchLogs}/>
            </div>
          )}
        </div>
      </main>

      {/* ⬇️ 우측 슬라이드 패널 + 프로필 에디터 */}
      <SidePanel open={profileOpen} onClose={()=>setProfileOpen(false)} title="My Goals & Lifestyle">
        <div className="space-y-4">
          <ProfileEditor />
          <WeeklySummary /> {/* 패널 내부에서 버튼을 눌러 요약 생성 */}
        </div>
      </SidePanel>

      <footer className="py-6 text-center opacity-60">
        Built for 6-week challenge • v1
      </footer>
    </div>
  );
}
