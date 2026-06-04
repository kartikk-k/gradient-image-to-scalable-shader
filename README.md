# Gradient to Shader

Upload any gradient image and reconstruct it as a live, resolution-independent, animatable GPU shader. The output is a tiny texture + GLSL code that renders the gradient at any size, sharper than the original.

## How it works

The core idea: **gradients are mostly redundant data**. A 6048x3928 photo of a gradient is millions of pixels, but the actual color information can be described by a tiny grid of samples. The shader then reconstructs the full image mathematically on the GPU.

### The pipeline

```
Source image (e.g. 6048x3928, 12 MB JPEG)
        |
        v
  [Downsample] ---- browser's canvas drawImage with high-quality smoothing
        |
        v
  Tiny grid texture (e.g. 112x73, ~7.4 KB PNG)
        |
        v
  [GPU shader] ---- bicubic B-spline interpolation + dithering
        |
        v
  Pixel-perfect output at ANY resolution (4K, retina, whatever)
```

### Why is the texture so small?

The `rebuildTexture()` function in `gl-engine.ts` does the heavy lifting:

1. **Downsample**: The source image (potentially tens of megapixels) is drawn onto a tiny canvas — controlled by the "Samples" slider. At the default of 32, a 16:10 image becomes a 32x20 grid. At 112, it becomes 112x73. The browser's `drawImage` with `imageSmoothingQuality: 'high'` averages all the source pixels in each cell into a single representative color.

2. **Export as PNG**: The tiny canvas is exported via `toDataURL('image/png')`. A 112x73 PNG with smooth gradients compresses extremely well — **~7.4 KB** for what was a 12 MB source.

3. **Embed as base64**: That PNG is base64-encoded and embedded directly in the exported HTML/component. Base64 adds ~33% overhead, so 7.4 KB becomes ~10 KB of text. Still trivial compared to megabytes.

### Why does it look as good (or better) than the original?

The shader doesn't just stretch the tiny texture — it reconstructs a continuous mathematical surface from it:

- **Bicubic B-spline filtering** (`textureBicubic` in the shader): Instead of bilinear interpolation (straight lines between grid points = visible facets), bicubic uses cubic curves. This produces a smooth, infinitely-zoomable surface from just a few dozen sample points. For smooth gradients, the mathematical reconstruction is actually closer to the "true" gradient than the original fixed-pixel image was.

- **Triangular dithering**: Before the GPU's 8-bit framebuffer quantizes the output, ~1 LSB of shaped noise is added. This breaks up the banding that plagues fixed 8-bit images, giving perceptually higher bit-depth.

- **Resolution independence**: The source image is locked to its pixel grid — zoom in and you see pixels/JPEG artifacts. The shader evaluates the math at whatever resolution it's drawn, so it stays sharp at 4K, on retina displays, or at any zoom level.

### The size math

| Stage | Dimensions | Size |
|-------|-----------|------|
| Source JPEG | 6048 x 3928 | ~12 MB |
| Raw pixels (RGBA) | 6048 x 3928 x 4 | ~90 MB |
| Sampled grid | 112 x 73 | 8,176 pixels |
| Grid as PNG | 112 x 73 | ~7.4 KB |
| Grid as base64 | - | ~10 KB |
| Complete standalone HTML | - | ~15 KB |

That's a **99.9% reduction** — from 12 MB to 15 KB — with output quality that's arguably better than the original at every resolution.

### What the shader can't do

This works because gradients are low-frequency signals — smooth transitions between colors. It would NOT work well for:
- Photos with sharp edges, text, or fine detail
- Textures with high-frequency patterns
- Images where per-pixel accuracy matters

For those, you need actual image compression (JPEG, WebP, AVIF). This tool is specifically designed for gradient backgrounds, color fields, and smooth abstract imagery.

## Features

- 10 animation modes (organic, wave, pulse, swirl, ripple, glitch, etc.)
- Bicubic reconstruction + dithering for quality beyond the source
- Static noise/grain overlay
- Compare view with draggable split
- Zoom and pan
- Export as GLSL shaders or standalone HTML
- Reusable `<GradientShader>` component for embedding

## Development

```bash
npm run dev
```

## Tech

- Next.js 16 + React 19
- WebGL 1.0 (fragment + vertex shaders)
- Tailwind CSS v4
