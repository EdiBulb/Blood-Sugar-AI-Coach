export default function CoachCard({ message }) {
  if (!message) return null;
  return (
    <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-2xl p-4">
      <div className="text-sm opacity-70 mb-1">🤖 AI Coach</div>
      <p className="text-base">{message}</p>
    </div>
  );
}
