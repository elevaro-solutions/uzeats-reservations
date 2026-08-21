import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Tablevera Docs',
  tagline: 'Documentation for developers, partners, and diners',
  favicon: 'img/tablevera-icon.svg',

  future: {
    v4: true,
  },

  url: 'https://docs.tablevera.online',
  baseUrl: '/',

  customFields: {
    apiUrl: process.env.DOCS_API_URL ?? 'http://localhost:4000/graphql',
  },

  headTags: [
    {
      tagName: 'meta',
      attributes: {
        name: 'docs-api-url',
        content: process.env.DOCS_API_URL ?? 'http://localhost:4000/graphql',
      },
    },
  ],

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/tablevera-icon.svg',
    colorMode: {
      defaultMode: 'light',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Tablevera Docs',
      logo: {
        alt: 'Tablevera',
        src: 'img/tablevera-icon.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {
          href: 'https://tablevera.online',
          label: 'Diner app',
          position: 'right',
        },
        {
          href: 'https://dashboard.tablevera.online',
          label: 'Partner dashboard',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Guides',
          items: [
            {label: 'Developers', to: '/developers/getting-started'},
            {label: 'Diners', to: '/diners/overview'},
            {label: 'Restaurant owners', to: '/staff/overview'},
            {label: 'Platform admins', to: '/admins/platform-overview'},
          ],
        },
        {
          title: 'Reference',
          items: [
            {label: 'Architecture', to: '/architecture/overview'},
            {label: 'LLM / AI agents', to: '/llm/overview'},
            {label: 'Deployment', to: '/developers/deployment'},
          ],
        },
        {
          title: 'Product',
          items: [
            {label: 'tablevera.online', href: 'https://tablevera.online'},
            {label: 'For restaurants', href: 'https://tablevera.online/for-restaurants'},
            {label: 'Pricing', href: 'https://tablevera.online/pricing'},
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Tablevera. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json', 'graphql'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
