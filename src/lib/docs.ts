import { readdir, readFile, stat } from "fs/promises";
import { existsSync } from "fs";
import { join, relative, resolve, isAbsolute } from "path";
import MarkdownIt from "markdown-it";
import taskLists from "markdown-it-task-lists";
import hljs from "highlight.js";
import { docsConfig, getDefaultProject } from "../config";
import { isSSRMode, getActiveProject } from "./config-store";

// 使用 process.cwd() 获取项目根目录
const projectRoot = process.cwd();

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true,
  highlight: function (str: string, lang: string) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code>${hljs.highlight(str, { language: lang, ignoreIllegals: true }).value}</code></pre>`;
      } catch (e) {
        console.error("Highlight error:", e);
      }
    }
    // 自动检测语言
    try {
      return `<pre class="hljs"><code>${hljs.highlightAuto(str).value}</code></pre>`;
    } catch (e) {
      return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`;
    }
  },
});

md.use(taskLists, { enabled: true, label: true });

// 自定义 mermaid 代码块渲染
const defaultFence =
  md.renderer.rules.fence ||
  function (tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options);
  };

md.renderer.rules.fence = function (tokens, idx, options, env, self) {
  const token = tokens[idx];
  if (token.info.trim() === "mermaid") {
    const content = token.content.trim();
    return `<div class="mermaid">${content}</div>`;
  }
  return defaultFence(tokens, idx, options, env, self);
};

export interface DocTreeNode {
  name: string;
  path?: string;
  content?: string;
  htmlContent?: string;
  children: DocTreeNode[];
  isFile: boolean;
  order: string;
  lastModified?: Date;
}

// 解析文档路径
function resolveDocsPath(configPath: string): string {
  // SSR 模式下，config-store 返回的是绝对路径
  if (isAbsolute(configPath)) {
    return configPath;
  }
  // SSG 模式下，相对于项目 src 目录
  return resolve(projectRoot, "src", configPath);
}

// 渲染 Markdown 为 HTML，并处理相对路径图片
function renderMarkdown(
  content: string,
  fileDir?: string,
  basePath?: string,
): string {
  let html = md.render(content);

  // 处理相对路径图片
  if (fileDir && basePath) {
    html = html.replace(
      /<img\s+([^>]*)src="([^"]+)"([^>]*)>/g,
      (match, before, src, after) => {
        // 跳过绝对路径 / 网络路径 / data: URI
        if (
          src.startsWith("/") ||
          src.startsWith("http://") ||
          src.startsWith("https://") ||
          src.startsWith("data:") ||
          src.startsWith("#")
        ) {
          return match;
        }
        // 移除路径中的查询参数和锚点后再解析
        const cleanSrc = src.split(/[?#]/)[0];
        const absolutePath = resolve(fileDir, cleanSrc);
        // 检查文件是否真实存在
        if (!existsSync(absolutePath)) {
          return match;
        }
        const urlPath = relative(basePath, absolutePath);
        const newSrc = `/api/static?path=${encodeURIComponent(urlPath)}`;
        // 保留原始查询参数和锚点
        const queryAndHash = src.substring(cleanSrc.length);
        return `<img ${before}src="${newSrc}${queryAndHash}"${after}>`;
      },
    );
  }

  return html;
}

// 递归扫描目录构建树形结构
async function buildDocTree(
  dir: string,
  basePath: string,
  ignoredDirs: string[] = [],
): Promise<DocTreeNode[]> {
  const nodes: DocTreeNode[] = [];

  try {
    const entries = await readdir(dir);

    const items: { name: string; isDir: boolean }[] = [];

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stats = await stat(fullPath);
      if (stats.isDirectory()) {
        items.push({ name: entry, isDir: true });
      } else if (entry.endsWith(".md")) {
        items.push({ name: entry, isDir: false });
      }
    }

    // 统一按名称排序
    items.sort((a, b) => a.name.localeCompare(b.name, "zh"));

    // 处理所有条目
    for (const item of items) {
      const fullPath = join(dir, item.name);

      if (item.isDir) {
        if (ignoredDirs.includes(item.name)) continue;
        const children = await buildDocTree(fullPath, basePath, ignoredDirs);
        const relPath = relative(basePath, fullPath);
        const displayName = item.name.replace(/^\d{1,2}-/, "");

        nodes.push({
          name: displayName,
          path: relPath,
          children,
          isFile: false,
          order: item.name.split("-")[0] || item.name,
        });
      } else {
        const stats = await stat(fullPath);
        const content = await readFile(fullPath, "utf-8");
        const relPath = relative(basePath, fullPath);
        const urlPath = relPath.replace(".md", "");

        const fileName = item.name.replace(".md", "");
        const displayName = fileName.replace(/^\d{1,2}-/, "");

        nodes.push({
          name: displayName,
          path: urlPath,
          content,
          htmlContent: renderMarkdown(content, dir, basePath),
          children: [],
          isFile: true,
          order: fileName,
          lastModified: stats.mtime,
        });
      }
    }
  } catch (error) {
    console.error(`Error scanning directory: ${dir}`, error);
  }

  return nodes;
}

// 获取文档树（自动适配 SSG/SSR 模式）
export async function getDocTree(): Promise<DocTreeNode[]> {
  let configPath: string;
  let ignoredDirs: string[] = [];

  if (isSSRMode()) {
    // SSR 模式：从运行时配置读取
    const { loadSettings } = await import("./config-store");
    const settings = loadSettings();
    const project = getActiveProject();
    configPath = project.path;
    ignoredDirs = settings.ignoredDirectories || [];
  } else {
    // SSG 模式：从静态配置读取
    const project = getDefaultProject();
    configPath = project.path;
  }

  const docsPath = resolveDocsPath(configPath);
  return buildDocTree(docsPath, docsPath, ignoredDirs);
}

// SSR 模式：根据指定名称获取文档树
export async function getDocTreeByName(
  name: string,
): Promise<DocTreeNode[]> {
  const { loadSettings } = await import("./config-store");
  const settings = loadSettings();
  const project = settings.docsPaths.find((p) => p.name === name);
  if (!project) {
    throw new Error(`文档路径 "${name}" 不存在`);
  }
  const docsPath = resolveDocsPath(project.path);
  const ignoredDirs = settings.ignoredDirectories || [];
  return buildDocTree(docsPath, docsPath, ignoredDirs);
}
