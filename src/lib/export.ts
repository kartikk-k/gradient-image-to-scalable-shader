import type { GradientState } from "./gl-engine";

export function buildFragExport(state: GradientState): string {
  return `precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;   // load the baked gradient texture into this sampler
uniform vec2  uTexSize;   // grid resolution in texels (set to your texture size)
uniform float uTime;      // seconds
uniform float uFlow;      // ${state.flow.toFixed(2)} suggested  (0 = static)
uniform float uSpeed;     // ${state.speed.toFixed(2)} suggested
uniform float uScale;     // ${state.scale.toFixed(1)} suggested
uniform float uQuality;   // ${state.quality.toFixed(2)} suggested  (0 = bilinear, 1 = bicubic + dither)
uniform float uNoise;      // ${state.noise.toFixed(3)} suggested  (0 = none, static grain)
uniform float uNoiseScale;  // ${state.noiseScale.toFixed(1)} suggested  (grain size in px)
uniform float uAnimMode;    // ${state.animMode} (0=none,1=organic,2=hwave,3=vwave,4=pulse,5=swirl,6=breathe,7=drift,8=liquid,9=ripple,10=glitch)

vec4 cubicWeights(float v){
  vec4 n = vec4(1.0, 2.0, 3.0, 4.0) - v;
  vec4 s = n * n * n;
  float x = s.x;
  float y = s.y - 4.0 * s.x;
  float z = s.z - 4.0 * s.y + 6.0 * s.x;
  float w = 6.0 - x - y - z;
  return vec4(x, y, z, w) * (1.0 / 6.0);
}

vec3 textureBicubic(sampler2D tex, vec2 uv, vec2 texSize){
  vec2 invSize = 1.0 / texSize;
  uv = uv * texSize - 0.5;
  vec2 f = fract(uv);
  uv -= f;
  vec4 xw = cubicWeights(f.x);
  vec4 yw = cubicWeights(f.y);
  vec4 c  = uv.xxyy + vec2(-0.5, 1.5).xyxy;
  vec4 s  = vec4(xw.xz + xw.yw, yw.xz + yw.yw);
  vec4 o  = c + vec4(xw.yw, yw.yw) / s;
  o *= invSize.xxyy;
  vec3 s0 = texture2D(tex, o.xz).rgb;
  vec3 s1 = texture2D(tex, o.yz).rgb;
  vec3 s2 = texture2D(tex, o.xw).rgb;
  vec3 s3 = texture2D(tex, o.yw).rgb;
  float sx = s.x / (s.x + s.y);
  float sy = s.z / (s.z + s.w);
  return mix(mix(s3, s2, sx), mix(s1, s0, sx), sy);
}

float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

vec2 warpOrganic(vec2 uv, float t){
  vec2 p = uv * uScale;
  vec2 d;
  d.x = sin(p.y + t) + 0.5 * cos(p.x * 1.3 - t * 0.8);
  d.y = cos(p.x + t * 0.9) + 0.5 * sin(p.y * 1.3 + t * 0.7);
  d.x += 0.35 * sin(p.y * 2.1 - t * 1.3);
  d.y += 0.35 * cos(p.x * 2.1 + t * 1.1);
  return uv + d * uFlow * 0.06;
}
vec2 warpHWave(vec2 uv, float t){
  float phase = uv.x * uScale * 2.0 + t;
  float wave = sin(phase) * 0.5 + sin(phase * 0.6 + 1.3) * 0.3;
  return uv + vec2(0.0, wave * uFlow * 0.08);
}
vec2 warpVWave(vec2 uv, float t){
  float phase = uv.y * uScale * 2.0 + t;
  float wave = sin(phase) * 0.5 + sin(phase * 0.7 + 2.0) * 0.3;
  return uv + vec2(wave * uFlow * 0.08, 0.0);
}
vec2 warpPulse(vec2 uv, float t){
  vec2 c = uv - 0.5;
  float r = length(c);
  float wave = sin(r * uScale * 8.0 - t * 2.0) * uFlow * 0.05;
  return uv + normalize(c + 0.001) * wave;
}
vec2 warpSwirl(vec2 uv, float t){
  vec2 c = uv - 0.5;
  float r = length(c);
  float angle = r * uScale * 3.0 * uFlow * sin(t * 0.5);
  float cs = cos(angle), sn = sin(angle);
  return vec2(c.x * cs - c.y * sn, c.x * sn + c.y * cs) + 0.5;
}
vec2 warpBreathe(vec2 uv, float t){
  vec2 c = uv - 0.5;
  float s = 1.0 + sin(t) * uFlow * 0.1;
  return c * s + 0.5;
}
vec2 warpDrift(vec2 uv, float t){
  vec2 d;
  d.x = sin(t * 0.3) * 0.7 + cos(t * 0.17) * 0.3;
  d.y = cos(t * 0.23) * 0.6 + sin(t * 0.31) * 0.4;
  return uv + d * uFlow * 0.04;
}
vec2 warpLiquid(vec2 uv, float t){
  vec2 p = uv * uScale;
  vec2 d;
  d.x = sin(p.y * 1.7 + t) + sin(p.x * 2.3 - t * 1.4) * 0.5 + sin(p.y * 3.1 + t * 0.7) * 0.25;
  d.y = cos(p.x * 1.9 + t * 1.1) + cos(p.y * 2.7 - t * 0.9) * 0.5 + cos(p.x * 3.3 + t * 1.3) * 0.25;
  return uv + d * uFlow * 0.04;
}
vec2 warpRipple(vec2 uv, float t){
  vec2 c = uv - 0.5;
  float r = length(c);
  float wave = sin(r * uScale * 12.0 - t * 3.0) * exp(-r * 2.0);
  return uv + c * wave * uFlow * 0.15;
}
vec2 warpGlitch(vec2 uv, float t){
  float band = floor(uv.y * uScale * 4.0);
  float shift = hash(vec2(band, floor(t * 2.0))) * 2.0 - 1.0;
  float active = step(0.7, hash(vec2(band + 100.0, floor(t * 3.0))));
  return uv + vec2(shift * uFlow * 0.08 * active, 0.0);
}
vec2 warp(vec2 uv, float t){
  if(uAnimMode < 0.5) return uv;
  if(uAnimMode < 1.5) return warpOrganic(uv, t);
  if(uAnimMode < 2.5) return warpHWave(uv, t);
  if(uAnimMode < 3.5) return warpVWave(uv, t);
  if(uAnimMode < 4.5) return warpPulse(uv, t);
  if(uAnimMode < 5.5) return warpSwirl(uv, t);
  if(uAnimMode < 6.5) return warpBreathe(uv, t);
  if(uAnimMode < 7.5) return warpDrift(uv, t);
  if(uAnimMode < 8.5) return warpLiquid(uv, t);
  if(uAnimMode < 9.5) return warpRipple(uv, t);
  return warpGlitch(uv, t);
}

void main(){
  float t = uTime * uSpeed;
  vec2 uv = warp(vUv, t);
  vec3 bilinear = texture2D(uTex, uv).rgb;
  vec3 bicubic  = textureBicubic(uTex, uv, uTexSize);
  vec3 col = mix(bilinear, bicubic, uQuality);
  vec2 dp = gl_FragCoord.xy + t * 60.0;
  float d = hash(dp) + hash(dp + 7.31) - 1.0;
  col += d * (uQuality / 255.0);
  if(uNoise > 0.0){
    vec2 np = floor(gl_FragCoord.xy / uNoiseScale);
    float n = hash(np) * 2.0 - 1.0;
    col += n * uNoise;
  }
  gl_FragColor = vec4(col, 1.0);
}`;
}

export function buildVertExport(): string {
  return `attribute vec2 aPos;
varying vec2 vUv;
void main(){
  vUv = aPos * 0.5 + 0.5;
  vUv.y = 1.0 - vUv.y;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;
}

export function buildUsageExport(state: GradientState): string {
  return `HOW IT WORKS
------------
1. Your gradient is sampled down to a ${state.gridW}x${state.gridH} grid of colors.
2. That grid is uploaded to the GPU as a small texture.
3. The fragment shader reconstructs the gradient PER OUTPUT PIXEL as a
   continuous surface, then warps the read coordinates over time so it flows.

WHY IT BEATS THE ORIGINAL IMAGE
-------------------------------
- Resolution independent: the source is a fixed pixel grid -- zoom in and you
  hit pixels / JPEG blocks. The shader evaluates a math surface at whatever
  resolution it is drawn, so it stays razor sharp at 4K, on retina, or zoomed.
- Bicubic reconstruction (uQuality): bilinear joins grid points with straight
  facets; bicubic B-spline joins them with smooth curves -- no faceting, no
  Mach banding. Closer to the "true" gradient than the stored pixels were.
- Dithering: a fixed image is locked to 8-bit, so smooth ramps band. The
  ~1-LSB triangular noise before the framebuffer quantizes,
  giving a perceptually higher bit-depth, band-free result.
- Animatable: a static image can't move; the warp makes it breathe.

WHAT YOU NEED
-------------
- The vertex + fragment shaders (other tabs).
- A fullscreen quad: vertices [-1,-1, 1,-1, -1,1, 1,1] as TRIANGLE_STRIP.
- The baked texture (in the standalone HTML it is embedded as a base64 PNG,
  ${state.gridW}x${state.gridH}, only a few KB) and its size in uTexSize.

UNIFORMS
--------
uTex      sampler2D   the baked gradient grid
uTexSize  vec2        grid size in texels -- REQUIRED for bicubic (${state.gridW}, ${state.gridH})
uTime     float       elapsed seconds
uFlow     float       ${state.flow.toFixed(2)}   distortion strength (0 = perfectly static)
uSpeed    float       ${state.speed.toFixed(2)}   animation speed
uScale    float       ${state.scale.toFixed(1)}    warp detail scale
uQuality  float       ${state.quality.toFixed(2)}   0 = bilinear, 1 = bicubic + dither
uNoise    float       ${state.noise.toFixed(3)}  static grain intensity (0 = none)
uNoiseScale float     ${state.noiseScale.toFixed(1)}    grain size in pixels
uAnimMode float       ${state.animMode}      animation type (0=none,1=organic,2=hwave,3=vwave,4=pulse,5=swirl,6=breathe,7=drift,8=liquid,9=ripple,10=glitch)

TIP
---
uQuality = 1 gives a static gradient that is sharper and smoother
than your source at any size. "Copy standalone HTML" gives you a single
working file with all of this wired up and your gradient baked in.`;
}

export function buildStandalone(state: GradientState): string {
  const frag = buildFragExport(state);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Animated gradient shader</title>
<style>html,body{margin:0;height:100%;background:#000}canvas{display:block;width:100vw;height:100vh}</style>
</head><body><canvas id="c"></canvas><script>
const cv=document.getElementById('c'),gl=cv.getContext('webgl');
function fit(){const d=Math.min(devicePixelRatio||1,2);cv.width=innerWidth*d;cv.height=innerHeight*d;gl.viewport(0,0,cv.width,cv.height);}
addEventListener('resize',fit);fit();
const V=\`${buildVertExport()}\`;
const F=\`${frag}\`;
function sh(t,s){const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);return o;}
const p=gl.createProgram();gl.attachShader(p,sh(gl.VERTEX_SHADER,V));gl.attachShader(p,sh(gl.FRAGMENT_SHADER,F));gl.linkProgram(p);gl.useProgram(p);
const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
const a=gl.getAttribLocation(p,'aPos');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
const tx=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tx);
gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,255]));
const im=new Image();im.onload=()=>{gl.bindTexture(gl.TEXTURE_2D,tx);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,im);};
im.src="${state.dataURL}";
const uT=gl.getUniformLocation(p,'uTime'),uF=gl.getUniformLocation(p,'uFlow'),uS=gl.getUniformLocation(p,'uSpeed'),uC=gl.getUniformLocation(p,'uScale'),uTex=gl.getUniformLocation(p,'uTex'),uTS=gl.getUniformLocation(p,'uTexSize'),uQ=gl.getUniformLocation(p,'uQuality'),uN=gl.getUniformLocation(p,'uNoise'),uNS=gl.getUniformLocation(p,'uNoiseScale'),uAM=gl.getUniformLocation(p,'uAnimMode');
const t0=performance.now();
(function loop(n){requestAnimationFrame(loop);gl.uniform1i(uTex,0);gl.uniform2f(uTS,${state.gridW},${state.gridH});gl.uniform1f(uT,${state.animMode > 0 ? "(n-t0)/1000" : "0"});gl.uniform1f(uF,${state.flow});gl.uniform1f(uS,${state.speed});gl.uniform1f(uC,${state.scale});gl.uniform1f(uQ,${state.quality});gl.uniform1f(uN,${state.noise});gl.uniform1f(uNS,${state.noiseScale});gl.uniform1f(uAM,${state.animMode});gl.drawArrays(gl.TRIANGLE_STRIP,0,4);})(t0);
<\/script></body></html>`;
}

export function buildReactComponent(state: GradientState): string {
  const frag = buildFragExport(state);
  const vert = buildVertExport();
  return `"use client";

import { useEffect, useRef } from "react";

const VERT = \`${vert}\`;

const FRAG = \`${frag}\`;

function compileShader(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
    console.error(gl.getShaderInfoLog(s));
  return s;
}

export default function GradientShader({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", { antialias: true })!;
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

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 255])
    );

    const img = new Image();
    img.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    };
    img.src = "${state.dataURL}";

    const U = {
      tex: gl.getUniformLocation(prog, "uTex"),
      texSize: gl.getUniformLocation(prog, "uTexSize"),
      time: gl.getUniformLocation(prog, "uTime"),
      flow: gl.getUniformLocation(prog, "uFlow"),
      speed: gl.getUniformLocation(prog, "uSpeed"),
      scale: gl.getUniformLocation(prog, "uScale"),
      quality: gl.getUniformLocation(prog, "uQuality"),
      noise: gl.getUniformLocation(prog, "uNoise"),
      noiseScale: gl.getUniformLocation(prog, "uNoiseScale"),
      animMode: gl.getUniformLocation(prog, "uAnimMode"),
    };

    function resize() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      canvas!.width = Math.round(canvas!.clientWidth * dpr);
      canvas!.height = Math.round(canvas!.clientHeight * dpr);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    }

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const t0 = performance.now();
    let animId: number;

    function frame(now: number) {
      animId = requestAnimationFrame(frame);
      const t = ${state.animMode > 0 ? "(now - t0) / 1000" : "0"};
      gl.uniform1i(U.tex, 0);
      gl.uniform2f(U.texSize, ${state.gridW}, ${state.gridH});
      gl.uniform1f(U.time, t);
      gl.uniform1f(U.flow, ${state.flow});
      gl.uniform1f(U.speed, ${state.speed});
      gl.uniform1f(U.scale, ${state.scale});
      gl.uniform1f(U.quality, ${state.quality});
      gl.uniform1f(U.noise, ${state.noise});
      gl.uniform1f(U.noiseScale, ${state.noiseScale});
      gl.uniform1f(U.animMode, ${state.animMode});
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    animId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animId);
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: "block", width: "100%", height: "100%", ...style }}
    />
  );
}
`;
}

export function highlightGlsl(code: string): string {
  return code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/(\/\/[^\n]*)/g, '<span class="text-neutral-500 italic">$1</span>')
    .replace(
      /\b(precision|highp|varying|uniform|attribute|void|vec2|vec3|vec4|float|sampler2D|return)\b/g,
      '<span class="text-neutral-400">$1</span>'
    )
    .replace(
      /\b(sin|cos|texture2D|gl_FragColor|gl_Position)\b/g,
      '<span class="text-neutral-300">$1</span>'
    );
}
