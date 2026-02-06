import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://www.fabulous-art.ch',
  i18n: {
    defaultLocale: 'de',
    locales: ['de', 'en'],
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: true,
    },
  },
  build: {
    assets: '_assets',
  },
  image: {
    domains: [],
  },
});
