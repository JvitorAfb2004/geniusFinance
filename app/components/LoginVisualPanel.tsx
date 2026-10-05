export function LoginVisualPanel() {
  return (
    <aside className="relative hidden items-center justify-center overflow-hidden bg-[#1a1d21] p-10 text-white lg:flex">
      <div className="absolute inset-0 opacity-40" aria-hidden="true">
        <svg className="h-full w-full" viewBox="0 0 640 760" fill="none" preserveAspectRatio="none">
          <path d="M-80 650C80 570 120 470 260 480C400 490 390 300 720 250" stroke="#ffffff" strokeWidth="1.5" opacity="0.5" />
          <path d="M-80 720C160 610 230 550 350 580C470 610 490 390 720 330" stroke="#9aa1ac" strokeWidth="1.5" />
          <path d="M40 0C130 160 220 180 260 310C300 440 450 450 640 590" stroke="#ffffff" strokeWidth="1" strokeDasharray="5 9" opacity="0.6" />
          <circle cx="260" cy="480" r="8" fill="#ffffff" opacity="0.7" />
          <circle cx="390" cy="300" r="6" fill="#9aa1ac" />
          <circle cx="490" cy="390" r="8" fill="#ffffff" opacity="0.4" />
        </svg>
      </div>
      <div className="relative z-10 text-center">
        <span className="w-20 h-20 rounded-3xl bg-white text-[#1a1d21] text-3xl font-bold inline-flex items-center justify-center [filter:drop-shadow(0_18px_40px_rgba(0,0,0,0.35))]">
          G
        </span>
        <p className="mt-6 text-4xl font-bold tracking-tight">Genius.</p>
        <p className="mt-3 text-sm text-white/60 font-medium">Gestão simples e profissional.</p>
      </div>
    </aside>
  );
}
