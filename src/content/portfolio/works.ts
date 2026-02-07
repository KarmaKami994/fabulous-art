export interface PortfolioWork {
  title: string;
  slug: string;
  image: string;
  imageFull: string;
  size: string;
  medium: string;
  year: number;
  price: string;
  description: {
    de: string;
    en: string;
  };
}

/**
 * Portfolio-Werke — hier neue Werke hinzufügen.
 * Bilder gehören in /public/images/portfolio/
 * 
 * Für jedes Werk:
 * - image: Vorschaubild im Grid (kann komprimiert sein)
 * - imageFull: Vollbild für die Detail-Seite (hohe Qualität)
 * - slug: URL-freundlicher Name (keine Leerzeichen, Umlaute etc.)
 */
export const portfolioWorks: PortfolioWork[] = [
  {
    title: 'Inside the Box',
    slug: 'inside-the-box',
    image: '/images/portfolio/inside-the-box.svg',       // TODO: Ersetze mit .jpg
    imageFull: '/images/portfolio/inside-the-box-full.svg', // TODO: Ersetze mit .jpg
    size: '140 × 140 cm',
    medium: 'Charcoal on paper',
    year: 2024,
    price: "CHF 22'000",
    description: {
      de: 'Eine hyperrealistische Kohlezeichnung, die eine in durchsichtiges Material gehüllte Figur zeigt — eine Reflexion über Verletzlichkeit und Schutz.',
      en: 'A hyperrealistic charcoal drawing depicting a figure wrapped in translucent material — a reflection on vulnerability and protection.',
    },
  },
  {
    title: 'Fragile',
    slug: 'fragile',
    image: '/images/portfolio/fragile.svg',       // TODO: Ersetze mit .jpg
    imageFull: '/images/portfolio/fragile-full.svg', // TODO: Ersetze mit .jpg
    size: '77 × 110 cm',
    medium: 'Charcoal on paper',
    year: 2025,
    price: "CHF 8'500",
    description: {
      de: 'Der menschliche Körper in Bewegung, umwickelt mit "Fragile"-Klebeband — eine Auseinandersetzung mit Zerbrechlichkeit und Stärke.',
      en: 'The human body in motion, wrapped in "Fragile" tape — an exploration of fragility and strength.',
    },
  },
  {
    title: 'Entangled',
    slug: 'entangled',
    image: '/images/portfolio/entangled.svg',       // TODO: Ersetze mit .jpg
    imageFull: '/images/portfolio/entangled-full.svg', // TODO: Ersetze mit .jpg
    size: '100 × 150 cm',
    medium: 'Charcoal on paper',
    year: 2024,
    price: "CHF 15'000",
    description: {
      de: 'Eine Figur, verstrickt in einem Netz aus Linien und Formen — ein Bild der Verbundenheit und Komplexität menschlicher Beziehungen.',
      en: 'A figure entangled in a web of lines and shapes — an image of connection and the complexity of human relationships.',
    },
  },
  {
    title: 'Movement',
    slug: 'movement',
    image: '/images/portfolio/movement.svg',       // TODO: Ersetze mit .jpg
    imageFull: '/images/portfolio/movement-full.svg', // TODO: Ersetze mit .jpg
    size: '120 × 180 cm',
    medium: 'Charcoal on paper',
    year: 2024,
    price: "CHF 18'000",
    description: {
      de: 'Drei Tänzerinnen, eingefangen in einem Moment dynamischer Bewegung — eine Hommage an die Ausdruckskraft des menschlichen Körpers.',
      en: 'Three dancers captured in a moment of dynamic movement — a tribute to the expressiveness of the human body.',
    },
  },
];

export function getWorkBySlug(slug: string): PortfolioWork | undefined {
  return portfolioWorks.find((work) => work.slug === slug);
}
