# GitHub Pages 部署

## 部署架构

```mermaid
graph LR
  Dev[开发者] -->|git push| GitHub[GitHub 仓库]
  GitHub -->|触发| Actions[GitHub Actions]
  Actions -->|pnpm build| Dist[生成 dist/]
  Dist -->|upload| Pages[GitHub Pages]
  Pages -->|部署| Site[在线网站]
```

## CI/CD 工作流

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: pnpm install
      - run: pnpm build
        env:
          SITE: https://${{ github.repository_owner }}.github.io
          BASE: /${{ github.event.repository.name }}
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/deploy-pages@v4
```

## 路径配置

| 场景 | SITE | BASE | 访问地址 |
| --- | --- | --- | --- |
| 本地开发 | - | - | http://localhost:4321/ |
| GitHub Pages | `https://用户名.github.io` | `/仓库名` | `https://用户名.github.io/仓库名/` |
| 自定义域名 | `https://你的域名` | `` | `https://你的域名/` |

## 链接处理

Astro 的 `base` 配置会自动处理静态资源路径，但动态生成的链接需要手动拼接：

```typescript
const baseUrl = import.meta.env.BASE_URL;

function withBase(path: string): string {
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  if (!baseUrl || baseUrl === "/") return `/${cleanPath}`;
  return `${baseUrl}/${cleanPath}`;
}

// 使用示例
withBase("/docs/01-简介");  // 本地 => /docs/01-简介
                            // GitHub => /YooMdSite/docs/01-简介
```
