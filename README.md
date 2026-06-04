# Tiny Gradient

**[tinygradient.halodesign.io](https://tinygradient.halodesign.io)**

Turn any gradient image into a tiny, resolution-independent, animatable GPU shader.

![Tiny Gradient](public/preview.png)

## Why

A 12 MB gradient JPEG is millions of redundant pixels. Tiny Gradient samples it down to a few KB, then reconstructs it on the GPU with bicubic interpolation — sharper than the original at any resolution.

## How it works

```
Source image (e.g. 6048x3928, 12 MB)
        |
  [Downsample] → tiny grid (e.g. 102x66)
        |
  [GPU shader] → bicubic B-spline + dithering
        |
  Pixel-perfect at ANY resolution
```

| Stage | Size |
|-------|------|
| Source JPEG | ~12 MB |
| Shader texture (PNG) | ~7 KB |
| Complete standalone HTML | ~15 KB |
| **Reduction** | **99.9%** |

## Features

- 9 animation modes (organic, wave, pulse, swirl, ripple, etc.)
- Bicubic reconstruction + dithering
- Static noise/grain overlay
- Hue shift
- Compare view with draggable split
- Zoom and pan
- Copy as React component or standalone HTML
- Dynamic background that adapts to your gradient

## Usage

Upload a gradient image (or use the built-in default), tweak the controls, then:

- **Copy React** — get a self-contained `<GradientShader>` component
- **Copy HTML** — get a single-file HTML page with your gradient baked in
- **Upload** — swap to a different gradient

The exported code includes the shader, all your settings, and the texture embedded as base64. No external dependencies.

## Development

```bash
npm install
npm run dev
```

## Tech

- Next.js 16 + React 19
- WebGL 1.0 (fragment + vertex shaders)
- Tailwind CSS v4
- Framer Motion

## How a 12 MB image becomes 7 KB

Gradients are low-frequency signals — smooth transitions between colors. A 6048x3928 image stores millions of nearly-identical neighboring pixels. The actual information content is just a few hundred color samples.

`rebuildTexture()` downsamples the source to a small grid using the browser's high-quality `drawImage`. That grid is exported as a PNG (gradients compress extremely well) and embedded as base64. The GPU shader then reconstructs a continuous mathematical surface from the grid using bicubic B-spline interpolation — producing output that's smoother than the original pixel grid at any zoom level.

This only works for gradients and smooth imagery. Photos with sharp edges, text, or fine detail need real image compression.

---

A [halodesign.io](https://halodesign.io) product.
