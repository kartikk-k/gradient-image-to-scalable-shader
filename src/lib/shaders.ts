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
uniform float uSplit;       // compare divider position 0..1
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

vec2 warp(vec2 uv, float t){
  vec2 p = uv * uScale;
  vec2 d;
  d.x = sin(p.y + t) + 0.5 * cos(p.x * 1.3 - t * 0.8);
  d.y = cos(p.x + t * 0.9) + 0.5 * sin(p.y * 1.3 + t * 0.7);
  d.x += 0.35 * sin(p.y * 2.1 - t * 1.3);
  d.y += 0.35 * cos(p.x * 2.1 + t * 1.1);
  return uv + d * uFlow * 0.06;
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
  return col;
}

void main(){
  float t = uTime * uSpeed;
  float screenX = gl_FragCoord.x / uResolution.x;

  vec3 col;

  if(uMode < 0.5){
    // Shader mode
    col = shaderColor(t);
  } else if(uMode < 1.5){
    // Source mode — show original full-res image
    col = texture2D(uTexFull, vUv).rgb;
  } else {
    // Compare mode — left=shader, right=original
    if(screenX < uSplit){
      col = shaderColor(t);
    } else {
      col = texture2D(uTexFull, vUv).rgb;
    }
    // Divider line
    float px = gl_FragCoord.x;
    float splitPx = uResolution.x * uSplit;
    if(abs(px - splitPx) < 1.0){
      col = vec3(1.0);
    }
  }

  gl_FragColor = vec4(col, 1.0);
}`;
