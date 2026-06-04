export const VERT = `attribute vec2 aPos;
varying vec2 vUv;
uniform float uZoom;
uniform vec2  uPan;
void main(){
  vUv = aPos * 0.5 + 0.5;
  vUv.y = 1.0 - vUv.y;
  vUv = (vUv - 0.5) / uZoom + 0.5 - uPan;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

export const FRAG = `precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform sampler2D uTexFull;
uniform vec2  uTexSize;
uniform float uTime;
uniform float uFlow;
uniform float uSpeed;
uniform float uScale;
uniform float uQuality;
uniform float uNoise;
uniform float uNoiseScale;
uniform float uMode;        // 0 = shader, 1 = source, 2 = compare
uniform float uSplit;
uniform float uAnimMode;    // 0 = none, 1..10 = animation types
uniform float uHueShift;    // hue rotation in radians
uniform vec2  uResolution;

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

vec3 hueRotate(vec3 c, float angle){
  float co = cos(angle), si = sin(angle);
  vec3 w = vec3(0.299, 0.587, 0.114);
  vec3 r = vec3(
    co + (1.0 - co) * w.x,
    (1.0 - co) * w.x * w.y - si * w.z,
    (1.0 - co) * w.x * w.z + si * w.y
  );
  vec3 g = vec3(
    (1.0 - co) * w.x * w.y + si * w.z,
    co + (1.0 - co) * w.y,
    (1.0 - co) * w.y * w.z - si * w.x
  );
  vec3 b = vec3(
    (1.0 - co) * w.x * w.z - si * w.y,
    (1.0 - co) * w.y * w.z + si * w.x,
    co + (1.0 - co) * w.z
  );
  return vec3(dot(c, r), dot(c, g), dot(c, b));
}

// --- Animation modes ---
// Each returns a warped UV. All use uFlow as intensity, uScale as detail.

// 1: Organic flow (original) — multi-octave sinusoidal domain warp
vec2 warpOrganic(vec2 uv, float t){
  vec2 p = uv * uScale;
  vec2 d;
  d.x = sin(p.y + t) + 0.5 * cos(p.x * 1.3 - t * 0.8);
  d.y = cos(p.x + t * 0.9) + 0.5 * sin(p.y * 1.3 + t * 0.7);
  d.x += 0.35 * sin(p.y * 2.1 - t * 1.3);
  d.y += 0.35 * cos(p.x * 2.1 + t * 1.1);
  return uv + d * uFlow * 0.06;
}

// 2: Horizontal wave — wave sweeps left to right with vertical delay
vec2 warpHWave(vec2 uv, float t){
  float phase = uv.x * uScale * 2.0 + t;
  float wave = sin(phase) * 0.5 + sin(phase * 0.6 + 1.3) * 0.3;
  return uv + vec2(0.0, wave * uFlow * 0.08);
}

// 3: Vertical wave — wave sweeps top to bottom
vec2 warpVWave(vec2 uv, float t){
  float phase = uv.y * uScale * 2.0 + t;
  float wave = sin(phase) * 0.5 + sin(phase * 0.7 + 2.0) * 0.3;
  return uv + vec2(wave * uFlow * 0.08, 0.0);
}

// 4: Circular pulse — radial waves from center
vec2 warpPulse(vec2 uv, float t){
  vec2 c = uv - 0.5;
  float r = length(c);
  float wave = sin(r * uScale * 8.0 - t * 2.0) * uFlow * 0.05;
  return uv + normalize(c + 0.001) * wave;
}

// 5: Swirl — rotation that varies with distance from center
vec2 warpSwirl(vec2 uv, float t){
  vec2 c = uv - 0.5;
  float r = length(c);
  float angle = r * uScale * 3.0 * uFlow * sin(t * 0.5);
  float cs = cos(angle), sn = sin(angle);
  return vec2(c.x * cs - c.y * sn, c.x * sn + c.y * cs) + 0.5;
}

// 6: Breathing — gentle uniform scale oscillation from center
vec2 warpBreathe(vec2 uv, float t){
  vec2 c = uv - 0.5;
  float s = 1.0 + sin(t) * uFlow * 0.1;
  return c * s + 0.5;
}

// 7: Drift — slow diagonal drift with gentle wobble
vec2 warpDrift(vec2 uv, float t){
  vec2 d;
  d.x = sin(t * 0.3) * 0.7 + cos(t * 0.17) * 0.3;
  d.y = cos(t * 0.23) * 0.6 + sin(t * 0.31) * 0.4;
  return uv + d * uFlow * 0.04;
}

// 8: Liquid — turbulent multi-frequency noise-like warp
vec2 warpLiquid(vec2 uv, float t){
  vec2 p = uv * uScale;
  vec2 d;
  d.x = sin(p.y * 1.7 + t) + sin(p.x * 2.3 - t * 1.4) * 0.5
      + sin(p.y * 3.1 + t * 0.7) * 0.25;
  d.y = cos(p.x * 1.9 + t * 1.1) + cos(p.y * 2.7 - t * 0.9) * 0.5
      + cos(p.x * 3.3 + t * 1.3) * 0.25;
  return uv + d * uFlow * 0.04;
}

// 9: Ripple — concentric rings that expand outward
vec2 warpRipple(vec2 uv, float t){
  vec2 c = uv - 0.5;
  float r = length(c);
  float wave = sin(r * uScale * 12.0 - t * 3.0) * exp(-r * 2.0);
  return uv + c * wave * uFlow * 0.15;
}

// 10: Glitch — stepped horizontal displacement bands
vec2 warpGlitch(vec2 uv, float t){
  float band = floor(uv.y * uScale * 4.0);
  float shift = hash(vec2(band, floor(t * 2.0))) * 2.0 - 1.0;
  float active = step(0.7, hash(vec2(band + 100.0, floor(t * 3.0))));
  return uv + vec2(shift * uFlow * 0.08 * active, 0.0);
}

vec2 warp(vec2 uv, float t){
  // animMode 0 = no animation (identity)
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

vec3 shaderColor(float t){
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
  if(uHueShift != 0.0) col = hueRotate(col, uHueShift);
  return col;
}

void main(){
  float t = uTime * uSpeed;
  float screenX = gl_FragCoord.x / uResolution.x;

  vec3 col;

  if(uMode < 0.5){
    col = shaderColor(t);
  } else if(uMode < 1.5){
    col = texture2D(uTexFull, vUv).rgb;
  } else {
    if(screenX < uSplit){
      col = shaderColor(t);
    } else {
      col = texture2D(uTexFull, vUv).rgb;
    }
    float px = gl_FragCoord.x;
    float splitPx = uResolution.x * uSplit;
    if(abs(px - splitPx) < 1.0){
      col = vec3(1.0);
    }
  }

  gl_FragColor = vec4(col, 1.0);
}`;

export const ANIM_MODES = [
  { id: 0, label: "None" },
  { id: 1, label: "Organic" },
  { id: 2, label: "H. Wave" },
  { id: 3, label: "V. Wave" },
  { id: 4, label: "Pulse" },
  { id: 5, label: "Swirl" },
  { id: 6, label: "Breathe" },
  { id: 7, label: "Drift" },
  { id: 8, label: "Liquid" },
  { id: 9, label: "Ripple" },
] as const;
