import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import node from "@astrojs/node";

// 当 BASE 为空时，不设置 base 属性
const base = process.env.BASE || undefined;
// 当 SITE 为空时，不设置 site 属性
const site = process.env.SITE || undefined;

// RENDER_MODE=ssr 时启用 SSR 模式，否则为 SSG（静态生成）
const isSSR = process.env.RENDER_MODE === "ssr";

export default defineConfig({
  site: site,
  base: base,
  output: isSSR ? "server" : "static",
  adapter: isSSR
    ? node({
        mode: "standalone",
      })
    : undefined,
  integrations: [tailwind()],
  devToolbar: {
    enabled: false,
  },
  markdown: {
    shikiConfig: {
      theme: "github-dark",
    },
  },
});
