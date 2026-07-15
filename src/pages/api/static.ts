import type { APIRoute } from "astro";
import { readFileSync, existsSync } from "fs";
import { extname, resolve } from "path";
import { loadSettings } from "../../lib/config-store";

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

// GET /api/static?path=relative/path/to/file.png
export const GET: APIRoute = async ({ url }) => {
  try {
    const filePath = url.searchParams.get("path");
    if (!filePath) {
      return new Response("Missing path parameter", { status: 400 });
    }

    // 防止路径遍历攻击
    const decodedPath = decodeURIComponent(filePath);
    if (decodedPath.includes("..")) {
      return new Response("Invalid path", { status: 400 });
    }

    // 在所有已配置的文档路径中查找文件
    const settings = loadSettings();
    for (const docPath of settings.docsPaths) {
      if (!docPath.exists) continue;
      const absPath = resolve(docPath.path, decodedPath);
      if (existsSync(absPath)) {
        const ext = extname(absPath).toLowerCase();
        const contentType = MIME_TYPES[ext] || "application/octet-stream";
        const content = readFileSync(absPath);
        return new Response(content, {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=3600",
          },
        });
      }
    }

    return new Response("File not found", { status: 404 });
  } catch (e: any) {
    return new Response(e.message, { status: 500 });
  }
};
