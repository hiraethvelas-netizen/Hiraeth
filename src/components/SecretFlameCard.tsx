/** Fixed artwork shared by the four mystery cards; no uploaded image is needed. */
export function SecretFlameCard({ index }: { index: number }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-xl border border-[#b79b69]/60 bg-gradient-to-b from-[#f3e8d1] to-[#dfcfac] p-3 text-[#54412d]">
      <span className="text-xs uppercase tracking-[.2em]">Hiraeth</span>
      <svg viewBox="0 0 120 150" className="h-32 w-24 max-w-full" aria-hidden="true" fill="none">
        <path d="M60 9c-18 21-19 33-10 41 8 6 23 1 23-11 0-9-8-17-13-30Z" fill="#c1974b" />
        <path d="M60 29c-8 10-8 16-3 19 6 4 11-2 8-8l-5-11Z" fill="#faf0c9" />
        <path d="M60 51v12" stroke="#54412d" strokeWidth="3" strokeLinecap="round" />
        <path d="M30 67v62c0 13 60 13 60 0V67" fill="#f8f0de" stroke="#8a704c" strokeWidth="2" />
        <ellipse cx="60" cy="67" rx="30" ry="10" fill="#fffaeb" stroke="#8a704c" strokeWidth="2" />
        <path
          d="M39 73v18a5 5 0 0 0 10 0v-6a5 5 0 0 1 10 0v12a5 5 0 0 0 10 0V75"
          stroke="#d9c89f"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path d="M18 141h84" stroke="#8a704c" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className="font-display text-xl">Carta {index + 1}</span>
    </div>
  );
}
