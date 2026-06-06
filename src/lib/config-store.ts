/**
 * 运行时配置存储
 * - 预置路径：自动扫描 src/content/docs 和 data/docs 下的子目录（不可删除）
 * - 外部路径：用户通过设置添加的绝对路径（可删除、可复制到 data/docs）
 * - SSG 模式使用 src/config.ts 中的硬编码配置
 */
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  cpSync,
  rmSync,
} from "fs";
import { join, resolve } from "path";
import { docsConfig as staticConfig } from "../config";

export interface DocsPathEntry {
  name: string;
  path: string;
  description: string;
  preset?: boolean; // true = 系统预置
  presetSource?: "src" | "data"; // 预置来源：src=不可删除, data=可删除
  exists?: boolean; // 路径是否存在
}

export interface AppSettings {
  siteName: string;
  docsPaths: DocsPathEntry[];
  defaultDoc: string;
  presetDescriptions?: Record<string, string>; // 预置项目的自定义描述
}

const DATA_DIR = resolve(process.cwd(), "data");
const SETTINGS_FILE = join(DATA_DIR, "settings.json");
const DOCS_ROOT = resolve(process.cwd(), "src/content/docs");
const DATA_DOCS_ROOT = resolve(process.cwd(), "data/docs");

// 扫描预置路径（包括 src/content/docs 和 data/docs）
function scanPresetPaths(): DocsPathEntry[] {
  const presets: DocsPathEntry[] = [];

  // 扫描 src/content/docs（不可删除）
  scanDirectory(DOCS_ROOT, "系统预置文档", "src", presets);

  // 扫描 data/docs（可删除）
  scanDirectory(DATA_DOCS_ROOT, "数据目录预置文档", "data", presets);

  return presets;
}

// 扫描单个目录
function scanDirectory(
  rootPath: string,
  defaultDesc: string,
  source: "src" | "data",
  presets: DocsPathEntry[],
): void {
  try {
    if (!existsSync(rootPath)) return;
    const entries = readdirSync(rootPath);
    for (const entry of entries) {
      const fullPath = join(rootPath, entry);
      try {
        const st = statSync(fullPath);
        if (st.isDirectory() && !entry.startsWith(".")) {
          // 避免重复添加同名目录
          if (!presets.some((p) => p.name === entry)) {
            presets.push({
              name: entry,
              path: fullPath,
              description: defaultDesc,
              preset: true,
              presetSource: source, // 来源：src=不可删除, data=可删除
              exists: true,
            });
          }
        }
      } catch {
        // skip inaccessible
      }
    }
  } catch {
    // rootPath not accessible
  }
}

// 从静态配置获取默认外部路径
function getDefaultExternalPaths(): DocsPathEntry[] {
  return staticConfig.docsPaths
    .filter((p) => {
      // 过滤掉已在预置路径中的（避免重复）
      const absPath = resolve(process.cwd(), p.path);
      return (
        !absPath.startsWith(DOCS_ROOT) && !absPath.startsWith(DATA_DOCS_ROOT)
      );
    })
    .map((p) => ({
      name: p.name,
      path: resolve(process.cwd(), p.path),
      description: p.description,
      preset: false,
      exists: existsSync(resolve(process.cwd(), p.path)),
    }));
}

// 默认配置
function getDefaultSettings(): AppSettings {
  const presets = scanPresetPaths();
  const externals = getDefaultExternalPaths();
  const allPaths = [...presets, ...externals].map((p) => ({
    ...p,
    exists: existsSync(p.path),
  }));
  const defaultDoc =
    allPaths.find((p) => p.name === staticConfig.defaultDoc)?.name ||
    allPaths[0]?.name ||
    "";

  return {
    siteName: staticConfig.siteName,
    docsPaths: allPaths,
    defaultDoc,
  };
}

// 读取配置（合并预置 + 用户外部路径）
export function loadSettings(): AppSettings {
  let saved: AppSettings | null = null;
  try {
    if (existsSync(SETTINGS_FILE)) {
      const raw = readFileSync(SETTINGS_FILE, "utf-8");
      saved = JSON.parse(raw) as AppSettings;
    }
  } catch (e) {
    console.error("Failed to load settings:", e);
  }

  // 始终用最新的预置路径
  const presets = scanPresetPaths();

  if (!saved) {
    const defaults = getDefaultSettings();
    saveSettings(defaults);
    return defaults;
  }

  // 合并：预置路径 + 用户保存的外部路径
  const externalPaths = (saved.docsPaths || []).filter((p) => !p.preset);
  const presetDescriptions = saved.presetDescriptions || {};
  // 应用自定义描述到预置路径
  const presetsWithDesc = presets.map((p) => ({
    ...p,
    description: presetDescriptions[p.name] || p.description,
  }));
  const allPaths = [...presetsWithDesc, ...externalPaths];

  // 确保 defaultDoc 有效
  let defaultDoc = saved.defaultDoc;
  if (!allPaths.some((p) => p.name === defaultDoc)) {
    defaultDoc = allPaths[0]?.name || "";
  }

  const merged: AppSettings = {
    siteName: saved.siteName || staticConfig.siteName,
    docsPaths: allPaths,
    defaultDoc,
    presetDescriptions,
  };

  // 检查路径是否存在
  merged.docsPaths = merged.docsPaths.map((p) => ({
    ...p,
    exists: existsSync(p.path),
  }));

  return merged;
}

// 保存配置（只保存外部路径，预置路径每次动态扫描）
export function saveSettings(settings: AppSettings): void {
  try {
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
    }
    // 只持久化非预置路径
    const toSave: AppSettings = {
      ...settings,
      docsPaths: settings.docsPaths.filter((p) => !p.preset),
    };
    writeFileSync(SETTINGS_FILE, JSON.stringify(toSave, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to save settings:", e);
    throw e;
  }
}

// 获取当前激活的文档路径
export function getActiveProject(): DocsPathEntry {
  const settings = loadSettings();
  const active = settings.docsPaths.find((p) => p.name === settings.defaultDoc);
  return active || settings.docsPaths[0];
}

// 添加外部文档路径
export function addDocsPath(entry: DocsPathEntry): AppSettings {
  const settings = loadSettings();
  const exists = settings.docsPaths.some((p) => p.name === entry.name);
  if (exists) {
    throw new Error(`名称 "${entry.name}" 已存在`);
  }
  if (!existsSync(entry.path)) {
    throw new Error(`路径 "${entry.path}" 不存在`);
  }
  entry.preset = false;
  settings.docsPaths.push(entry);
  saveSettings(settings);
  return settings;
}

// 删除文档路径（src预置路径不可删除，data预置路径可删除并会删除实际文件夹）
export function removeDocsPath(name: string): AppSettings {
  const settings = loadSettings();
  const target = settings.docsPaths.find((p) => p.name === name);
  if (!target) {
    throw new Error(`名称 "${name}" 不存在`);
  }
  // src 预置路径不可删除
  if (target.preset && target.presetSource === "src") {
    throw new Error("系统预置路径（src/content/docs）不可删除");
  }
  // data 预置路径可删除，同时删除实际文件夹
  if (target.preset && target.presetSource === "data") {
    if (!existsSync(target.path)) {
      throw new Error(`路径 "${target.path}" 不存在`);
    }
    try {
      rmSync(target.path, { recursive: true, force: true });
    } catch (e: any) {
      throw new Error(`删除文件夹失败: ${e.message}`);
    }
  }

  const nonPresetCount = settings.docsPaths.filter((p) => !p.preset).length;
  const presetCount = settings.docsPaths.filter((p) => p.preset).length;
  if (nonPresetCount <= 0 && presetCount <= 0) {
    throw new Error("至少保留一个文档路径");
  }
  settings.docsPaths = settings.docsPaths.filter((p) => p.name !== name);
  if (settings.defaultDoc === name) {
    settings.defaultDoc = settings.docsPaths[0]?.name || "";
  }
  saveSettings(settings);
  return settings;
}

// 设置默认文档
export function setDefaultDoc(name: string): AppSettings {
  const settings = loadSettings();
  const exists = settings.docsPaths.some((p) => p.name === name);
  if (!exists) {
    throw new Error(`名称 "${name}" 不存在`);
  }
  settings.defaultDoc = name;
  saveSettings(settings);
  return settings;
}

// 更新文档路径
export function updateDocsPath(
  oldName: string,
  entry: DocsPathEntry,
): AppSettings {
  const settings = loadSettings();
  const index = settings.docsPaths.findIndex((p) => p.name === oldName);
  if (index === -1) {
    throw new Error(`名称 "${oldName}" 不存在`);
  }
  if (settings.docsPaths[index].preset) {
    throw new Error("系统预置路径不可编辑");
  }
  if (oldName !== entry.name) {
    const duplicate = settings.docsPaths.some((p) => p.name === entry.name);
    if (duplicate) {
      throw new Error(`名称 "${entry.name}" 已存在`);
    }
  }
  entry.preset = false;
  settings.docsPaths[index] = entry;
  if (settings.defaultDoc === oldName) {
    settings.defaultDoc = entry.name;
  }
  saveSettings(settings);
  return settings;
}

// 将外部路径复制到系统内（data/docs）
export function copyDocsToSystem(name: string): AppSettings {
  const settings = loadSettings();
  const source = settings.docsPaths.find((p) => p.name === name);
  if (!source) {
    throw new Error(`名称 "${name}" 不存在`);
  }
  if (source.preset) {
    throw new Error("该路径已在系统内，无需复制");
  }
  if (!existsSync(source.path)) {
    throw new Error(`源路径 "${source.path}" 不存在`);
  }

  // 目标目录名用 name，复制到 data/docs
  const targetDir = join(DATA_DOCS_ROOT, name);
  if (existsSync(targetDir)) {
    throw new Error(`系统内已存在同名目录 "${name}"，请修改名称后重试`);
  }

  // 确保 DATA_DOCS_ROOT 存在
  if (!existsSync(DATA_DOCS_ROOT)) {
    mkdirSync(DATA_DOCS_ROOT, { recursive: true });
  }

  // 复制
  cpSync(source.path, targetDir, { recursive: true });

  // 复制成功后，新的预置路径会在下次 loadSettings 时自动扫描到
  // 删除外部路径
  settings.docsPaths = settings.docsPaths.filter((p) => p.name !== name);
  if (settings.defaultDoc === name) {
    settings.defaultDoc = name; // 预置路径同名，仍然有效
  }
  saveSettings(settings);

  // 重新加载以获取最新预置路径
  return loadSettings();
}

// 设置预置项目的自定义描述
export function setPresetDescription(
  name: string,
  description: string,
): AppSettings {
  const settings = loadSettings();
  const target = settings.docsPaths.find((p) => p.name === name && p.preset);
  if (!target) {
    throw new Error(`预置项目 "${name}" 不存在`);
  }
  if (!settings.presetDescriptions) {
    settings.presetDescriptions = {};
  }
  settings.presetDescriptions[name] = description;
  // 同步更新 docsPaths 中的描述（供当前返回使用）
  target.description = description;
  saveSettings(settings);
  return settings;
}

// 判断是否为 SSR 模式
export function isSSRMode(): boolean {
  return (
    import.meta.env.RENDER_MODE === "ssr" || process.env.RENDER_MODE === "ssr"
  );
}
