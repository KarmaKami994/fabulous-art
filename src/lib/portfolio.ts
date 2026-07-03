// Helper to load portfolio data from JSON (used by Astro pages)
// Data now comes from src/data/portfolio.json — editable via Decap CMS at /admin/

import portfolioData from '../data/portfolio.json';

export interface PortfolioWork {
  title: string;
  slug: string;
  image: string;
  imageFull: string;
  size: string;
  medium: string;
  year: number;
  price: string;
  sold: boolean;
  description: {
    de: string;
    en: string;
  };
}

const R2_BASE = portfolioData.r2_base;

export const portfolioWorks: PortfolioWork[] = portfolioData.works.map((w) => ({
  title: w.title,
  slug: w.slug,
  image: `${R2_BASE}/${w.thumbnail}`,
  imageFull: `${R2_BASE}/${w.fullsize}`,
  size: w.size,
  medium: w.medium,
  year: w.year,
  price: w.sold ? 'SOLD' : w.price,
  sold: w.sold,
  description: {
    de: w.description_de,
    en: w.description_en,
  },
}));

export function getWorkBySlug(slug: string): PortfolioWork | undefined {
  return portfolioWorks.find((work) => work.slug === slug);
}

export function getAllSlugs(): string[] {
  return portfolioWorks.map((work) => work.slug);
}
