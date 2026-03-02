# Ad-Hoc YouTube Thumbnail Workflow

**Generates YouTube thumbnails from content description without a full checklist process.**

## Voice Notification

```bash
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Running the AdHocYouTubeThumbnail workflow in the Art skill"}' \
  > /dev/null 2>&1 &
```

Running **AdHocYouTubeThumbnail** in **Art**...

---

Creates **QUICK YOUTUBE THUMBNAILS** — fast, eye-catching thumbnails generated from a content topic or title without the full YouTubeThumbnailChecklist process.

---

## Workflow

1. **Parse topic**: Extract key visual concept from video title/description
2. **Design thumbnail concept**: Bold text overlay + compelling visual + high contrast
3. **Generate prompt**: Create image generation prompt following YouTube best practices:
   - 1280x720 resolution (16:9)
   - Bold, readable text (max 5-6 words)
   - High contrast colors
   - Face or strong focal point
   - Minimal clutter
4. **Generate image**: Use `Generate.ts` (GPT-Image-1 for text integration, Flux for photorealistic)
5. **Compose**: Add text overlay if not embedded in generation
6. **Output**: Final 1280x720 PNG optimized for YouTube

## Required Inputs

- Video title or topic description
- Style preference: dramatic | clean | bold | funny | educational
- Optional: brand colors, face/photo to include

## Example

```
Create a YouTube thumbnail for "5 AI Tools That Replace Junior Developers"
Style: dramatic, dark background, bold yellow text
```
