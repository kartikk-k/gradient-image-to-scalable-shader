"use client";

import { useEffect, useRef, useCallback } from "react";
import { createGLEngine, type GLEngine, type GradientState } from "@/lib/gl-engine";

export default function Viewport({
  state,
  viewSize,
  engineRef,
  bgColors,
  onEngineReady,
  onZoomPan,
  onSplitChange,
}: {
  state: GradientState;
  viewSize: "fit" | "fill";
  engineRef: React.RefObject<GLEngine | null>;
  bgColors: string[];
  onEngineReady: (engine: GLEngine) => void;
  onZoomPan: (patch: { zoom?: number; panX?: number; panY?: number }) => void;
  onSplitChange: (split: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dividerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef<"pan" | "split" | false>(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const hasImage = !!state.img;

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    const engine = createGLEngine(canvasRef.current, containerRef.current);
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

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const es = engineRef.current?.state;
      if (!es) return;
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.min(20, Math.max(1, es.zoom * delta));
      onZoomPan(newZoom <= 1 ? { zoom: 1, panX: 0, panY: 0 } : { zoom: newZoom });
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [engineRef, onZoomPan]);

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

  const startSplitDrag = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    isDragging.current = "split";
    const isTouch = "touches" in e;

    const onMove = (ev: MouseEvent | TouchEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const clientX = "touches" in ev ? ev.touches[0].clientX : (ev as MouseEvent).clientX;
      const ratio = Math.max(0.05, Math.min(0.95, (clientX - rect.left) / rect.width));
      if (dividerRef.current) {
        dividerRef.current.style.left = `${ratio * 100}%`;
      }
      onSplitChange(ratio);
    };
    const onEnd = () => {
      isDragging.current = false;
      if (isTouch) {
        window.removeEventListener("touchmove", onMove);
        window.removeEventListener("touchend", onEnd);
      } else {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onEnd);
      }
    };

    if (isTouch) {
      window.addEventListener("touchmove", onMove, { passive: false });
      window.addEventListener("touchend", onEnd);
    } else {
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onEnd);
    }
  }, [onSplitChange]);

  const splitPct = `${state.compareSplit * 100}%`;
  const aspect = hasImage ? state.imgW / state.imgH : 16 / 10;
  const isFill = viewSize === "fill";

  const containerStyle: React.CSSProperties = isFill
    ? { position: "absolute" as const, inset: 0 }
    : { aspectRatio: `${aspect}`, maxWidth: "min(90%, 1000px)", maxHeight: "80vh" };

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
      <div
        ref={containerRef}
        className={`relative touch-none overflow-hidden ${isFill ? "" : "rounded-xl mx-auto"}`}
        style={{ ...containerStyle, cursor: hasImage && state.zoom > 1 ? "grab" : "default" }}
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

        {hasImage && state.mode === "compare" && (
          <div
            ref={dividerRef}
            role="separator"
            aria-orientation="vertical"
            aria-valuenow={Math.round(state.compareSplit * 100)}
            tabIndex={0}
            className="absolute top-0 bottom-0 z-10 -translate-x-1/2 outline-none"
            style={{ left: splitPct, width: "32px", cursor: "col-resize" }}
            onMouseDown={startSplitDrag}
            onTouchStart={startSplitDrag}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") { e.preventDefault(); onSplitChange(Math.max(0.05, state.compareSplit - 0.02)); }
              if (e.key === "ArrowRight") { e.preventDefault(); onSplitChange(Math.min(0.95, state.compareSplit + 0.02)); }
            }}
          >
            <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-white/50" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-8 rounded-full bg-white/90 shadow-lg flex items-center justify-center gap-px">
              <div className="w-px h-3 bg-black/20" />
              <div className="w-px h-3 bg-black/20" />
            </div>
          </div>
        )}
      </div>

      {hasImage && state.zoom > 1 && (
        <div aria-hidden="true" className="absolute top-4 left-4 bg-black backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] text-white/70 pointer-events-none">
          {state.zoom.toFixed(1)}x
        </div>
      )}
    </div>
  );
}
