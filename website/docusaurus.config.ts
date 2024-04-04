import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Flashpoint Launcher',
  tagline: 'We do the archive stuff',
  favicon: 'img/favicon.svg',

  url: 'https://flashpointproject.github.io/',
  baseUrl: '/launcher/',

  organizationName: 'FlashpointProject',
  projectName: 'launcher',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

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
          routeBasePath: '/',
          showLastUpdateTime: true,
          sidebarPath: './sidebars.ts',
          editUrl:
            'https://github.com/FlashpointProject/launcher/edit/develop/website/',
        },
        theme: {},
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/docusaurus-social-card.jpg',
    navbar: {
      title: 'Flashpoint Launcher',
      logo: {
        alt: 'Flashpoint Archive Logo',
        src: 'img/icon.png',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'mainSidebar',
          position: 'left',
          label: 'Main',
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
              label: 'Main',
              to: '/docs',
            },
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
      copyright: `Copyright © ${new Date().getFullYear()} Flashpoint Archive. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
