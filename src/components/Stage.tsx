"use client";

import { useEffect, useRef, useCallback } from "react";
import { createGLEngine, type GLEngine, type GradientState } from "@/lib/gl-engine";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

type ViewMode = "shader" | "source" | "compare";

export default function Stage({
  state,
  engineRef,
  onEngineReady,
  onModeChange,
  onZoomPan,
  onSplitChange,
  imageSizeBytes,
  shaderSizeBytes,
}: {
  state: GradientState;
  engineRef: React.RefObject<GLEngine | null>;
  onEngineReady: (engine: GLEngine) => void;
  onModeChange: (mode: ViewMode) => void;
  onZoomPan: (patch: { zoom?: number; panX?: number; panY?: number }) => void;
  onSplitChange: (split: number) => void;
  imageSizeBytes: number;
  shaderSizeBytes: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fpsRef = useRef<HTMLSpanElement>(null);
  const zoomRef = useRef<HTMLSpanElement>(null);
  const isDragging = useRef<"pan" | "split" | false>(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const hasImage = !!state.img;

  const handleFps = useCallback((fps: number) => {
    if (fpsRef.current) fpsRef.current.textContent = `${fps}`;
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    const engine = createGLEngine(canvasRef.current, containerRef.current, handleFps);
    onEngineReady(engine);
    const onResize = () => engine.resize();
    window.addEventListener("resize", onResize);
    engine.resize();
    return () => {
      window.removeEventListener("resize", onResize);
      engine.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (zoomRef.current) {
      zoomRef.current.textContent = state.zoom === 1 ? "1x" : `${state.zoom.toFixed(1)}x`;
    }
  }, [state.zoom]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const es = engineRef.current?.state;
      if (!es) return;
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.min(20, Math.max(1, es.zoom * delta));
      if (newZoom <= 1) {
        onZoomPan({ zoom: 1, panX: 0, panY: 0 });
      } else {
        onZoomPan({ zoom: newZoom });
      }
    },
    [engineRef, onZoomPan]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!engineRef.current) return;
      if (engineRef.current.state.zoom > 1) {
        isDragging.current = "pan";
        lastMouse.current = { x: e.clientX, y: e.clientY };
        e.preventDefault();
      }
    },
    [engineRef]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!engineRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (isDragging.current === "split") {
        const x = Math.max(0.05, Math.min(0.95, (e.clientX - rect.left) / rect.width));
        onSplitChange(x);
        return;
      }
      if (isDragging.current === "pan") {
        const es = engineRef.current.state;
        const dx = (e.clientX - lastMouse.current.x) / rect.width;
        const dy = (e.clientY - lastMouse.current.y) / rect.height;
        lastMouse.current = { x: e.clientX, y: e.clientY };
        onZoomPan({ panX: es.panX + dx, panY: es.panY - dy });
      }
    },
    [engineRef, onZoomPan, onSplitChange]
  );

  const handleMouseUp = useCallback(() => { isDragging.current = false; }, []);
  const handleDoubleClick = useCallback(() => { onZoomPan({ zoom: 1, panX: 0, panY: 0 }); }, [onZoomPan]);
  const handleSplitMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    isDragging.current = "split";
  }, []);

  const modes: { id: ViewMode; label: string }[] = [
    { id: "shader", label: "Shader" },
    { id: "compare", label: "Compare" },
    { id: "source", label: "Original" },
  ];

  const splitPct = `${state.compareSplit * 100}%`;
  const savedBytes = imageSizeBytes > 0 && shaderSizeBytes >= 0
    ? Math.max(0, imageSizeBytes - shaderSizeBytes) : 0;
  const canShowSaved = imageSizeBytes > 0 && shaderSizeBytes > 0;
  const savedPct = imageSizeBytes > 0 ? (savedBytes / imageSizeBytes) * 100 : 0;

  return (
    <main className="relative flex flex-col items-center justify-center overflow-hidden">
      {/* Tabs above the image */}
      {hasImage && (
        <div className="flex gap-px bg-[#3a3a3a] p-0.5 rounded-lg mb-4">
          {modes.map((m) => (
            <button
              key={m.id}
              className={`text-[11px] px-4 py-1.5 rounded-md cursor-pointer transition-colors
                ${state.mode === m.id
                  ? "bg-[#555] text-white font-medium"
                  : "text-[#999] hover:text-white"}`}
              onClick={() => onModeChange(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}

      <div
        ref={containerRef}
        className="relative w-[min(86%,920px)] rounded-xl overflow-hidden border border-[#4a4a4a]"
        style={{
          aspectRatio: hasImage ? `${state.imgW / state.imgH}` : "16/10",
          cursor: hasImage && state.zoom > 1
            ? (isDragging.current === "pan" ? "grabbing" : "grab")
            : "default",
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      >
        <canvas ref={canvasRef} className="block w-full h-full" />

        {!hasImage && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-[#666] gap-1.5">
            <div className="text-2xl text-[#555]">No gradient</div>
            <div className="text-[11px] text-[#666]">Upload an image to begin</div>
          </div>
        )}

        {/* Compare divider */}
        {hasImage && state.mode === "compare" && (
          <>
            <div
              className="absolute top-0 bottom-0 z-10"
              style={{ left: splitPct, transform: "translateX(-50%)", width: "24px", cursor: "col-resize" }}
              onMouseDown={handleSplitMouseDown}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-7 rounded-full bg-white/80 shadow-[0_1px_4px_rgba(0,0,0,.4)] flex items-center justify-center gap-px">
                <div className="w-px h-2.5 bg-black/25" />
                <div className="w-px h-2.5 bg-black/25" />
              </div>
            </div>
            <div className="absolute bottom-2.5 left-3 text-[9px] text-white/50 pointer-events-none">Shader</div>
            <div className="absolute bottom-2.5 right-3 text-[9px] text-white/50 pointer-events-none">Original</div>
          </>
        )}

        {/* Zoom indicator */}
        {hasImage && state.zoom > 1 && (
          <div className="absolute top-3 left-3 bg-[#333]/90 px-2 py-0.5 rounded-md border border-[#555] text-[10px] text-[#ccc] pointer-events-none">
            <span ref={zoomRef}>{state.zoom.toFixed(1)}x</span>
          </div>
        )}
      </div>

      {/* Footer stats */}
      {hasImage && (
        <div className="flex justify-center gap-4 mt-4 text-xs font-light text-[#9a9a9a]">
          <span>
            <span className="text-[#999]">{state.imgW}&times;{state.imgH}</span> source
            {imageSizeBytes > 0 && <span className="text-[#c1c1c1] ml-1">({formatSize(imageSizeBytes)})</span>}
          </span>
          <span>
            <span className="text-[#999]">{state.gridW}&times;{state.gridH}</span> shader
            {shaderSizeBytes > 0 && <span className="text-[#c1c1c1] ml-1">({formatSize(shaderSizeBytes)})</span>}
          </span>
          {canShowSaved && (
            <span className="text-emerald-500">
              {savedPct.toFixed(0)}% smaller
            </span>
          )}
          <span>
            <span ref={fpsRef} className="text-[#c1c1c1]">--</span> fps
          </span>
        </div>
      )}
    </main>
  );
}
