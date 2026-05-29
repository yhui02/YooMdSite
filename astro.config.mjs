import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";

export default defineConfig({
  site: process.env.SITE || "http://localhost:4321",
  base: process.env.BASE || "",
  integrations: [tailwind()],
  markdown: {
    shikiConfig: {
      theme: "github-dark",
    },
  },
});
