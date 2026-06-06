import type { APIRoute } from "astro";
import {
  loadSettings,
  addDocsPath,
  removeDocsPath,
  setDefaultDoc,
  updateDocsPath,
  copyDocsToSystem,
  setPresetDescription,
} from "../../lib/config-store";

// GET /api/settings - 获取所有配置
export const GET: APIRoute = async () => {
  try {
    const settings = loadSettings();
    return new Response(JSON.stringify(settings), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

// POST /api/settings - 添加新文档路径
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "add") {
      const settings = addDocsPath({
        name: body.name,
        path: body.path,
        description: body.description || "",
      });
      return new Response(JSON.stringify(settings), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (action === "setDefault") {
      const settings = setDefaultDoc(body.name);
      return new Response(JSON.stringify(settings), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (action === "update") {
      const settings = updateDocsPath(body.oldName, {
        name: body.name,
        path: body.path,
        description: body.description || "",
      });
      return new Response(JSON.stringify(settings), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (action === "copy") {
      const settings = copyDocsToSystem(body.name);
      return new Response(JSON.stringify(settings), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (action === "setPresetDesc") {
      const settings = setPresetDescription(body.name, body.description);
      return new Response(JSON.stringify(settings), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "未知操作" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
};

// DELETE /api/settings - 删除文档路径
export const DELETE: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const settings = removeDocsPath(body.name);
    return new Response(JSON.stringify(settings), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
};
