"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createGLEngine, type GLEngine, type GradientState, type createDefaultState } from "@/lib/gl-engine";
import { ANIM_MODES } from "@/lib/shaders";

type ViewMode = "shader" | "source" | "compare";

/* ── Liquid Glass Slider ── */
function GlassSlider({
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

  return (
    <div className="flex items-center gap-3 mb-2.5 last:mb-0">
      <span className="text-[11px] text-white/60 w-16 shrink-0">{label}</span>
      <div
        ref={trackRef}
        className="relative flex-1 h-3 rounded-full bg-white/10 cursor-pointer select-none touch-none"
        onMouseDown={(e) => startDrag(e.clientX, false)}
        onTouchStart={(e) => startDrag(e.touches[0].clientX, true)}
      >
        {/* Fill track */}
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-white/30"
          style={{ width: `${pct}%` }}
        />
        {/* Thumb */}
        <div
          className="absolute -top-1 -bottom-1 w-10 rounded-full bg-white"
          style={{ left: `calc(${pct}% - 10px)` }}
        />
      </div>
      <span className="text-[11px] text-white/80 w-10 text-right tabular-nums shrink-0">{format(value)}</span>
    </div>
  );
}

export default function Stage({
  state,
  defaults,
  engineRef,
  onEngineReady,
  onModeChange,
  onZoomPan,
  onSplitChange,
  onStateChange,
  onFileLoad,
  onCopyReact,
  onCopyHtml,
  copyReactLabel,
  copyHtmlLabel,
  imageSizeBytes,
  shaderSizeBytes,
  bgColors,
}: {
  state: GradientState;
  defaults: ReturnType<typeof createDefaultState>;
  engineRef: React.RefObject<GLEngine | null>;
  onEngineReady: (engine: GLEngine) => void;
  onModeChange: (mode: ViewMode) => void;
  onZoomPan: (patch: { zoom?: number; panX?: number; panY?: number }) => void;
  onSplitChange: (split: number) => void;
  onStateChange: (patch: Partial<GradientState>) => void;
  onFileLoad: (file: File) => void;
  onCopyReact: () => void;
  onCopyHtml: () => void;
  copyReactLabel: string;
  copyHtmlLabel: string;
  imageSizeBytes: number;
  shaderSizeBytes: number;
  bgColors: string[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef<"pan" | "split" | false>(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const [showControls, setShowControls] = useState(true);
  const [viewSize, setViewSize] = useState<"fit" | "fill" | "mobile" | "tablet">("fit");
  const hasImage = !!state.img;

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    const engine = createGLEngine(canvasRef.current, containerRef.current, () => {});
    onEngineReady(engine);
    const onResize = () => engine.resize();
    window.addEventListener("resize", onResize);
    engine.resize();
    return () => { window.removeEventListener("resize", onResize); engine.destroy(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (engineRef.current) engineRef.current.resize();
  }, [state.aspectOverride, viewSize, engineRef]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const es = engineRef.current?.state;
      if (!es) return;
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.min(20, Math.max(1, es.zoom * delta));
      onZoomPan(newZoom <= 1 ? { zoom: 1, panX: 0, panY: 0 } : { zoom: newZoom });
    },
    [engineRef, onZoomPan]
  );

  const startPan = useCallback((x: number, y: number) => {
    if (!engineRef.current || engineRef.current.state.zoom <= 1) return;
    isDragging.current = "pan";
    lastMouse.current = { x, y };
  }, [engineRef]);

  const movePan = useCallback((x: number, y: number) => {
    if (!engineRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (isDragging.current === "split") {
      onSplitChange(Math.max(0.05, Math.min(0.95, (x - rect.left) / rect.width)));
      return;
    }
    if (isDragging.current === "pan") {
      const es = engineRef.current.state;
      const dx = (x - lastMouse.current.x) / rect.width;
      const dy = (y - lastMouse.current.y) / rect.height;
      lastMouse.current = { x, y };
      onZoomPan({ panX: es.panX + dx, panY: es.panY - dy });
    }
  }, [engineRef, onZoomPan, onSplitChange]);

  const endDrag = useCallback(() => { isDragging.current = false; }, []);

  const splitPct = `${state.compareSplit * 100}%`;

  const aspect = hasImage ? state.imgW / state.imgH : 16 / 10;

  // Container sizing based on view mode
  const containerClass = (() => {
    if (!hasImage) return "w-[min(90%,800px)] mx-auto";
    switch (viewSize) {
      case "fill": return "absolute inset-0";
      case "mobile": return "w-[375px] h-[812px] mx-auto rounded-[40px] overflow-hidden border-2 border-white/10";
      case "tablet": return "w-[768px] h-[1024px] mx-auto rounded-[20px] overflow-hidden border-2 border-white/10";
      default: return "w-[min(90%,1000px)] max-h-[80vh] mx-auto rounded-xl overflow-hidden";
    }
  })();

  const containerStyle: React.CSSProperties = (() => {
    if (!hasImage) return { aspectRatio: "16/10" };
    switch (viewSize) {
      case "fill": return {};
      case "mobile": return {};
      case "tablet": return {};
      default: return { aspectRatio: `${aspect}` };
    }
  })();

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center transition-[background] duration-700 ease-out"
      style={{
        background: bgColors.length >= 5
          ? `radial-gradient(ellipse 80% 80% at 15% 15%, ${bgColors[0]}, transparent 70%),
             radial-gradient(ellipse 80% 80% at 85% 15%, ${bgColors[1]}, transparent 70%),
             radial-gradient(ellipse 90% 90% at 50% 50%, ${bgColors[2]}, transparent 80%),
             radial-gradient(ellipse 80% 80% at 15% 85%, ${bgColors[3]}, transparent 70%),
             radial-gradient(ellipse 80% 80% at 85% 85%, ${bgColors[4]}, transparent 70%),
             ${bgColors[2]}`
          : "#1a1a1a",
      }}
    >
      {/* Canvas container */}
      <div
        ref={containerRef}
        className={`relative touch-none ${containerClass}`}
        style={{ ...containerStyle, cursor: hasImage && state.zoom > 1 ? "grab" : "default" }}
        onWheel={handleWheel}
        onMouseDown={(e) => { startPan(e.clientX, e.clientY); e.preventDefault(); }}
        onMouseMove={(e) => movePan(e.clientX, e.clientY)}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        onTouchStart={(e) => startPan(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={(e) => { e.preventDefault(); movePan(e.touches[0].clientX, e.touches[0].clientY); }}
        onTouchEnd={endDrag}
        onDoubleClick={() => onZoomPan({ zoom: 1, panX: 0, panY: 0 })}
      >
        <canvas ref={canvasRef} className="block w-full h-full" />
      </div>

      {/* Compare divider */}
      {hasImage && state.mode === "compare" && (
        <>
          <div
            className="absolute top-0 bottom-0 z-10"
            style={{ left: splitPct, transform: "translateX(-50%)", width: "24px", cursor: "col-resize" }}
            onMouseDown={(e) => { e.stopPropagation(); isDragging.current = "split"; }}
            onTouchStart={(e) => { e.stopPropagation(); isDragging.current = "split"; }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-8 rounded-full bg-white/80 shadow-lg flex items-center justify-center gap-px">
              <div className="w-px h-3 bg-black/20" />
              <div className="w-px h-3 bg-black/20" />
            </div>
          </div>
          <div className="absolute bottom-20 left-4 text-[10px] text-white/40 pointer-events-none">Shader</div>
          <div className="absolute bottom-20 right-4 text-[10px] text-white/40 pointer-events-none">Original</div>
        </>
      )}

      {/* Zoom badge */}
      {hasImage && state.zoom > 1 && (
        <div className="absolute top-4 left-4 bg-black backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] text-white/70 pointer-events-none">
          {state.zoom.toFixed(1)}x
        </div>
      )}

      {/* Top bar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1">
        {hasImage && (
          <>
            {/* Mode tabs */}
            <div className="flex gap-px bg-black/60 backdrop-blur-md p-0.5 rounded-full h-[36px]">
              {(["shader", "compare", "source"] as ViewMode[]).map((m) => (
                <button
                  key={m}
                  className={`text-[11px] px-4 py-1.5 rounded-full cursor-pointer transition-all capitalize
                    ${state.mode === m ? "bg-white/20 text-white" : "text-white/50 hover:text-white/80"}`}
                  onClick={() => onModeChange(m)}
                >
                  {m === "source" ? "Original" : m}
                </button>
              ))}
            </div>

            {/* View size tabs */}
            <div className="flex gap-px bg-black/60 backdrop-blur-md p-0.5 rounded-full h-[36px]">
              {([
                { id: "fit" as const, label: "Fit" },
                { id: "fill" as const, label: "Fill" },
                // { id: "mobile" as const, label: "Phone" },
                // { id: "tablet" as const, label: "Tablet" },
              ]).map((v) => (
                <button
                  key={v.id}
                  className={`text-[11px] px-5 py-1.5 rounded-full cursor-pointer transition-all
                    ${viewSize === v.id ? "bg-white/20 text-white" : "text-white/50 hover:text-white/80"}`}
                  onClick={() => setViewSize(v.id)}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Settings toggle */}
        <button
          className="size-[36px] rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center cursor-pointer text-white/50 hover:text-white transition-colors"
          onClick={() => setShowControls(!showControls)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      </div>

      {/* Floating controls panel */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-20 transition-all duration-300 ease-out
          ${showControls ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"}`}
      >
        <div className="mx-auto max-w-2xl p-2">
          <div className="bg-black/60 backdrop-blur-2xl rounded-3xl p-5 pb-0 shadow-2xl overflow-hidden">

            <div className="space-y-1">
                <GlassSlider label="Samples" value={state.res} min={4} max={256} step={2} format={(v) => `${v}`} onChange={(v) => onStateChange({ res: v })} />
                {/* <GlassSlider label="Hue" value={state.hueShift} min={-3.14159} max={3.14159} step={0.01} format={(v) => `${Math.round((v / Math.PI) * 180)}°`} onChange={(v) => onStateChange({ hueShift: v })} /> */}
                <GlassSlider label="Noise" value={state.noise} min={0} max={0.5} step={0.005} format={(v) => v.toFixed(3)} onChange={(v) => onStateChange({ noise: v })} />

                {/* Animation pills */}
                <div className="flex items-start gap-2 pt-1">
                  <span className="text-[11px] text-white/60 w-14 shrink-0">Animation</span>
                  <div className="flex flex-wrap gap-1">
                    {ANIM_MODES.map((m) => (
                      <button
                        key={m.id}
                        className={`h-6 px-2.5 rounded-lg text-[12px] cursor-pointer transition-all
                          ${state.animMode === m.id
                            ? "bg-white text-black font-medium"
                            : "bg-white/10 text-white/60 hover:bg-white/20"
                          }`}
                        onClick={() => onStateChange({ animMode: m.id })}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <AnimatePresence initial={false}>
                  {state.animMode > 0 && (
                    <motion.div
                      key="anim-sliders"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-1 pt-1">
                        <GlassSlider label="Flow" value={state.flow} min={0} max={1} step={0.01} format={(v) => v.toFixed(2)} onChange={(v) => onStateChange({ flow: v })} />
                        <GlassSlider label="Speed" value={state.speed} min={0} max={2} step={0.01} format={(v) => v.toFixed(2)} onChange={(v) => onStateChange({ speed: v })} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Export buttons */}
                <div className="flex gap-2 p-4 mt-2 border-t border-white/20 relative -left-5 w-[calc(100%+40px)]">
                  <button
                    className="flex-1 py-2 h-10 rounded-full bg-white/30 text-white text-xs font-medium cursor-pointer hover:bg-white/50 transition-colors"
                    onClick={onCopyReact}
                  >
                    {copyReactLabel}
                  </button>
                  {/* <button
                    className="flex-1 py-2 rounded-full bg-white/10 text-white/70 text-[11px] font-medium cursor-pointer hover:bg-white/20 transition-colors border border-white/10"
                    onClick={onCopyHtml}
                  >
                    {copyHtmlLabel}
                  </button> */}
                  <label className="py-2 px-4 rounded-full flex items-center justify-center bg-white/10 text-white/70 text-xs cursor-pointer hover:bg-white/20 transition-colors border border-white/10">
                    Upload
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileLoad(f); }} />
                  </label>
                </div>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
}
