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
      postcssOptions.plugins.push(
        {
          postcssPlugin: 'control-lab-katex-woff2-only',
          Declaration(declaration: {prop: string; value: string}) {
            if (declaration.prop !== 'src' || !declaration.value.includes('KaTeX_')) return;
            const woff2Source = declaration.value.match(
              /url\(([^)]*KaTeX_[^)]*\.woff2)\)\s*format\((["']?)woff2\2\)/,
            );
            if (woff2Source) {
              declaration.value = woff2Source[0];
            }
          },
        },
        require('@tailwindcss/postcss'),
      );
      return postcssOptions;
    },
  };
}

const ORG = 'stoicescueric';
const REPO = 'control-lab';
const IS_PRODUCTION_BUILD =
  process.env.NODE_ENV === 'production' || process.argv.some((argument) => argument === 'build');

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
    ...(IS_PRODUCTION_BUILD
      ? [
          {
            tagName: 'meta',
            attributes: {
              'http-equiv': 'Content-Security-Policy',
              content: [
                "default-src 'self'",
                "base-uri 'self'",
                "object-src 'none'",
                "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
                "style-src 'self' 'unsafe-inline'",
                "img-src 'self' data:",
                "connect-src 'self' https://*.google-analytics.com",
                'frame-src https://www.youtube-nocookie.com',
              ].join(';'),
            },
          },
        ]
      : []),
    // Note: manifest / theme-color / apple-touch-icon are injected by the PWA
    // plugin's `pwaHead` (see the plugins array) so they aren't duplicated here.
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
          rehypePlugins: [
            [
              rehypeKatex,
              {
                trust: false,
                strict: 'warn',
                maxExpand: 1000,
              },
            ],
          ],
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
            {label: 'Privacy & Cookies', to: '/privacy'},
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

  clientModules: [require.resolve('./src/clientModules/fitMath.ts')],

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
