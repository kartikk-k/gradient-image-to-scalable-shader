"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { createDefaultState, type GLEngine, type GradientState } from "@/lib/gl-engine";
import { buildStandalone, buildReactComponent } from "@/lib/export";
import defaultGradient from "@/assets/default-gradient.png";
import Stage from "./Stage";

const DEFAULTS = createDefaultState();

export default function GradientApp() {
  const [state, setState] = useState<GradientState>(createDefaultState);
  const [copyReactLabel, setCopyReactLabel] = useState("Copy React code");
  const [copyHtmlLabel, setCopyHtmlLabel] = useState("Copy HTML");
  const [imageSizeBytes, setImageSizeBytes] = useState(0);
  const [bgColors, setBgColors] = useState<string[]>([]);
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
          if (patch.animMode !== undefined) es.animMode = patch.animMode;
          if (patch.hueShift !== undefined) es.hueShift = patch.hueShift;
          if (patch.aspectOverride !== undefined) es.aspectOverride = patch.aspectOverride;

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

  const loadImageFromSrc = useCallback((src: string, fileSize: number) => {
    setImageSizeBytes(fileSize);
    const img = new Image();
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
    img.src = src;
  }, []);

  const handleFileLoad = useCallback((file: File) => {
    const fr = new FileReader();
    fr.onload = (e) => loadImageFromSrc(e.target?.result as string, file.size);
    fr.readAsDataURL(file);
  }, [loadImageFromSrc]);

  function ensureTexture() {
    if (engineRef.current) {
      const es = engineRef.current.state;
      if (!es.dataURL) engineRef.current.rebuildTexture();
      setState((prev) => ({
        ...prev,
        gridW: es.gridW,
        gridH: es.gridH,
        dataURL: es.dataURL,
      }));
      return es;
    }
    return null;
  }

  const handleCopyReact = useCallback(() => {
    const es = ensureTexture();
    if (!es) return;
    const code = buildReactComponent(es);
    navigator.clipboard.writeText(code).then(
      () => { setCopyReactLabel("Copied"); setTimeout(() => setCopyReactLabel("Copy React code"), 1500); },
      () => { setCopyReactLabel("Failed"); setTimeout(() => setCopyReactLabel("Copy React code"), 1500); }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCopyHtml = useCallback(() => {
    const es = ensureTexture();
    if (!es) return;
    const html = buildStandalone(es);
    navigator.clipboard.writeText(html).then(
      () => { setCopyHtmlLabel("Copied"); setTimeout(() => setCopyHtmlLabel("Copy HTML"), 1500); },
      () => { setCopyHtmlLabel("Failed"); setTimeout(() => setCopyHtmlLabel("Copy HTML"), 1500); }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleModeChange = useCallback((mode: "shader" | "source" | "compare") => {
    if (engineRef.current) {
      const es = engineRef.current.state;
      es.mode = mode;
      if (mode === "source" || mode === "compare") engineRef.current.uploadSourceFull();
      if (mode === "shader" || mode === "compare") engineRef.current.rebuildTexture();
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
    if (engineRef.current) engineRef.current.state.compareSplit = split;
    setState((prev) => ({ ...prev, compareSplit: split }));
  }, []);

  const handleEngineReady = useCallback((engine: GLEngine) => {
    engineRef.current = engine;
    // Load default gradient immediately
    loadImageFromSrc(defaultGradient.src, 0);
  }, [loadImageFromSrc]);

  return (
    <div className="relative h-dvh overflow-hidden bg-black text-white text-[13px]">
      <Stage
        state={state}
        defaults={DEFAULTS}
        engineRef={engineRef}
        onEngineReady={handleEngineReady}
        onModeChange={handleModeChange}
        onSplitChange={handleSplitChange}
        onZoomPan={handleZoomPan}
        onStateChange={syncEngineState}
        onFileLoad={handleFileLoad}
        onCopyReact={handleCopyReact}
        onCopyHtml={handleCopyHtml}
        copyReactLabel={copyReactLabel}
        copyHtmlLabel={copyHtmlLabel}
        imageSizeBytes={imageSizeBytes}
        shaderSizeBytes={shaderSizeBytes}
        bgColors={bgColors}
      />
    </div>
  );
}
