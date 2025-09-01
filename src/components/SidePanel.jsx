// src/components/SidePanel.jsx
export default function SidePanel({ open, onClose, title, children }) {
  return (
    <>
      {/* 어두운 배경 */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/40 transition-opacity ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      />
      {/* 오른쪽 슬라이드 */}
      <aside
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-gray-900 shadow-xl
                    transition-transform ${open ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog" aria-modal="true" aria-label={title}
      >
        <div className="flex items-center justify-between p-4 border-b border-black/10 dark:border-white/10">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded hover:bg-black/5 dark:hover:bg-white/10">
            ✕
          </button>
        </div>
        <div className="p-4 overflow-auto h-[calc(100%-56px)]">
          {children}
        </div>
      </aside>
    </>
  );
}
