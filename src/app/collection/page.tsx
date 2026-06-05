"use client";

import { useState } from "react";
import { COLLECTION, type CollectionItem } from "@/lib/collection";
import { buildReactComponent } from "@/lib/export";
import type { GradientState } from "@/lib/gl-engine";
import ShaderPreview, { renderToDataURL } from "@/components/ShaderPreview";
import LiveShaderView from "@/components/LiveShaderView";

function toGradientState(item: CollectionItem): GradientState {
  return {
    img: null,
    imgW: item.gridW,
    imgH: item.gridH,
    res: Math.max(item.gridW, item.gridH),
    gridW: item.gridW,
    gridH: item.gridH,
    flow: item.flow,
    speed: item.speed,
    scale: item.scale,
    animMode: item.animMode,
    quality: item.quality,
    noise: item.noise,
    noiseScale: item.noiseScale,
    zoom: 1,
    panX: 0,
    panY: 0,
    hueShift: item.hueShift,
    aspectOverride: "auto",
    compareSplit: 0.5,
    mode: "shader",
    dataURL: item.dataURL,
  };
}

export default function CollectionPage() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [focusItem, setFocusItem] = useState<CollectionItem | null>(null);

  const handleCopyCode = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const item = COLLECTION.find((c) => c.id === id);
    if (!item) return;
    const code = buildReactComponent(toGradientState(item));
    navigator.clipboard.writeText(code).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  const handleDownload = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const item = COLLECTION.find((c) => c.id === id);
    if (!item) return;
    const w = 2048;
    const h = Math.round(w * (item.gridH / item.gridW));
    renderToDataURL(item, w, h).then((url) => {
      if (!url) return;
      const a = document.createElement("a");
      a.href = url;
      a.download = `gradient-${id}.png`;
      a.click();
    });
  };

  return (
    <div
      className="h-screen overflow-auto"
      style={{
        background:
          "radial-gradient(80% 80% at 15% 15%, rgb(136, 136, 136), transparent 70%), radial-gradient(80% 80% at 85% 15%, rgb(103, 103, 103), transparent 70%), radial-gradient(90% 90%, rgb(51, 46, 43), transparent 80%), radial-gradient(80% 80% at 15% 85%, rgb(94, 94, 94), transparent 70%), radial-gradient(80% 80% at 85% 85%, rgb(86, 86, 86), transparent 70%), rgb(51, 46, 43)",
      }}
    >
      {/* Top bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="text-[11px] text-white/50 hover:text-white/80 transition-colors bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full"
          >
            ← Tool
          </a>
          <h1 className="text-sm font-medium text-white/80">Collection</h1>
          <span className="text-[11px] text-white/30">{COLLECTION.length} gradients</span>
        </div>
        <a
          href="https://halodesign.io"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-white/30 hover:text-white/50 transition-colors"
        >
          A halodesign.io product
        </a>
      </div>

      {/* Masonry layout */}
      <div className="px-6 pb-12 columns-2 sm:columns-3 lg:columns-5 gap-4">
        {COLLECTION.map((item) => (
          <div
            key={item.id}
            className="group relative rounded-2xl overflow-hidden mb-4 break-inside-avoid cursor-pointer"
            style={{ aspectRatio: `${item.gridW} / ${item.gridH}` }}
            onClick={() => setFocusItem(item)}
          >
            <ShaderPreview item={item} />

            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-end justify-end gap-2 p-3 opacity-0 group-hover:opacity-100 transition-all">
              <button
                className="px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-[11px] text-white cursor-pointer hover:bg-white/30 transition-colors"
                onClick={(e) => handleDownload(e, item.id)}
              >
                Download
              </button>
              <button
                className="px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-[11px] text-white cursor-pointer hover:bg-white/30 transition-colors"
                onClick={(e) => handleCopyCode(e, item.id)}
              >
                {copiedId === item.id ? "Copied" : "Copy React code"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Focus overlay */}
      {focusItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setFocusItem(null)}
        >
          {/* Close button */}
          <button
            className="absolute top-4 right-4 z-10 size-9 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
            onClick={() => setFocusItem(null)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          {/* Actions */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex gap-2">
            <button
              className="px-4 py-2 rounded-full bg-white/20 backdrop-blur-md text-xs text-white cursor-pointer hover:bg-white/30 transition-colors"
              onClick={(e) => { e.stopPropagation(); handleDownload(e, focusItem.id); }}
            >
              Download
            </button>
            <button
              className="px-4 py-2 rounded-full bg-white/20 backdrop-blur-md text-xs text-white cursor-pointer hover:bg-white/30 transition-colors"
              onClick={(e) => { e.stopPropagation(); handleCopyCode(e, focusItem.id); }}
            >
              {copiedId === focusItem.id ? "Copied" : "Copy React code"}
            </button>
          </div>

          {/* Shader canvas — fit mode */}
          <div
            className="relative rounded-xl overflow-hidden mx-auto"
            style={{
              aspectRatio: `${focusItem.gridW} / ${focusItem.gridH}`,
              maxWidth: "min(90%, 1000px)",
              maxHeight: "80vh",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <LiveShaderView item={focusItem} />
          </div>
        </div>
      )}
    </div>
  );
}
