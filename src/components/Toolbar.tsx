"use client";

import type { GradientState } from "@/lib/gl-engine";

type ViewMode = "shader" | "source" | "compare";

export default function Toolbar({
  state,
  viewSize,
  onModeChange,
  onViewSizeChange,
  onToggleControls,
}: {
  state: GradientState;
  viewSize: "fit" | "fill";
  onModeChange: (mode: ViewMode) => void;
  onViewSizeChange: (size: "fit" | "fill") => void;
  onToggleControls: () => void;
}) {
  const hasImage = !!state.img;

  if (!hasImage) return null;

  return (
    <div className="absolute top-6 md:top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 w-[calc(100%-24px)] md:w-auto justify-between">
      <div role="tablist" className="flex gap-px bg-black/60 backdrop-blur-md p-0.5 rounded-full h-[36px]">
        {(["shader", "compare", "source"] as ViewMode[]).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={state.mode === m}
            className={`text-[11px] px-4 py-1.5 rounded-full cursor-pointer transition-all capitalize
              ${state.mode === m ? "bg-white/20 text-white" : "text-white/50 hover:text-white/80"}`}
            onClick={() => onModeChange(m)}
          >
            {m === "source" ? "Original" : m}
          </button>
        ))}
      </div>
      <div className="flex-1 md:hidden" />
      <div role="tablist" className="flex gap-px bg-black/60 backdrop-blur-md p-0.5 rounded-full h-[36px]">
        {([
          { id: "fit" as const, label: "Fit" },
          { id: "fill" as const, label: "Fill" },
        ]).map((v) => (
          <button
            key={v.id}
            role="tab"
            aria-selected={viewSize === v.id}
            className={`text-[11px] px-5 py-1.5 rounded-full cursor-pointer transition-all
              ${viewSize === v.id ? "bg-white/20 text-white" : "text-white/50 hover:text-white/80"}`}
            onClick={() => onViewSizeChange(v.id)}
          >
            {v.label}
          </button>
        ))}
      </div>
      <button
        className="size-[36px] rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center cursor-pointer text-white/50 hover:text-white transition-colors"
        onClick={onToggleControls}
        aria-label="Toggle settings"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>
    </div>
  );
}
