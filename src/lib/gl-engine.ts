import { VERT, FRAG } from "./shaders";

export interface GradientState {
  img: HTMLImageElement | null;
  imgW: number;
  imgH: number;
  res: number;
  gridW: number;
  gridH: number;
  flow: number;
  speed: number;
  scale: number;
  animMode: number;
  quality: number;
  noise: number;
  noiseScale: number;
  zoom: number;
  panX: number;
  panY: number;
  hueShift: number;
  aspectOverride: string;
  compareSplit: number;
  mode: "shader" | "source" | "compare";
  dataURL: string | null;
}

export function createDefaultState(): GradientState {
  return {
    img: null,
    imgW: 0,
    imgH: 0,
    res: 102,
    gridW: 0,
    gridH: 0,
    flow: 0.35,
    speed: 0.3,
    scale: 2.5,
    animMode: 0,
    quality: 1.0,
    noise: 0,
    noiseScale: 1.0,
    zoom: 1,
    panX: 0,
    panY: 0,
    hueShift: 0,
    aspectOverride: "auto",
    compareSplit: 0.5,
    mode: "shader",
    dataURL: null,
  };
}

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  src: string
): WebGLShader {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(s));
  }
  return s;
}

export interface GLEngine {
  rebuildTexture: () => void;
  uploadSourceFull: () => void;
  resize: () => void;
  destroy: () => void;
  state: GradientState;
  getCurrentTexSize: () => [number, number];
  sampleColors: () => string[];
}

export function createGLEngine(
  canvas: HTMLCanvasElement,
  container: HTMLElement,
  onFps: (fps: number) => void
): GLEngine {
  const gl = canvas.getContext("webgl", {
    antialias: true,
    preserveDrawingBuffer: false,
  })!;

  const state = createDefaultState();
  let currentTexSize: [number, number] = [2, 2];

  const prog = gl.createProgram()!;
  gl.attachShader(prog, compileShader(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compileShader(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW
  );
  const aPos = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const U = {
    tex: gl.getUniformLocation(prog, "uTex"),
    texFull: gl.getUniformLocation(prog, "uTexFull"),
    texSize: gl.getUniformLocation(prog, "uTexSize"),
    time: gl.getUniformLocation(prog, "uTime"),
    flow: gl.getUniformLocation(prog, "uFlow"),
    speed: gl.getUniformLocation(prog, "uSpeed"),
    scale: gl.getUniformLocation(prog, "uScale"),
    quality: gl.getUniformLocation(prog, "uQuality"),
    noise: gl.getUniformLocation(prog, "uNoise"),
    noiseScale: gl.getUniformLocation(prog, "uNoiseScale"),
    zoom: gl.getUniformLocation(prog, "uZoom"),
    pan: gl.getUniformLocation(prog, "uPan"),
    mode: gl.getUniformLocation(prog, "uMode"),
    split: gl.getUniformLocation(prog, "uSplit"),
    animMode: gl.getUniformLocation(prog, "uAnimMode"),
    hueShift: gl.getUniformLocation(prog, "uHueShift"),
    resolution: gl.getUniformLocation(prog, "uResolution"),
  };

  // Shader sampled texture (small grid)
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  // Full-res source texture (for compare + source mode)
  const textureFull = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, textureFull);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const sampleCanvas = document.createElement("canvas");
  const sctx = sampleCanvas.getContext("2d", { willReadFrequently: true })!;

  function rebuildTexture() {
    if (!state.img) return;
    const aspect = state.imgW / state.imgH;
    let gw = state.res;
    let gh = Math.max(2, Math.round(state.res / aspect));
    if (aspect < 1) {
      gh = state.res;
      gw = Math.max(2, Math.round(state.res * aspect));
    }
    state.gridW = gw;
    state.gridH = gh;
    sampleCanvas.width = gw;
    sampleCanvas.height = gh;
    sctx.imageSmoothingEnabled = true;
    sctx.imageSmoothingQuality = "high";
    sctx.clearRect(0, 0, gw, gh);
    sctx.drawImage(state.img, 0, 0, gw, gh);

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      sampleCanvas
    );
    state.dataURL = sampleCanvas.toDataURL("image/png");
    currentTexSize = [gw, gh];
  }

  const fullTexCanvas = document.createElement("canvas");
  const fctx = fullTexCanvas.getContext("2d")!;

  function uploadSourceFull() {
    if (!state.img) return;
    fullTexCanvas.width = state.imgW;
    fullTexCanvas.height = state.imgH;
    fctx.drawImage(state.img, 0, 0);
    gl.bindTexture(gl.TEXTURE_2D, textureFull);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      fullTexCanvas
    );
  }

  function resize() {
    const r = container.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  }

  let lastT = performance.now();
  let frames = 0;
  let fpsT = 0;
  const t0 = performance.now();
  let animId: number;

  function frame(now: number) {
    animId = requestAnimationFrame(frame);
    if (!state.img) return;
    const time = (now - t0) / 1000;
    const modeVal = state.mode === "shader" ? 0 : state.mode === "source" ? 1 : 2;

    gl.useProgram(prog);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(U.tex, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, textureFull);
    gl.uniform1i(U.texFull, 1);

    const isAnimating = state.animMode > 0;
    gl.uniform2f(U.texSize, currentTexSize[0], currentTexSize[1]);
    gl.uniform1f(U.time, isAnimating ? time : 0);
    gl.uniform1f(U.flow, state.flow);
    gl.uniform1f(U.speed, state.speed);
    gl.uniform1f(U.scale, state.scale);
    gl.uniform1f(U.quality, state.quality);
    gl.uniform1f(U.noise, state.noise);
    gl.uniform1f(U.noiseScale, state.noiseScale);
    gl.uniform1f(U.zoom, state.zoom);
    gl.uniform2f(U.pan, state.panX, state.panY);
    gl.uniform1f(U.mode, modeVal);
    gl.uniform1f(U.split, state.compareSplit);
    gl.uniform1f(U.animMode, state.animMode);
    gl.uniform1f(U.hueShift, state.hueShift);
    gl.uniform2f(U.resolution, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    frames++;
    fpsT += now - lastT;
    lastT = now;
    if (fpsT > 500) {
      onFps(Math.round(frames / (fpsT / 1000)));
      frames = 0;
      fpsT = 0;
    }
  }
  animId = requestAnimationFrame(frame);

  function sampleColors(): string[] {
    const w = sampleCanvas.width;
    const h = sampleCanvas.height;
    if (w < 2 || h < 2) return ["#1a1a1a", "#1a1a1a", "#1a1a1a"];

    // Sample 5 points: corners + center, then darken for background use
    const points = [
      [0, 0], [w - 1, 0], [Math.floor(w / 2), Math.floor(h / 2)],
      [0, h - 1], [w - 1, h - 1],
    ];
    const colors: string[] = [];
    for (const [px, py] of points) {
      const d = sctx.getImageData(px, py, 1, 1).data;
      // Keep at ~50% brightness + boost floor so darks still have color
      const r = Math.round(d[0] * 0.5 + 15);
      const g = Math.round(d[1] * 0.5 + 15);
      const b = Math.round(d[2] * 0.5 + 15);
      colors.push(`rgb(${r},${g},${b})`);
    }
    return colors;
  }

  return {
    rebuildTexture,
    uploadSourceFull,
    resize,
    state,
    getCurrentTexSize: () => currentTexSize,
    sampleColors,
    destroy: () => cancelAnimationFrame(animId),
  };
}
