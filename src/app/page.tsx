"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { createDefaultState, type GLEngine, type GradientState } from "@/lib/gl-engine";
import { buildReactComponent } from "@/lib/export";
import defaultGradient from "@/assets/default-gradient.png";
import Viewport from "@/components/Viewport";
import Toolbar from "@/components/Toolbar";
import ControlPanel from "@/components/ControlPanel";
import { motion } from "framer-motion";

export default function Home() {
  const [state, setState] = useState<GradientState>(createDefaultState);
  const [copyReactLabel, setCopyReactLabel] = useState("Copy React code");
  const [bgColors, setBgColors] = useState<string[]>([]);
  const [showControls, setShowControls] = useState(true);
  const [viewSize, setViewSize] = useState<"fit" | "fill">("fit");
  const [imageSizeBytes, setImageSizeBytes] = useState(0);
  const engineRef = useRef<GLEngine | null>(null);

  const syncEngineState = useCallback(
    (patch: Partial<GradientState>) => {
      if (engineRef.current) {
        const es = engineRef.current.state;
        if (patch.res !== undefined) es.res = patch.res;
        if (patch.flow !== undefined) es.flow = patch.flow;
        if (patch.speed !== undefined) es.speed = patch.speed;
        if (patch.scale !== undefined) es.scale = patch.scale;
        if (patch.quality !== undefined) es.quality = patch.quality;
        if (patch.noise !== undefined) es.noise = patch.noise;
        if (patch.noiseScale !== undefined) es.noiseScale = patch.noiseScale;
        if (patch.effect !== undefined) es.effect = patch.effect;
        if (patch.effectScale !== undefined) es.effectScale = patch.effectScale;
        if (patch.animMode !== undefined) es.animMode = patch.animMode;
        if (patch.hueShift !== undefined) es.hueShift = patch.hueShift;
        if (patch.aspectOverride !== undefined) es.aspectOverride = patch.aspectOverride;

        if (patch.res !== undefined && es.mode !== "source") {
          engineRef.current.rebuildTexture();
          engineRef.current.bakeDataURL();
          patch = { ...patch, gridW: es.gridW, gridH: es.gridH, dataURL: es.dataURL };
        }

        engineRef.current.markDirty();
      }
      setState((prev) => ({ ...prev, ...patch }));
    },
    []
  );

  const loadImageFromSrc = useCallback((src: string) => {
    fetch(src).then((r) => r.blob()).then((b) => setImageSizeBytes(b.size)).catch(() => {});
    const img = new Image();
    img.onload = () => {
      if (engineRef.current) {
        const es = engineRef.current.state;
        es.img = img;
        es.imgW = img.naturalWidth;
        es.imgH = img.naturalHeight;
        es.mode = "shader";
        engineRef.current.rebuildTexture();
        engineRef.current.bakeDataURL();
        engineRef.current.uploadSourceFull();
        engineRef.current.resize();
        setBgColors(engineRef.current.sampleColors());

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
    img.onerror = () => {
      console.error("Failed to load image");
    };
    img.src = src;
  }, []);

  const handleFileLoad = useCallback((file: File) => {
    if (file.size > 50 * 1024 * 1024) {
      alert("File too large. Please use an image under 50 MB.");
      return;
    }
    setImageSizeBytes(file.size);
    const fr = new FileReader();
    fr.onload = (e) => loadImageFromSrc(e.target?.result as string);
    fr.readAsDataURL(file);
  }, [loadImageFromSrc]);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            handleFileLoad(file);
            return;
          }
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [handleFileLoad]);

  const ensureTexture = useCallback(() => {
    if (engineRef.current) {
      const es = engineRef.current.state;
      if (!es.dataURL) {
        engineRef.current.bakeDataURL();
      }
      setState((prev) => ({
        ...prev,
        gridW: es.gridW,
        gridH: es.gridH,
        dataURL: es.dataURL,
      }));
      return es;
    }
    return null;
  }, []);

  const handleCopyReact = useCallback(() => {
    const es = ensureTexture();
    if (!es) return;
    const code = buildReactComponent(es);
    navigator.clipboard.writeText(code).then(
      () => { setCopyReactLabel("Copied"); setTimeout(() => setCopyReactLabel("Copy React code"), 1500); },
      () => { setCopyReactLabel("Failed"); setTimeout(() => setCopyReactLabel("Copy React code"), 1500); }
    );
  }, [ensureTexture]);

  const handleModeChange = useCallback((mode: "shader" | "source" | "compare") => {
    if (engineRef.current) {
      const es = engineRef.current.state;
      es.mode = mode;
      if (mode === "source" || mode === "compare") engineRef.current.uploadSourceFull();
      if (mode === "shader" || mode === "compare") engineRef.current.rebuildTexture();
      engineRef.current.markDirty();
    }
    setState((prev) => ({ ...prev, mode }));
  }, []);

  const handleZoomPan = useCallback((patch: { zoom?: number; panX?: number; panY?: number }) => {
    if (engineRef.current) {
      const es = engineRef.current.state;
      if (patch.zoom !== undefined) es.zoom = patch.zoom;
      if (patch.panX !== undefined) es.panX = patch.panX;
      if (patch.panY !== undefined) es.panY = patch.panY;
      engineRef.current.markDirty();
    }
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleSplitChange = useCallback((split: number) => {
    if (engineRef.current) {
      engineRef.current.state.compareSplit = split;
      engineRef.current.markDirty();
    }
    setState((prev) => ({ ...prev, compareSplit: split }));
  }, []);

  const shaderSizeBytes = useMemo(() => {
    if (!state.dataURL) return 0;
    const base64 = state.dataURL.split(",")[1];
    if (!base64) return 0;
    return Math.round((base64.length * 3) / 4);
  }, [state.dataURL]);

  const handleEngineReady = useCallback((engine: GLEngine) => {
    engineRef.current = engine;
    loadImageFromSrc(defaultGradient.src);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      engine.state.animMode = 0;
    }
  }, [loadImageFromSrc]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="relative h-dvh overflow-hidden bg-black text-white text-[13px]">
        <Viewport
          state={state}
          viewSize={viewSize}
          engineRef={engineRef}
          bgColors={bgColors}
          onEngineReady={handleEngineReady}
          onZoomPan={handleZoomPan}
          onSplitChange={handleSplitChange}
        />
        <Toolbar
          state={state}
          viewSize={viewSize}
          onModeChange={handleModeChange}
          onViewSizeChange={setViewSize}
          onToggleControls={() => setShowControls((v) => !v)}
        />
        <ControlPanel
          state={state}
          visible={showControls}
          imageSizeBytes={imageSizeBytes}
          shaderSizeBytes={shaderSizeBytes}
          onStateChange={syncEngineState}
          onCopyReact={handleCopyReact}
          copyReactLabel={copyReactLabel}
          onFileLoad={handleFileLoad}
        />
        <a
          href="https://halodesign.io"
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-1 right-4 z-20 text-[10px] text-white/40 hover:text-white/50 transition-colors"
        >
          A halodesign.io product
        </a>
      </div>
    </motion.div>
  );
}
