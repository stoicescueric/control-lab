import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

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

const ORG = 'stoicescueric';
const REPO = 'control-lab';

const config: Config = {
  title: 'Control Lab',
  tagline: 'Control theory, state estimation & FTC robotics - from the math to the metal.',
  favicon: 'img/logo.svg',

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

  headTags: [
    {
      tagName: 'link',
      attributes: {rel: 'preconnect', href: 'https://fonts.googleapis.com'},
    },
    {
      tagName: 'link',
      attributes: {rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous'},
    },
    // Note: manifest / theme-color / apple-touch-icon are injected by the PWA
    // plugin's `pwaHead` (see the plugins array) so they aren't duplicated here.
  ],

  stylesheets: [
    {
      href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap',
      type: 'text/css',
    },
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
        gtag: {
          trackingID: 'G-DP9QJ8EJWH',
          anonymizeIP: true,
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/control-lab-social-card.png',
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
          to: '/docs/references',
          label: 'References',
          position: 'left',
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
            {label: 'Preface - Why Math Matters', to: '/docs/preface/why-math-matters'},
            {label: 'Signal Processing', to: '/docs/signal-processing'},
            {label: 'Control Theory', to: '/docs/control-theory'},
          ],
        },
        {
          title: 'Resources',
          items: [
            {label: 'References & Resources', to: '/docs/references'},
            {label: 'CTRL ALT FTC', href: 'https://www.ctrlaltftc.com/'},
            {label: 'Game Manual 0', href: 'https://gm0.org/en/latest/'},
            {label: 'Controls Engineering in FRC', href: 'https://file.tavsys.net/control/controls-engineering-in-frc.pdf'},
          ],
        },
        {
          title: 'More',
          items: [
            {label: 'Contributors', to: '/contributors'},
            {label: 'GitHub', href: `https://github.com/${ORG}/${REPO}`},
          ],
        },
      ],
      copyright: `Control Lab / MIT-licensed / Copyright ${new Date().getFullYear()}. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.oneLight,
      darkTheme: prismThemes.oneDark,
      additionalLanguages: ['java', 'bash', 'json'],
    },
  } satisfies Preset.ThemeConfig,

  themes: [
    [
      // Offline, build-time full-text search (no external service). Adds the
      // navbar search box and indexes every doc page.
      require.resolve('@easyops-cn/docusaurus-search-local'),
      {
        hashed: true,
        indexDocs: true,
        indexBlog: false,
        docsRouteBasePath: '/docs',
        highlightSearchTermsOnTargetPage: true,
        explicitSearchResultPath: true,
      },
    ],
  ],

  plugins: [
    tailwindPlugin,
    [
      // Offline support + installability. Registers a service worker (production
      // builds only) and injects the PWA head tags. Reads the static manifest.
      '@docusaurus/plugin-pwa',
      {
        debug: false,
        offlineModeActivationStrategies: ['appInstalled', 'standalone', 'queryString'],
        pwaHead: [
          {tagName: 'link', rel: 'manifest', href: `/${REPO}/manifest.webmanifest`},
          {tagName: 'meta', name: 'theme-color', content: '#4f6cf7'},
          {tagName: 'link', rel: 'apple-touch-icon', href: `/${REPO}/img/logo.svg`},
        ],
      },
    ],
  ],
};

export default config;
