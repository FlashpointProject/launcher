import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Flashpoint Launcher Docs',
  tagline: 'Documentation website for development and configuration',
  favicon: 'img/favicon.svg',

  url: 'https://flashpointproject.github.io/',
  baseUrl: '/launcher/',

  organizationName: 'FlashpointProject',
  projectName: 'launcher',
  trailingSlash: false,

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  markdown: {
    mermaid: true
  },
  themes: [
    '@docusaurus/theme-mermaid'
  ],

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          path: '../docs',
          routeBasePath: '/docs',
          showLastUpdateTime: true,
          sidebarPath: './sidebars.ts',
          editUrl:
            'https://github.com/FlashpointProject/launcher/edit/develop/website/',
        },
        theme: {
          customCss: ['./src/css/core.css']
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      defaultMode: 'dark'
    },
    // Replace with your project's social card
    image: 'img/meta.png',
    navbar: {
      title: 'Flashpoint Launcher',
      logo: {
        alt: 'Flashpoint Archive Logo',
        src: 'img/icon.png',
      },
      items: [
        {
          type: 'doc',
          docId: 'introduction',
          position: 'left',
          label: 'Getting Started',
        },
        {
          type: 'doc',
          docId: 'configuration/introduction',
          position: 'left',
          label: 'Configuration',
        },
        {
          type: 'doc',
          docId: 'development/introduction',
          position: 'left',
          label: 'Development',
        },
        {
          type: 'doc',
          docId: 'extensions/overview',
          position: 'left',
          label: 'Extensions',
        },
        {
          href: 'https://github.com/FlashpointProject/launcher',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Getting Started',
              to: '/docs/introduction',
            },
            {
              label: 'Configuration',
              to: '/docs/configuration/introduction'
            }, {
              label: 'Development',
              to: '/docs/development/introduction'
            }, {
              label: 'Extensions',
              to: '/docs/extensions/overview'
            }
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Discord',
              href: 'https://discordapp.com/invite/qhvAkhWXU5',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/FlashpointProject',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Flashpoint Archive.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
