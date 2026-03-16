---
name: Media
description: Visual and video content creation — illustrations, diagrams, mermaid flowcharts, infographics, header images, PAI pack icons, thumbnails, comics, and programmatic video via Remotion. USE WHEN art, header images, visualizations, mermaid, diagrams, flowcharts, infographics, pack icons, video, animation, motion graphics, Remotion, video rendering, YouTube thumbnails, comics, comparisons, frameworks, maps, timelines, taxonomies, stats, aphorisms, recipe cards, annotated screenshots, D3 dashboards, embossed logo wallpaper, remove background, essay illustration, technical diagrams, content to animation, generate image, Midjourney, изображение, картинка, создай картинку, диаграмма, инфографика, визуализация, видео, анимация, иллюстрация, генерация изображений.
context: fork
---

## 🚨 MANDATORY: Voice Notification (REQUIRED BEFORE ANY ACTION)

**You MUST send this notification BEFORE doing anything else when this skill is invoked.**

1. **Send voice notification**:
   ```bash
   curl -s -X POST http://localhost:8888/notify \
     -H "Content-Type: application/json" \
     -d '{"message": "Запускаю WORKFLOWNAME в скилле Media", "voice_id": "3EuKHIEZbSzrHGNmdYsx", "voice_enabled": true}' \
     > /dev/null 2>&1 &
   ```

2. **Output text notification**:
   ```
   Running the **WorkflowName** workflow in the **Media** skill...
   ```

# Media

Unified skill for visual and video content creation.

## Workflow Routing

| Request Pattern | Route To |
|---|---|
| Art, header images, visualizations, mermaid, diagrams, flowcharts, infographics, pack icons | `Art/SKILL.md` |
| Video, animation, motion graphics, video rendering, Remotion, React video | `Remotion/SKILL.md` |
