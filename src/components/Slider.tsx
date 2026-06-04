"use client";

import { useRef, useCallback, memo } from "react";

const Slider = memo(function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pct = ((value - min) / (max - min)) * 100;

  const interact = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const raw = min + ratio * (max - min);
      const snapped = Math.round(raw / step) * step;
      onChange(Math.max(min, Math.min(max, snapped)));
    },
    [min, max, step, onChange]
  );

  const startDrag = useCallback(
    (x: number, isTouch: boolean) => {
      interact(x);
      if (isTouch) {
        const onMove = (ev: TouchEvent) => { ev.preventDefault(); interact(ev.touches[0].clientX); };
        const onEnd = () => { window.removeEventListener("touchmove", onMove); window.removeEventListener("touchend", onEnd); };
        window.addEventListener("touchmove", onMove, { passive: false });
        window.addEventListener("touchend", onEnd);
      } else {
        const onMove = (ev: MouseEvent) => interact(ev.clientX);
        const onEnd = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onEnd); };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onEnd);
      }
    },
    [interact]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      let next = value;
      switch (e.key) {
        case "ArrowRight":
        case "ArrowUp":
          next = Math.min(max, value + step);
          break;
        case "ArrowLeft":
        case "ArrowDown":
          next = Math.max(min, value - step);
          break;
        case "Home":
          next = min;
          break;
        case "End":
          next = max;
          break;
        default:
          return;
      }
      e.preventDefault();
      onChange(next);
    },
    [value, min, max, step, onChange]
  );

  return (
    <div className="flex items-center gap-3 mb-2.5 last:mb-0">
      <span id={`slider-${label}`} className="text-[11px] text-white/60 w-16 shrink-0">{label}</span>
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={format(value)}
        className="relative flex-1 h-3 rounded-full bg-white/10 cursor-pointer select-none touch-none outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        onMouseDown={(e) => startDrag(e.clientX, false)}
        onTouchStart={(e) => startDrag(e.touches[0].clientX, true)}
        onKeyDown={handleKeyDown}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-white/30"
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute -top-1 -bottom-1 w-10 rounded-full bg-white active:scale-105 transition-transform"
          style={{ left: `calc(${pct}% - 10px)` }}
        />
      </div>
      <span className="text-[11px] text-white/80 w-10 text-right tabular-nums shrink-0">{format(value)}</span>
    </div>
  );
});

export default Slider;
