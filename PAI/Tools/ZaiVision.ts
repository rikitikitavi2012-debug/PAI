#!/usr/bin/env bun
/**
 * ============================================================================
 * ZaiVision — Z.AI Vision CLI for Kitty UI analysis
 * ============================================================================
 *
 * Screenshot Kitty terminal + analyze via Z.AI GLM-4.6v vision API.
 *
 * USAGE:
 *   bun ZaiVision.ts screenshot              — capture Kitty window (PowerShell + WSL)
 *   bun ZaiVision.ts analyze <image_path>    — Z.AI vision analysis of image
 *   bun ZaiVision.ts diff <before> <after>   — compare two screenshots (UI regression)
 *   bun ZaiVision.ts check [prompt]          — screenshot + analyze in one command
 *   bun ZaiVision.ts --help                  — show this help
 *
 * REQUIRES:
 *   - ZAI_API_KEY in ~/.config/PAI/.env or environment
 *   - PowerShell (WSL2 interop) for screenshots
 *   - Bun runtime
 *
 * ============================================================================
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "fs";
import { join, dirname } from "path";
import { spawnSync } from "child_process";

// ── Config ──────────────────────────────────────────────────────────────

const ZAI_API_URL = process.env.ZAI_API_URL || "https://api.z.ai/api/coding/paas/v4/chat/completions";
const ZAI_VISION_MODEL = "glm-4.6v";
const MAX_TOKENS = 8000;
const API_TIMEOUT_MS = 120_000;
const SCREENSHOT_DIR = "/tmp";
const WIN_TEMP = "/mnt/c/Users/User/AppData/Local/Temp";
const MAX_IMAGE_WIDTH = 1280; // Resize large screenshots for faster API

// ── Env Loading ─────────────────────────────────────────────────────────

function loadApiKey(): string {
  let key = process.env.ZAI_API_KEY || process.env.Z_AI_API_KEY || "";

  if (!key) {
    const envPath = `${process.env.HOME}/.config/PAI/.env`;
    try {
      const content = readFileSync(envPath, "utf-8");
      const match = content.match(/^ZAI_API_KEY=(.+)$/m);
      if (match) key = match[1].trim();
    } catch {}
  }

  if (!key) {
    console.error("Error: No ZAI_API_KEY found in env or ~/.config/PAI/.env");
    process.exit(1);
  }

  return key;
}

// ── Screenshot (PowerShell .NET via WSL2 interop) ───────────────────────

function takeScreenshot(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `zai-screenshot-${timestamp}.png`;
  const winPath = `C:\\Users\\User\\AppData\\Local\\Temp\\${filename}`;
  const wslWinPath = join(WIN_TEMP, filename);
  const localPath = join(SCREENSHOT_DIR, filename);

  const psScript = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$screen = [System.Windows.Forms.Screen]::PrimaryScreen
$bounds = $screen.Bounds
$bitmap = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
$bitmap.Save('${winPath}', [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()
Write-Output '${winPath}'
`.trim();

  console.error("Capturing screenshot via PowerShell...");

  const result = spawnSync("powershell.exe", ["-Command", psScript], {
    timeout: 15_000,
    encoding: "utf-8",
  });

  if (result.status !== 0) {
    console.error("Screenshot failed:", result.stderr || "unknown error");
    process.exit(1);
  }

  // Copy from Windows temp to WSL /tmp
  try {
    copyFileSync(wslWinPath, localPath);
  } catch (e: any) {
    console.error(`Failed to copy screenshot from ${wslWinPath}: ${e.message}`);
    process.exit(1);
  }

  // Resize for faster API calls (large screenshots slow down vision API)
  const resizedPath = localPath.replace(".png", "-resized.png");
  const resize = spawnSync("convert", [
    localPath, "-resize", `${MAX_IMAGE_WIDTH}x>`, "-quality", "85", resizedPath,
  ], { timeout: 10_000 });

  const finalPath = resize.status === 0 && existsSync(resizedPath) ? resizedPath : localPath;
  const stats = Bun.file(finalPath);
  console.error(`Screenshot saved: ${finalPath} (${Math.round(stats.size / 1024)}KB)`);
  return finalPath;
}

// ── Z.AI Vision API ─────────────────────────────────────────────────────

interface ZaiVisionResponse {
  choices?: Array<{
    message?: {
      content?: string;
      reasoning_content?: string;
    };
  }>;
  error?: { message: string; code: number };
}

async function callVisionApi(
  apiKey: string,
  imagePaths: string[],
  prompt: string
): Promise<string> {
  // Build content array with images + text
  const content: any[] = [];

  for (const imgPath of imagePaths) {
    if (!existsSync(imgPath)) {
      console.error(`Image not found: ${imgPath}`);
      process.exit(1);
    }

    const imgBuffer = readFileSync(imgPath);
    const base64 = imgBuffer.toString("base64");
    const sizeMB = imgBuffer.length / (1024 * 1024);

    if (sizeMB > 5) {
      console.error(`Image too large: ${imgPath} (${sizeMB.toFixed(1)}MB, max 5MB)`);
      process.exit(1);
    }

    content.push({
      type: "image_url",
      image_url: { url: `data:image/png;base64,${base64}` },
    });
  }

  content.push({ type: "text", text: prompt });

  const body = JSON.stringify({
    model: ZAI_VISION_MODEL,
    messages: [{ role: "user", content }],
    max_tokens: MAX_TOKENS,
    temperature: 0.3,
  });

  console.error(`Calling Z.AI Vision API (${ZAI_VISION_MODEL})...`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(ZAI_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error ${response.status}: ${errorText}`);
      process.exit(1);
    }

    const data: ZaiVisionResponse = await response.json();

    if (data.error) {
      console.error(`Z.AI error ${data.error.code}: ${data.error.message}`);
      process.exit(1);
    }

    const message = data.choices?.[0]?.message;
    // GLM-4.6v returns reasoning_content (thinking) + content (answer)
    // If content is empty, fall back to reasoning_content
    const result = message?.content || message?.reasoning_content || "";

    if (!result) {
      console.error("Z.AI returned empty response. Try increasing max_tokens.");
      process.exit(1);
    }

    return result;
  } catch (e: any) {
    clearTimeout(timeout);
    if (e.name === "AbortError") {
      console.error(`Z.AI API timeout (${API_TIMEOUT_MS / 1000}s)`);
    } else {
      console.error(`Z.AI API error: ${e.message}`);
    }
    process.exit(1);
  }
}

// ── Commands ────────────────────────────────────────────────────────────

async function cmdScreenshot(): Promise<void> {
  const path = takeScreenshot();
  console.log(path);
}

async function cmdAnalyze(imagePath: string, prompt?: string): Promise<void> {
  const apiKey = loadApiKey();
  const defaultPrompt =
    "Analyze this UI screenshot. Describe: 1) Layout structure 2) Color scheme " +
    "3) Text readability 4) Alignment issues 5) Any UI problems or improvements needed. " +
    "Be specific about elements and their positions.";

  const result = await callVisionApi(apiKey, [imagePath], prompt || defaultPrompt);
  console.log(result);
}

async function cmdDiff(beforePath: string, afterPath: string, prompt?: string): Promise<void> {
  const apiKey = loadApiKey();
  const defaultPrompt =
    "Compare these two UI screenshots (before and after). Identify: " +
    "1) Visual differences 2) Layout changes 3) Color/styling changes " +
    "4) Text changes 5) Regressions or improvements. Be specific.";

  const result = await callVisionApi(apiKey, [beforePath, afterPath], prompt || defaultPrompt);
  console.log(result);
}

async function cmdCheck(prompt?: string): Promise<void> {
  const screenshotPath = takeScreenshot();
  const apiKey = loadApiKey();
  const defaultPrompt =
    "Analyze this Kitty terminal UI screenshot. Describe: " +
    "1) Layout structure and organization 2) Color scheme and contrast " +
    "3) Text readability and font quality 4) Alignment and spacing issues " +
    "5) Any UI problems, glitches, or improvements needed. " +
    "Focus on terminal-specific UI quality.";

  const result = await callVisionApi(apiKey, [screenshotPath], prompt || defaultPrompt);
  console.log(result);
}

function showHelp(): void {
  console.log(`ZaiVision — Z.AI Vision CLI for Kitty UI analysis

Usage:
  bun ZaiVision.ts screenshot              Capture Kitty window screenshot
  bun ZaiVision.ts analyze <image> [prompt] Analyze image with Z.AI vision
  bun ZaiVision.ts diff <before> <after> [prompt] Compare two screenshots
  bun ZaiVision.ts check [prompt]          Screenshot + analyze in one step
  bun ZaiVision.ts --help                  Show this help

Environment:
  ZAI_API_KEY    Z.AI API key (or in ~/.config/PAI/.env)

Examples:
  bun ZaiVision.ts screenshot
  bun ZaiVision.ts analyze /tmp/screenshot.png "Find alignment issues"
  bun ZaiVision.ts diff /tmp/before.png /tmp/after.png
  bun ZaiVision.ts check "Is the statusline readable?"
`);
}

// ── Main ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === "--help" || command === "-h") {
  showHelp();
  process.exit(0);
}

switch (command) {
  case "screenshot":
    await cmdScreenshot();
    break;
  case "analyze":
    if (!args[1]) {
      console.error("Usage: bun ZaiVision.ts analyze <image_path> [prompt]");
      process.exit(1);
    }
    await cmdAnalyze(args[1], args[2]);
    break;
  case "diff":
    if (!args[1] || !args[2]) {
      console.error("Usage: bun ZaiVision.ts diff <before> <after> [prompt]");
      process.exit(1);
    }
    await cmdDiff(args[1], args[2], args[3]);
    break;
  case "check":
    await cmdCheck(args[1]);
    break;
  default:
    console.error(`Unknown command: ${command}`);
    showHelp();
    process.exit(1);
}
