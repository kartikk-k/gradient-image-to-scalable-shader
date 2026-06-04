"use client";

import { useEffect, useRef } from "react";

const VERT = `attribute vec2 aPos;
varying vec2 vUv;
void main(){
  vUv = aPos * 0.5 + 0.5;
  vUv.y = 1.0 - vUv.y;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;   // load the baked gradient texture into this sampler
uniform vec2  uTexSize;   // grid resolution in texels (set to your texture size)
uniform float uTime;      // seconds
uniform float uFlow;      // 0.35 suggested  (0 = static)
uniform float uSpeed;     // 0.30 suggested
uniform float uScale;     // 2.5 suggested
uniform float uQuality;   // 0.70 suggested  (0 = bilinear, 1 = bicubic + dither)
uniform float uNoise;      // 0.030 suggested  (0 = none, static grain)
uniform float uNoiseScale;  // 1.0 suggested  (grain size in px)
uniform float uAnimMode;    // 0 (0=none,1=organic,2=hwave,3=vwave,4=pulse,5=swirl,6=breathe,7=drift,8=liquid,9=ripple,10=glitch)

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
    img.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHAAAABJCAYAAADllaIuAAAQAElEQVR4AYzdu4t1WdHH8f1rL6P/h3cEQTAxMDIzMzM2NDY2NjYQRMUbioIgCIKBgYKIGAiCIIqi4g019TqO592ftft3TvV+To/vpr9dl7VWVa2q3udpZ8aZh09+8pOXT33qU5dPf/rTl89+9rOXz33uc4vPf/7zl/KFL3zhUr74xS9e8KUvfeny5S9/+fKVr3zl8tWvfvXyta997fL1r3/98o1vfOPyzW9+8/Ktb33r8u1vf/vyne985/Ld73738v3vf//ygx/84PKjH/3o8uMf//jyk5/85PLTn/708rOf/ezyi1/84vLLX/7y8utf//ry29/+9vK73/3u8oc//OHypz/9afHnP//58pe//OVC/vWvf106G3z2/fGPf7z8/ve/X2d/85vfXH71q19dfv7zn68c8v3whz+8fO9731s1qVHdn/nMZy6f+MQnLh//+McvH/vYxy4f/ehHLx/5yEcuH/7why8f+tCHLh/84AcvH/jABy7vf//7L+973/su733vey/vec97Lu9+97sv73rXuy7vfOc7L+94xzsub3/72y9ve9vbLm9961svb3nLWxZvfvObl3zTm950oYP+atgDeyqr167kx8O//vWv7eWXX97+/e9/b//5z38Wr7zyyvbf//53u1wuV7b9SbJ/37bkkNa3/SHhDJwvYoqPqU+bH85U0sUq4idZ9ewp11eSVctrXvOa7eHh4Upt8rWvfe32ute9bnv961+/eOmll7Y3vOENT3jjG9/4xO4esmdJsSBuad7kqCXJtTZKctjVkxftJOse9kBMsrg7PbndPznOPBjceYia10Y6XDRToEnXKu1xHmIUAwObhNy1K50rfNUrxZdr1kBPch2gBmh0afNJgzQYdJBT52Oje3uu8QxPjpIczUyyeZJcB5KE6wlJruvzLnS4owPJbd/ZZx/WG2iAmjnRsHMDHRAIEoCPLNb4nJ+IVQwPbFJeOtigQwwxz8jBJ29yXDQ5ZBtLarqGGwIMhYQhwdBAP2M/n/0QjxSzJHnyw5Nkm09y2GpG1+jJscaX5MlgrcOau5DgS0LdHv75z39uBjilBkIDoYkOtWH0Ikr1e+t8zpNizbj0/4UzEAPiyDclXR1JVgOSQ7o02mjNR4dSaXjFsOhksa8Ynhho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";

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
      const t = 0;
      gl.uniform1i(U.tex, 0);
      gl.uniform2f(U.texSize, 112, 73);
      gl.uniform1f(U.time, t);
      gl.uniform1f(U.flow, 0.35);
      gl.uniform1f(U.speed, 0.3);
      gl.uniform1f(U.scale, 2.5);
      gl.uniform1f(U.quality, 0.7);
      gl.uniform1f(U.noise, 0.03);
      gl.uniform1f(U.noiseScale, 1);
      gl.uniform1f(U.animMode, 0);
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
