import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";

// 当 BASE 为空时，不设置 base 属性
const base = process.env.BASE || undefined;
// 当 SITE 为空时，不设置 site 属性
const site = process.env.SITE || undefined;

export default defineConfig({
  site: site,
  base: base,
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
