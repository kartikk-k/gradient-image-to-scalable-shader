"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { createDefaultState, type GLEngine, type GradientState } from "@/lib/gl-engine";
import { buildStandalone } from "@/lib/export";
import Sidebar from "./Sidebar";
import Stage from "./Stage";
import ExportModal from "./ExportModal";

export default function GradientApp() {
  const [state, setState] = useState<GradientState>(createDefaultState);
  const [modalOpen, setModalOpen] = useState(false);
  const [copyLabel, setCopyLabel] = useState("Copy standalone HTML");
  const [imageSizeBytes, setImageSizeBytes] = useState(0);
  const engineRef = useRef<GLEngine | null>(null);

  const shaderSizeBytes = useMemo(() => {
    if (!state.dataURL) return 0;
    const base64 = state.dataURL.split(",")[1];
    if (!base64) return 0;
    return Math.round((base64.length * 3) / 4);
  }, [state.dataURL]);

  const syncEngineState = useCallback(
    (patch: Partial<GradientState>) => {
      setState((prev) => {
        const next = { ...prev, ...patch };
        if (engineRef.current) {
          const es = engineRef.current.state;
          if (patch.res !== undefined) es.res = patch.res;
          if (patch.flow !== undefined) es.flow = patch.flow;
          if (patch.speed !== undefined) es.speed = patch.speed;
          if (patch.scale !== undefined) es.scale = patch.scale;
          if (patch.quality !== undefined) es.quality = patch.quality;
          if (patch.noise !== undefined) es.noise = patch.noise;
          if (patch.noiseScale !== undefined) es.noiseScale = patch.noiseScale;
          if (patch.animate !== undefined) es.animate = patch.animate;

          if (patch.res !== undefined && es.mode !== "source") {
            engineRef.current.rebuildTexture();
            next.gridW = es.gridW;
            next.gridH = es.gridH;
            next.dataURL = es.dataURL;
          }
        }
        return next;
      });
    },
    []
  );

  const handleFileLoad = useCallback((file: File) => {
    setImageSizeBytes(file.size);
    const img = new Image();
    const fr = new FileReader();
    fr.onload = (e) => {
      img.onload = () => {
        if (engineRef.current) {
          const es = engineRef.current.state;
          es.img = img;
          es.imgW = img.naturalWidth;
          es.imgH = img.naturalHeight;
          es.mode = "shader";
          engineRef.current.rebuildTexture();
          engineRef.current.uploadSourceFull();
          engineRef.current.resize();

          setState((prev) => ({
            ...prev,
            img,
            imgW: img.naturalWidth,
            imgH: img.naturalHeight,
            mode: "shader",
            gridW: es.gridW,
            gridH: es.gridH,
            dataURL: es.dataURL,
          }));
        }
      };
      img.src = e.target?.result as string;
    };
    fr.readAsDataURL(file);
  }, []);

  const handleExport = useCallback(() => {
    if (engineRef.current) {
      const es = engineRef.current.state;
      if (es.mode === "source" || !es.dataURL) {
        engineRef.current.rebuildTexture();
      }
      setState((prev) => ({
        ...prev,
        gridW: es.gridW,
        gridH: es.gridH,
        dataURL: es.dataURL,
      }));
    }
    setModalOpen(true);
  }, []);

  const handleCopyHtml = useCallback(() => {
    if (engineRef.current) {
      const es = engineRef.current.state;
      if (!es.dataURL) engineRef.current.rebuildTexture();
      const html = buildStandalone(es);
      navigator.clipboard.writeText(html).then(
        () => {
          setCopyLabel("Copied");
          setTimeout(() => setCopyLabel("Copy standalone HTML"), 1500);
        },
        () => {
          setCopyLabel("Copy failed");
          setTimeout(() => setCopyLabel("Copy standalone HTML"), 1500);
        }
      );
    }
  }, []);

  const handleModeChange = useCallback((mode: "shader" | "source" | "compare") => {
    if (engineRef.current) {
      const es = engineRef.current.state;
      es.mode = mode;
      if (mode === "source" || mode === "compare") {
        engineRef.current.uploadSourceFull();
      }
      if (mode === "shader" || mode === "compare") {
        engineRef.current.rebuildTexture();
      }
    }
    setState((prev) => ({ ...prev, mode }));
  }, []);

  const handleZoomPan = useCallback((patch: { zoom?: number; panX?: number; panY?: number }) => {
    if (engineRef.current) {
      const es = engineRef.current.state;
      if (patch.zoom !== undefined) es.zoom = patch.zoom;
      if (patch.panX !== undefined) es.panX = patch.panX;
      if (patch.panY !== undefined) es.panY = patch.panY;
    }
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleSplitChange = useCallback((split: number) => {
    if (engineRef.current) {
      engineRef.current.state.compareSplit = split;
    }
    setState((prev) => ({ ...prev, compareSplit: split }));
  }, []);

  const handleEngineReady = useCallback((engine: GLEngine) => {
    engineRef.current = engine;
  }, []);

  return (
    <div className="grid grid-cols-[340px_1fr] h-screen overflow-hidden bg-black text-white font-mono text-[13px] leading-normal">
      <Sidebar
        state={state}
        hasImage={!!state.img}
        onFileLoad={handleFileLoad}
        onStateChange={syncEngineState}
        onExport={handleExport}
        onCopyHtml={handleCopyHtml}
        copyLabel={copyLabel}
      />
      <Stage
        state={state}
        engineRef={engineRef}
        onEngineReady={handleEngineReady}
        onModeChange={handleModeChange}
        onSplitChange={handleSplitChange}
        onZoomPan={handleZoomPan}
        imageSizeBytes={imageSizeBytes}
        shaderSizeBytes={shaderSizeBytes}
      />
      <ExportModal
        open={modalOpen}
        state={state}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
