import { readdir, readFile, stat } from "fs/promises";
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

// 渲染 Markdown 为 HTML
function renderMarkdown(content: string): string {
  return md.render(content);
}

// 递归扫描目录构建树形结构
async function buildDocTree(
  dir: string,
  basePath: string,
): Promise<DocTreeNode[]> {
  const nodes: DocTreeNode[] = [];

  try {
    const entries = await readdir(dir);

    // 分离文件和文件夹
    const folders: string[] = [];
    const files: string[] = [];

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stats = await stat(fullPath);
      if (stats.isDirectory()) {
        folders.push(entry);
      } else if (entry.endsWith(".md")) {
        files.push(entry);
      }
    }

    // 排序
    folders.sort((a, b) => a.localeCompare(b, "zh"));
    files.sort((a, b) => a.localeCompare(b, "zh"));

    // 处理文件夹
    for (const folder of folders) {
      const fullPath = join(dir, folder);
      const children = await buildDocTree(fullPath, basePath);
      const relPath = relative(basePath, fullPath);

      nodes.push({
        name: folder,
        path: relPath,
        children,
        isFile: false,
        order: folder.split("-")[0] || folder,
      });
    }

    // 处理文件
    for (const file of files) {
      const fullPath = join(dir, file);
      const stats = await stat(fullPath);
      const content = await readFile(fullPath, "utf-8");
      const relPath = relative(basePath, fullPath);
      const urlPath = relPath.replace(".md", "");

      nodes.push({
        name: file.replace(".md", ""),
        path: urlPath,
        content,
        htmlContent: renderMarkdown(content),
        children: [],
        isFile: true,
        order: file.split("-")[0]?.replace(".md", "") || file,
        lastModified: stats.mtime,
      });
    }
  } catch (error) {
    console.error(`Error scanning directory: ${dir}`, error);
  }

  return nodes;
}

// 获取文档树（自动适配 SSG/SSR 模式）
export async function getDocTree(): Promise<DocTreeNode[]> {
  let configPath: string;

  if (isSSRMode()) {
    // SSR 模式：从运行时配置读取
    const project = getActiveProject();
    configPath = project.path;
  } else {
    // SSG 模式：从静态配置读取
    const project = getDefaultProject();
    configPath = project.path;
  }

  const docsPath = resolveDocsPath(configPath);
  return buildDocTree(docsPath, docsPath);
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
  return buildDocTree(docsPath, docsPath);
}
