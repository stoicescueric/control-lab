import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

// ---------------------------------------------------------------------------
// Tailwind v4 integration. Docusaurus compiles CSS through PostCSS/webpack, so
// we hook the official Tailwind v4 PostCSS plugin into the pipeline. The actual
// theme tokens + utilities live in src/css/custom.css (CSS-first config). We
// import utilities only (no Preflight) there so Tailwind never clobbers Infima.
// ---------------------------------------------------------------------------
function tailwindPlugin() {
  return {
    name: 'control-lab-tailwind',
    configurePostCss(postcssOptions: {plugins: unknown[]}) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      postcssOptions.plugins.push(require('@tailwindcss/postcss'));
      return postcssOptions;
    },
  };
}

// GitHub Pages target. Project site served at https://stoicescueric.github.io/control-lab/.
const ORG = 'stoicescueric';
const REPO = 'control-lab';

const config: Config = {
  title: 'Control Lab',
  tagline: 'Control theory, state estimation & FTC robotics — from the math to the metal.',
  favicon: 'img/logo.svg',

  // Faster Rust-based bundling (swc/lightningcss) — shipped with the scaffold.
  future: {
    v4: true,
    faster: true,
  },

  url: `https://${ORG}.github.io`,
  baseUrl: `/${REPO}/`,

  organizationName: ORG,
  projectName: REPO,
  trailingSlash: false,

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  // Preconnect to the Google Fonts origins so the font CSS + woff2 files start
  // downloading as early as possible (the crossorigin one is for the font files).
  headTags: [
    {
      tagName: 'link',
      attributes: {rel: 'preconnect', href: 'https://fonts.googleapis.com'},
    },
    {
      tagName: 'link',
      attributes: {rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous'},
    },
  ],

  stylesheets: [
    // Brand typefaces: Inter for UI/prose, JetBrains Mono for code. The font
    // stacks in custom.css already list these first; this is what actually loads
    // them. `display=swap` avoids invisible text while the fonts arrive.
    {
      href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap',
      type: 'text/css',
    },
    // KaTeX stylesheet (math rendering). Self-version-pinned to the installed
    // katex package; served from jsDelivr so we don't ship the font payload.
    {
      href: 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css',
      type: 'text/css',
      crossorigin: 'anonymous',
    },
  ],

  markdown: {
    mermaid: false,
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/docs',
          remarkPlugins: [remarkMath],
          rehypePlugins: [rehypeKatex],
          editUrl: `https://github.com/${ORG}/${REPO}/tree/main/`,
          showLastUpdateTime: true,
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/control-lab-social-card.svg',
    colorMode: {
      defaultMode: 'light',
      respectPrefersColorScheme: true,
    },
    docs: {
      sidebar: {
        hideable: true,
        autoCollapseCategories: true,
      },
    },
    navbar: {
      title: 'Control Lab',
      logo: {
        alt: 'Control Lab',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'curriculum',
          position: 'left',
          label: 'Curriculum',
        },
        {
          href: `https://github.com/${ORG}/${REPO}`,
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Curriculum',
          items: [
            {label: 'Preface — Why Math Matters', to: '/docs/preface/why-math-matters'},
            {label: 'Signal Processing', to: '/docs/signal-processing'},
            {label: 'Control Theory', to: '/docs/control-theory'},
          ],
        },
        {
          title: 'Resources',
          items: [
            {label: 'CTRL ALT FTC', href: 'https://www.ctrlaltftc.com/'},
            {label: 'Game Manual 0', href: 'https://gm0.org/en/latest/'},
            {label: 'Controls Engineering in FRC', href: 'https://file.tavsys.net/control/controls-engineering-in-frc.pdf'},
          ],
        },
        {
          title: 'More',
          items: [
            {label: 'GitHub', href: `https://github.com/${ORG}/${REPO}`},
          ],
        },
      ],
      copyright: `Control Lab · MIT-licensed · © ${new Date().getFullYear()}. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.oneLight,
      darkTheme: prismThemes.oneDark,
      additionalLanguages: ['java', 'bash', 'json'],
    },
  } satisfies Preset.ThemeConfig,

  plugins: [tailwindPlugin],
};

export default config;
