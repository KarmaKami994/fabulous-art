import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://www.fabulous-art.ch',
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'de',
        locales: {
          de: 'de-CH',
          en: 'en-US',
        },
      },
      filter: (page) =>
        // Exclude index redirect page
        !page.endsWith('fabulous-art.ch/'),
    }),
  ],
  i18n: {
    defaultLocale: 'de',
    locales: ['de', 'en'],
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: false,
    },
  },
  build: {
    assets: '_assets',
  },
  image: {
    // Allow build-time optimization of portfolio images hosted on R2:
    // full-quality originals stay on R2, the build emits resized WebP.
    domains: ['pub-4c1a1d3bcc4f437faf31c8e1bea0cb6c.r2.dev'],
  },
});
