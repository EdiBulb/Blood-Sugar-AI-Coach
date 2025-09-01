// src/components/ProfileFab.jsx
export default function ProfileFab({ onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label="Open profile"
      className="fixed top-4 right-4 z-50 inline-flex items-center justify-center
                 h-11 w-11 rounded-full bg-white/90 dark:bg-gray-800/80
                 shadow-md ring-1 ring-black/5 hover:scale-105 transition"
    >
      {/* 심플한 프로필 아이콘 (SVG) */}
      <svg viewBox="0 0 24 24" width="20" height="20" className="opacity-80">
        <path
          fill="currentColor"
          d="M12 12c2.761 0 5-2.686 5-6s-2.239-6-5-6-5 2.686-5 6 2.239 6 5 6zm0 2c-4.418 0-8 2.91-8 6.5V22h16v-1.5C20 16.91 16.418 14 12 14z"
        />
      </svg>
    </button>
  );
}
