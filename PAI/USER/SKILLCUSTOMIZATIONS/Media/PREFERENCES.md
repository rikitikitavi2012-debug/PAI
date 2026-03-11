# Media Skill — Timber Frame Customization

## Project Context
Site: timber-frame-spb.ru
Product: Premium timber frame terraces, verandas, pergolas (SPb & Leningrad Oblast)
Brand: Dark wood tones (#1C1917), gold accent (#B45309), premium feel

## Multi-Model Generation (MANDATORY)

**ALWAYS generate through 3+ models in parallel and let user choose the best.**

### Model Priority (March 2026)

| Use Case | Primary Model | Replicate/API ID | Cost |
|----------|--------------|-------------------|------|
| Hero/key visuals | FLUX.2 [max] | `black-forest-labs/flux-2-max` | $0.07 |
| Blog/portfolio bulk | FLUX.2 [pro] | `black-forest-labs/flux-2-pro` | $0.03 |
| Images with text/prices | GPT-Image-1.5 | `gpt-image-1.5` (OpenAI) | $0.04 |
| Fast iterations | Nano Banana 2 | `gemini-3.1-flash-image-preview` (Google) | $0.02 |
| Infographics/diagrams | Ideogram 3.0 | Replicate | $0.05 |

### CLI Reference (Generate.ts flags)

| Model | `--model` flag | `--size` valid values |
|-------|---------------|----------------------|
| FLUX.2 [max] | `flux-2-max` | `16:9`, `1:1`, `9:16`, `4:3`, `3:4` (aspect ratios) |
| GPT-Image-1.5 | `gpt-image-1.5` | `1536x1024`, `1024x1536`, `1024x1024` |
| Nano Banana 2 | `nano-banana-pro` | `1K`, `2K`, `4K` + `--aspect-ratio 16:9` |

### Generation Flow
1. Prepare TF-specific prompt (use terminology below)
2. Launch 3 models in parallel (FLUX.2 max + GPT-Image-1.5 + Nano Banana 2)
3. Save all to ~/Downloads/ with model suffix: `{name}-flux.png`, `{name}-gpt.png`, `{name}-gemini.png`
4. Show all variants to user for comparison
5. User picks → compress to WebP (cwebp -q 72 -m 6) → copy to public/images/

## Timber Frame Visual Terminology

Use these terms in prompts for accurate TF rendering:

### Construction Elements
- **Post-and-beam** (стоечно-балочная система) — vertical posts + horizontal beams
- **King post truss** (стойка в ферме) — central vertical member in triangular truss
- **Braces / knee braces** (подкосы) — diagonal supports at post-beam joints
- **Mortise and tenon joints** (врубки шип-паз) — traditional wood joinery, pegged
- **Glued laminated timber / glulam** (клеёный брус) — engineered wood beams
- **Rafters** (стропила) — roof framing members
- **Ridge beam** (коньковый брус) — top horizontal beam at roof peak
- **Purlins** (прогоны) — horizontal roof members between rafters

### Materials
- **Larch** (лиственница) — golden-brown, dense grain, natural rot resistance
- **Glulam beams** — visible lamination layers, smooth finish
- **Natural stone** (натуральный камень) — base/wall accent
- **Composite decking** (террасная доска) — dark brown, wood-grain texture

### Atmosphere (SPb/LO setting)
- **Birch trees** (берёзы) — quintessential Russian landscape element
- **Mixed forest** — birch + pine + spruce background
- **Long summer twilight** — white nights, extended golden hour
- **Flat terrain** with slight hills — Leningrad Oblast
- **Garden/dacha** aesthetic — flowers, lawn, natural landscaping

## Prompt Templates

### Hero / Key Visual
```
Photorealistic architectural photograph, premium timber frame {TYPE} with visible
post-and-beam glulam structure, {JOINT_TYPE} joints clearly visible, golden hour
evening light, warm string lights, comfortable outdoor furniture with beige cushions,
birch trees and lush garden in background, summer in Leningrad Oblast Russia.
Magazine quality, warm amber and dark wood tones. No people. 16:9 landscape.
```
TYPE: terrace / veranda / pergola / pavilion
JOINT_TYPE: mortise and tenon / knee brace / king post

### Product Page
```
Photorealistic 3D render of a {SIZE}m² timber frame {TYPE}, attached to a modern
country house, {SEASON} setting, visible glulam {BEAM_SIZE}mm post-and-beam frame,
{ROOFING}, {DECKING} flooring. Clean architectural visualization, slight 3/4 angle
showing structure and living space. Leningrad Oblast setting, birch forest background.
No people. 16:9 landscape.
```

### Blog Article Header
```
Editorial photograph style, {SUBJECT}, warm natural lighting, shallow depth of field,
timber frame construction details visible, {MOOD}. Horizontal 16:9 composition,
magazine quality. Dark wood and gold tones.
```

### Technology / Detail Shot
```
Close-up architectural photograph of timber frame {DETAIL}, visible wood grain of
glued laminated timber, {FINISH} finish, precision craftsmanship, studio-quality
lighting showing wood texture and joint geometry. Clean background.
```

## Output Specifications

| Placement | Dimensions | Format | Max Size | Quality |
|-----------|-----------|--------|----------|---------|
| Hero | 1920x1080 | WebP | 200 KB | 82-85 |
| Page section | 1200x800 | WebP | 150 KB | 80 |
| Blog header | 1200x630 | WebP | 120 KB | 80 |
| OG image | 1200x630 | PNG | 300 KB | 90 |
| Gallery thumb | 400x300 | WebP | 30 KB | 75 |

## Anti-Patterns (DO NOT)
- Generic "wooden terrace" without visible TF frame structure
- Log cabin / rustic / shabby aesthetic (we are PREMIUM)
- Tropical/Mediterranean settings (we are Northern Russia)
- People with recognizable faces
- Text in images (except via GPT-Image when needed)
- Square format for hero/section images (always 16:9)
- Bright/white color scheme (our brand is dark wood)
