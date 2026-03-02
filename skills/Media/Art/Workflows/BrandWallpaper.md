# Brand Wallpaper Workflow

**Creates brand wallpaper with logo integration using embossed/textured style.**

## Voice Notification

```bash
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Running the BrandWallpaper workflow in the Art skill"}' \
  > /dev/null 2>&1 &
```

Running **BrandWallpaper** in **Art**...

---

Creates **BRAND WALLPAPERS** — professional desktop/mobile wallpapers with embossed logo integration, texture patterns, and brand color schemes.

---

## Workflow

1. **Analyze brand assets**: Read logo file, extract brand colors, identify style direction
2. **Generate wallpaper prompt**: Design prompt for the chosen style (embossed, textured, gradient, minimal)
3. **Generate image**: Use `Generate.ts` with appropriate model (Flux 1.1 Pro recommended for textures)
4. **Compose final**: If needed, overlay logo with proper positioning and effects
5. **Output**: Multiple resolutions (desktop 3840x2160, mobile 1170x2532)

## Required Inputs

- Brand logo (PNG with transparency preferred)
- Brand colors (hex codes or "extract from logo")
- Style: embossed | textured | gradient | minimal | dark | light
- Target resolutions

## Example

```
Create a brand wallpaper for PAI with embossed logo on dark textured background
```
