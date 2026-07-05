import { X } from "lucide-react";

export function ComingSoon({
  open, title, blurb, onClose,
}: { open: boolean; title: string; blurb?: string; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 backdrop-blur-sm p-4"
         onClick={onClose}>
      <div className="relative w-full max-w-sm rounded-3xl border-4 border-white/20 bg-gradient-to-b from-[hsl(260_45%_22%)] to-[hsl(240_40%_12%)] p-6 text-center text-white shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
           onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose}
          className="absolute top-3 right-3 h-8 w-8 grid place-items-center rounded-full bg-white/10 hover:bg-white/20">
          <X className="h-4 w-4" />
        </button>
        <div className="text-5xl mb-2">🚧</div>
        <div className="text-2xl font-black tracking-wide">{title}</div>
        <div className="mt-1 text-xs uppercase tracking-[0.25em] text-amber-300 font-bold">Coming soon</div>
        {blurb && <p className="mt-3 text-sm text-white/70 leading-relaxed">{blurb}</p>}
        <button onClick={onClose}
          className="mt-5 px-5 py-2 rounded-xl bg-gradient-to-b from-yellow-300 to-amber-500 text-amber-950 font-black tracking-wider shadow-md hover:brightness-110">
          GOT IT
        </button>
      </div>
    </div>
  );
}
