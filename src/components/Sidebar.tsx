"use client";

import type { GradientState } from "@/lib/gl-engine";

function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  hint,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  hint?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="mb-5 last:mb-0">
      <div className="flex justify-between items-baseline mb-2">
        <label className="text-[11px] text-neutral-500 tracking-wide">
          {label}
        </label>
        <span className="text-[11px] text-white font-medium tabular-nums">
          {format(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        className="w-full h-[3px] rounded-sm appearance-none bg-neutral-800 outline-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white
          [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-black
          [&::-webkit-slider-thumb]:shadow-[0_0_0_1px_white] [&::-webkit-slider-thumb]:transition-transform
          [&::-webkit-slider-thumb]:hover:scale-120
          [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-black
          [&::-moz-range-thumb]:cursor-pointer"
      />
      {hint && (
        <p className="text-[10px] text-neutral-600 mt-2.5 leading-relaxed">
          {hint}
        </p>
      )}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <label className="text-[11px] text-neutral-500 tracking-wide">
        {label}
      </label>
      <label className="relative w-[42px] h-[22px] shrink-0 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="opacity-0 w-0 h-0 peer"
        />
        <span
          className="absolute inset-0 bg-neutral-800 rounded-full transition-colors duration-200
          peer-checked:bg-white
          before:content-[''] before:absolute before:h-4 before:w-4 before:left-[3px] before:top-[3px]
          before:bg-neutral-500 before:rounded-full before:transition-all before:duration-200
          peer-checked:before:translate-x-5 peer-checked:before:bg-black"
        />
      </label>
    </div>
  );
}

function Section({
  label,
  children,
  noBorder,
}: {
  label: string;
  children: React.ReactNode;
  noBorder?: boolean;
}) {
  return (
    <div
      className={`px-6 py-5 ${noBorder ? "" : "border-b border-neutral-800"}`}
    >
      <div className="text-[10px] tracking-[2px] uppercase text-neutral-600 mb-3.5 flex items-center gap-2">
        {label}
        <span className="flex-1 h-px bg-neutral-800" />
      </div>
      {children}
    </div>
  );
}

export default function Sidebar({
  state,
  hasImage,
  onFileLoad,
  onStateChange,
  onExport,
  onCopyHtml,
  copyLabel,
}: {
  state: GradientState;
  hasImage: boolean;
  onFileLoad: (file: File) => void;
  onStateChange: (patch: Partial<GradientState>) => void;
  onExport: () => void;
  onCopyHtml: () => void;
  copyLabel: string;
}) {
  return (
    <aside className="bg-neutral-950 border-r border-neutral-800 flex flex-col overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-800">
      {/* Brand */}
      <div className="px-6 pt-7 pb-5 border-b border-neutral-800">
        <h1 className="font-serif text-[25px] font-semibold leading-none tracking-tight">
          Gradient
          <br />
          <em className="italic font-normal text-neutral-400">to Shader</em>
        </h1>
        <p className="text-neutral-600 text-[11px] mt-2 tracking-wide">
          Reconstruct any gradient as a live, animatable GPU shader.
        </p>
      </div>

      {/* Source image */}
      <Section label="Source image">
        <label
          className="border-[1.5px] border-dashed border-neutral-800 rounded-[14px] p-6 text-center cursor-pointer
            transition-colors duration-200 text-neutral-500 block
            hover:border-neutral-500 hover:bg-neutral-900 hover:text-white"
          onDragOver={(e) => {
            e.preventDefault();
            e.currentTarget.classList.add(
              "!border-neutral-500",
              "!bg-neutral-900",
              "!text-white"
            );
          }}
          onDragLeave={(e) => {
            e.currentTarget.classList.remove(
              "!border-neutral-500",
              "!bg-neutral-900",
              "!text-white"
            );
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.classList.remove(
              "!border-neutral-500",
              "!bg-neutral-900",
              "!text-white"
            );
            const f = e.dataTransfer.files[0];
            if (f) onFileLoad(f);
          }}
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="mx-auto mb-2.5 opacity-60"
          >
            <path d="M12 16V4m0 0L8 8m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
          </svg>
          <strong className="block text-white text-xs mb-1">
            Drop a gradient image
          </strong>
          <span className="text-[10.5px] text-neutral-600">
            or click to browse &middot; PNG / JPG
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

      {/* Reconstruction */}
      <Section label="Reconstruction">
        <Slider
          label="Sample resolution"
          value={state.res}
          min={4}
          max={256}
          step={2}
          format={(v) => `${v} px`}
          hint="Higher = more faithful. Lower = smoother / more abstract. Beyond ~128 most gradients see no visible improvement thanks to bicubic reconstruction."
          onChange={(v) => onStateChange({ res: v })}
        />
      </Section>

      {/* Quality boost */}
      <Section label="Quality boost">
        <Slider
          label="Enhancement"
          value={state.quality}
          min={0}
          max={1}
          step={0.01}
          format={(v) => v.toFixed(2)}
          hint='0 = plain bilinear. Toward 1 adds bicubic reconstruction + dithering, rendering smoother and sharper than the original image at any zoom. Use the "Original" toggle to compare.'
          onChange={(v) => onStateChange({ quality: v })}
        />
      </Section>

      {/* Noise */}
      <Section label="Noise">
        <Slider
          label="Amount"
          value={state.noise}
          min={0}
          max={0.5}
          step={0.005}
          format={(v) => v.toFixed(3)}
          hint="Adds static screen-space grain over the gradient. Subtle values (0.02-0.05) add texture without overwhelming the colors."
          onChange={(v) => onStateChange({ noise: v })}
        />
        <Slider
          label="Grain size"
          value={state.noiseScale}
          min={1}
          max={4}
          step={0.5}
          format={(v) => `${v.toFixed(1)}px`}
          onChange={(v) => onStateChange({ noiseScale: v })}
        />
      </Section>

      {/* Animation */}
      <Section label="Animation">
        <Toggle
          label="Animate flow"
          checked={state.animate}
          onChange={(v) => onStateChange({ animate: v })}
        />
        <Slider
          label="Flow amount"
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
          label="Detail scale"
          value={state.scale}
          min={0.5}
          max={6}
          step={0.1}
          format={(v) => v.toFixed(1)}
          onChange={(v) => onStateChange({ scale: v })}
        />
      </Section>

      {/* Export */}
      <div className="px-6 py-5 mt-auto">
        <button
          className="w-full py-3 rounded-[10px] bg-white text-black font-mono text-[11.5px] font-semibold
            tracking-wider uppercase transition-colors hover:bg-neutral-200 disabled:opacity-35 disabled:cursor-not-allowed"
          disabled={!hasImage}
          onClick={onExport}
        >
          Export shader code
        </button>
        <button
          className="w-full py-3 mt-2 rounded-[10px] bg-neutral-900 text-white font-mono text-[11.5px] font-semibold
            tracking-wider uppercase border border-neutral-800 transition-colors
            hover:border-neutral-500 hover:text-neutral-300 disabled:opacity-35 disabled:cursor-not-allowed"
          disabled={!hasImage}
          onClick={onCopyHtml}
        >
          {copyLabel}
        </button>
        <p className="text-[10px] text-neutral-600 mt-3 leading-relaxed">
          Export gives you ready-to-paste GLSL + a one-file demo with your
          gradient baked in.
        </p>
      </div>
    </aside>
  );
}
