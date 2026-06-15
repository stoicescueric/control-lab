import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import mdx from "@mdx-js/rollup";
import tailwindcss from "@tailwindcss/vite";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

// `base: "./"` makes every asset path relative, so the built site works at any
// sub-path (e.g. https://you.github.io/control-lab/) with zero extra config.
// We pair that with a HashRouter (see src/App.jsx) so deep links never 404.
export default defineConfig({
  base: "./",
  plugins: [
    // MDX must run *before* the React plugin so .mdx becomes JSX first.
    {
      enforce: "pre",
      ...mdx({
        remarkPlugins: [remarkGfm, remarkMath],
        rehypePlugins: [rehypeKatex],
        providerImportSource: "@mdx-js/react",
      }),
    },
    react({ include: /\.(jsx|js|mdx|md|tsx|ts)$/ }),
    tailwindcss(),
  ],
});
