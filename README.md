# YooMdSite

通用的 Markdown 文档阅读平台，支持在线查看 Markdown 格式的设计文档，包括 Mermaid 流程图、ER 图、状态图等。将 Markdown 文档添加到项目中，即可在线查看，支持多级目录、多文件、多项目。

**在线演示**：https://yhui02.github.io/YooMdSite/

## 功能特性

- **Markdown 文档渲染**：支持完整 Markdown 语法，支持相对路径图片引用
- **Mermaid 图表**：自动渲染流程图、ER 图、状态机、时序图等
- **侧边栏导航**：按模块分类，快速切换文档
- **代码高亮**：支持多种语言语法高亮
- **响应式设计**：支持移动端查看
- **深色模式**：支持亮色/暗色主题切换
- **多项目管理**：SSR 模式下支持添加、切换、删除多个文档路径
- **忽略目录**：可配置忽略指定文件夹，文档树中不再展示
- **智能排序**：文件和文件夹统一按名称排序，支持数字前缀自动排序
- **编号前缀隐藏**：`00-`、`01-` 等前缀在文档树中自动隐藏，保持界面整洁

## 界面预览

![界面截图](./docs/images/screenshot-1.png)

## 快速开始

```bash
# 安装依赖
pnpm install

# SSG 模式（静态部署）
pnpm dev

# SSR 模式（支持运行时设置管理）
pnpm dev:ssr
```

访问 http://localhost:4321/

## 配置

### SSG 模式

编辑 `src/config.ts` 配置文档项目路径：

```typescript
export const docsConfig = {
  siteName: "YooMdSite",
  docsPaths: [
    {
      name: "我的项目",
      path: "./content/docs/my-project",
      description: "我的项目文档说明",
    },
  ],
  defaultDoc: "我的项目",
};
```

### SSR 模式

SSR 模式下通过设置弹窗（右上角齿轮图标）在线管理：
- 添加、编辑、删除外部文档路径
- 切换默认项目
- 设置忽略目录名称（不在文档树中显示）

## 文档目录规范

建议使用数字前缀控制排序顺序：

```
content/docs/your-project/
├── 00-项目总览/
│   ├── 00-产品简介.md
│   └── 01-系统架构图.md
├── 01-产品功能/
│   └── 功能特性.md
└── 99-附录/
```

- 数字前缀（如 `00-`、`01-`）仅用于排序，文档树中自动隐藏
- 文件和文件夹统一按名称排序，无需单独分组

## 技术栈

- **Astro 6.x** - 静态站点生成 / SSR 服务端渲染
- **Tailwind CSS 3.x** - 样式框架
- **Markdown-it** - Markdown 解析
- **Highlight.js** - 代码高亮
- **Mermaid** - 图表渲染

## 构建

```bash
# SSG 模式构建
pnpm build

# SSR 模式构建
pnpm build:ssr

pnpm preview
```

## License

Apache 2.0
