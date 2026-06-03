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
    if (fpsRef.current) fpsRef.current.textContent = `${fps} fps`;
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
      zoomRef.current.textContent =
        state.zoom === 1 ? "1x" : `${state.zoom.toFixed(1)}x`;
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
        onZoomPan({
          panX: es.panX + dx,
          panY: es.panY - dy,
        });
      }
    },
    [engineRef, onZoomPan, onSplitChange]
  );

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleDoubleClick = useCallback(() => {
    onZoomPan({ zoom: 1, panX: 0, panY: 0 });
  }, [onZoomPan]);

  const handleSplitMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      isDragging.current = "split";
    },
    []
  );

  const modes: { id: ViewMode; label: string }[] = [
    { id: "shader", label: "Shader" },
    { id: "compare", label: "Compare" },
    { id: "source", label: "Original" },
  ];

  const splitPct = `${state.compareSplit * 100}%`;

  return (
    <main className="relative flex items-center justify-center overflow-hidden bg-[radial-gradient(1200px_800px_at_70%_20%,#0a0a0a,transparent),#000]">
      <div
        ref={containerRef}
        className="relative w-[min(86%,920px)] rounded-[18px] overflow-hidden shadow-[0_40px_120px_-30px_rgba(0,0,0,.8),0_0_0_1px_theme(--color-neutral-800)]"
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
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-neutral-600 gap-2.5">
            <div className="font-serif italic text-3xl text-neutral-500">
              no gradient yet
            </div>
            <div className="text-[11px] tracking-widest uppercase">
              Upload an image to begin
            </div>
          </div>
        )}

        {hasImage && (
          <div className="absolute top-4 right-4 flex gap-0.5 bg-neutral-900/80 backdrop-blur-md p-1 rounded-[10px] border border-neutral-700/50">
            {modes.map((m) => (
              <button
                key={m.id}
                className={`border-none font-mono text-[10px] px-3.5 py-1.5 rounded-[7px] cursor-pointer tracking-wider transition-all duration-150
                  ${state.mode === m.id ? "bg-white text-black font-semibold" : "bg-transparent text-neutral-500 hover:text-neutral-300"}`}
                onClick={() => onModeChange(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}

        {/* Draggable compare divider */}
        {hasImage && state.mode === "compare" && (
          <>
            {/* Divider handle */}
            <div
              className="absolute top-0 bottom-0 z-10"
              style={{ left: splitPct, transform: "translateX(-50%)", width: "24px", cursor: "col-resize" }}
              onMouseDown={handleSplitMouseDown}
            >
              {/* Handle pill */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-8 rounded-full bg-white/90 backdrop-blur-sm shadow-[0_2px_8px_rgba(0,0,0,.5)] flex items-center justify-center gap-[2px]">
                <div className="w-[2px] h-3 rounded-full bg-black/30" />
                <div className="w-[2px] h-3 rounded-full bg-black/30" />
              </div>
            </div>
            {/* Labels */}
            <div className="absolute bottom-3 left-4 font-mono text-[9px] tracking-widest uppercase text-white/60 pointer-events-none">
              Shader
            </div>
            <div className="absolute bottom-3 right-4 font-mono text-[9px] tracking-widest uppercase text-white/60 pointer-events-none">
              Original
            </div>
          </>
        )}

        {/* Zoom indicator */}
        {hasImage && state.zoom > 1 && (
          <div className="absolute top-4 left-4 bg-neutral-900/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-neutral-700/50 font-mono text-[10px] text-neutral-400 tracking-wider pointer-events-none">
            <span ref={zoomRef}>{state.zoom.toFixed(1)}x</span>
          </div>
        )}
      </div>

      {hasImage && (
        <div className="absolute bottom-5 left-0 right-0 flex justify-center gap-5 text-[10.5px] text-neutral-600 tracking-wider uppercase">
          <span>
            <b className="text-neutral-500 font-medium">
              {state.imgW}&times;{state.imgH}
            </b>{" "}
            source
            {imageSizeBytes > 0 && (
              <span className="text-neutral-700 ml-1">({formatSize(imageSizeBytes)})</span>
            )}
          </span>
          <span>
            <b className="text-neutral-500 font-medium">
              {state.gridW}&times;{state.gridH}
            </b>{" "}
            shader
            {shaderSizeBytes > 0 && (
              <span className="text-neutral-700 ml-1">({formatSize(shaderSizeBytes)})</span>
            )}
          </span>
          <span>
            <b ref={fpsRef} className="text-neutral-500 font-medium">
              --
            </b>
          </span>
        </div>
      )}
    </main>
  );
}
