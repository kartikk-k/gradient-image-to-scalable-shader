"use client";

import { useRef, useCallback } from "react";
import type { GradientState } from "@/lib/gl-engine";
import { ANIM_MODES } from "@/lib/shaders";

function Slider({
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

  const handleInteraction = useCallback(
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

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      handleInteraction(e.clientX);
      const onMove = (ev: MouseEvent) => handleInteraction(ev.clientX);
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [handleInteraction]
  );

  return (
    <div className="mb-3 last:mb-0">
      <div
        ref={trackRef}
        className="relative h-8 rounded-lg bg-[#333] cursor-pointer select-none overflow-hidden"
        onMouseDown={handleMouseDown}
      >
        <div
          className="absolute inset-y-0 left-0 bg-[#4a4a4a] rounded-lg"
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute top-2 bottom-2 w-px bg-[#999]"
          style={{ left: `${pct-3}%` }}
        />
        <div className="relative z-10 flex items-center justify-between h-full px-3">
          <span className="text-[11px] text-[#bbb]">{label}</span>
          <span className="text-[11px] text-white tabular-nums">{format(value)}</span>
        </div>
      </div>
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-5 py-4 border-b border-[#4a4a4a]">
      <div className="text-[11px] text-[#888] mb-3">{label}</div>
      {children}
    </div>
  );
}

export default function Sidebar({
  state,
  hasImage,
  onFileLoad,
  onStateChange,
  onCopyReact,
  onCopyHtml,
  copyReactLabel,
  copyHtmlLabel,
}: {
  state: GradientState;
  hasImage: boolean;
  onFileLoad: (file: File) => void;
  onStateChange: (patch: Partial<GradientState>) => void;
  onCopyReact: () => void;
  onCopyHtml: () => void;
  copyReactLabel: string;
  copyHtmlLabel: string;
}) {
  return (
    <aside className="bg-[#3E3E3E] border-r border-[#4a4a4a] flex flex-col overflow-y-auto">
      <div className="px-5 pt-6 pb-4 border-b border-[#4a4a4a]">
        <h1 className="text-[20px] font-semibold leading-tight text-white">
          Gradient <span className="text-[#999] font-normal">to Shader</span>
        </h1>
        <p className="text-[#888] text-xs mt-1.5">
          Reconstruct any gradient as a live GPU shader.
        </p>
      </div>

      <Section label="Source">
        <label
          className="border border-dashed border-[#555] rounded-lg p-5 text-center cursor-pointer block
            transition-colors hover:border-[#888] hover:bg-[#454545]"
          onDragOver={(e) => {
            e.preventDefault();
            e.currentTarget.classList.add("!border-[#888]", "!bg-[#454545]");
          }}
          onDragLeave={(e) => {
            e.currentTarget.classList.remove("!border-[#888]", "!bg-[#454545]");
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.classList.remove("!border-[#888]", "!bg-[#454545]");
            const f = e.dataTransfer.files[0];
            if (f) onFileLoad(f);
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="mx-auto mb-2 text-[#888]"
          >
            <path d="M12 16V4m0 0L8 8m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
          </svg>
          <span className="text-xs text-[#aaa] block">
            Drop image or click to browse
          </span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFileLoad(f);
            }}
          />
        </label>
      </Section>

      <Section label="Resolution">
        <Slider
          label="Samples"
          value={state.res}
          min={4}
          max={256}
          step={2}
          format={(v) => `${v}`}
          onChange={(v) => onStateChange({ res: v })}
        />
      </Section>

      <Section label="Noise">
        <Slider
          label="Amount"
          value={state.noise}
          min={0}
          max={0.5}
          step={0.005}
          format={(v) => v.toFixed(3)}
          onChange={(v) => onStateChange({ noise: v })}
        />
        <Slider
          label="Size"
          value={state.noiseScale}
          min={0}
          max={5}
          step={0.5}
          format={(v) => `${v.toFixed(1)}px`}
          onChange={(v) => onStateChange({ noiseScale: v })}
        />
      </Section>

      <Section label="Animation">
        <div className="mb-3">
          <div className="flex flex-wrap gap-1.5">
            {ANIM_MODES.map((m) => (
              <button
                key={m.id}
                className={`h-7 px-3 rounded-full text-[11px] cursor-pointer transition-all duration-100
                  ${state.animMode === m.id
                    ? "bg-white text-black font-medium shadow-sm"
                    : "bg-[#4a4a4a] text-[#bbb] hover:bg-[#555] hover:text-white"
                  }`}
                onClick={() => onStateChange({ animMode: m.id })}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
        {state.animMode > 0 && (
          <>
            <Slider
              label="Flow"
              value={state.flow}
              min={0}
              max={1}
              step={0.01}
              format={(v) => v.toFixed(2)}
              onChange={(v) => onStateChange({ flow: v })}
            />
            <Slider
              label="Speed"
              value={state.speed}
              min={0}
              max={2}
              step={0.01}
              format={(v) => v.toFixed(2)}
              onChange={(v) => onStateChange({ speed: v })}
            />
            <Slider
              label="Scale"
              value={state.scale}
              min={0.5}
              max={6}
              step={0.1}
              format={(v) => v.toFixed(1)}
              onChange={(v) => onStateChange({ scale: v })}
            />
          </>
        )}
      </Section>

      <div className="px-5 py-4 mt-auto">
        <button
          className="w-full py-2.5 rounded-lg bg-white text-black text-xs font-medium
            transition-colors hover:bg-[#e0e0e0] disabled:opacity-30 disabled:cursor-not-allowed"
          disabled={!hasImage}
          onClick={onCopyReact}
        >
          {copyReactLabel}
        </button>
        <button
          className="w-full py-2.5 mt-2 rounded-lg bg-transparent text-[#ccc] text-xs font-medium
            border border-[#555] transition-colors
            hover:border-[#888] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
          disabled={!hasImage}
          onClick={onCopyHtml}
        >
          {copyHtmlLabel}
        </button>
      </div>
    </aside>
  );
}
