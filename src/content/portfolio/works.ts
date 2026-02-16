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
    title: 'The dance of eternal threads',
    slug: 'The dance of eternal threads',
    image: '/images/portfolio/Thumbnail/Thedanceofeternaltreads.png',       
    imageFull: '/images/portfolio/FullSize/Thedanceofeternaltreads.png', 
    size: '100 × 125 cm',
    medium: 'Charcoal on paper',
    year: 2025,
    price: "CHF 13'000",
    description: {
      de: 'Arachne, die Weberin, die dazu verflucht wurde, eine Spinne zu sein, verwandelt ihr Gefängnis in eine Bühne. Ein Tanz ewiger, kreativer Rebellion gegen die Götter.',
      en: 'Arachne, the weaver cursed to be a spider, transforms her prison into a stage. A dance of eternal, creative rebellion against the Gods.',
    },
  },
  {
    title: 'Fragile',
    slug: 'Fragile',
    image: '/images/portfolio/Thumbnail/fragile.jpg',       
    imageFull: '/images/portfolio/FullSize/fragile_full.png', 
    size: '77 × 110.5 cm',
    medium: 'Charcoal on paper',
    year: 2024,
    price: "CHF 8'500",
    description: {
      de: 'Dieses Kunstwerk fängt Verletzlichkeit und verborgene Stärke ein. Die Frau, die im Spagat auf einem Bein balanciert, symbolisiert unsere täglichen Kämpfe. Sie ist in Klebeband eingewickelt, das kühn mit „Fragile“ (Zerbrechlich) beschriftet ist – ein Etikett, das wir uns oft selbst zuschreiben und das Selbstzweifel sowie den Glauben widerspiegelt, wir seien empfindlicher, als wir es tatsächlich sind. Doch ihre Pose zeigt unglaubliches Gleichgewicht und Kontrolle. Sie ist nicht zerbrochen; sie steht fest. Das Band hindert sie nicht daran, ihre innere Kraft zur Schau zu stellen. Dieses Werk erinnert uns daran, dass wir uns oft selbst unterschätzen und uns in unserem eigenen Körper unwohl fühlen, obwohl wir zu erstaunlichen Dingen fähig sind. „Fragile“ ist keine Schwäche, sondern eine Momentaufnahme des menschlichen Daseins – das Annehmen unserer Zerbrechlichkeit, während wir gleichzeitig unsere unbestreitbare Widerstandsfähigkeit erkennen. Es fordert uns heraus, selbst auferlegte Etiketten infrage zu stellen und die wahre Stärke in uns zu sehen.',
      en: 'This artwork captures vulnerability and hidden strength. The woman, balancing on one leg in a split, symbolizes our daily struggles. She’s wrapped in tape, boldly labeled „Fragile“ – a tag we often place on ourselves, representing self-doubt and the belief we’re more delicate than we are. Yet, her pose shows incredible balance and control. She isn’t broken; she stands firm. The tape doesn’t prevent her from showcasing her inner power. This piece reminds us that we often underestimate ourselves and feel uncomfortable in our own bodies, despite being capable of amazing things. „Fragile“ isn’t a weakness, but a snapshot of the human condition – embracing our fragility while recognizing our undeniable resilience. It challenges us to question self-imposed labels and see the true strength within.',
    },
  },
  {
    title: 'The Graces',
    slug: 'The Graces',
    image: '/images/portfolio/Thumbnail/TheGraces.png',
    imageFull: '/images/portfolio/FullSize/TheGraces_full.png',
    size: '100 × 125 cm',
    medium: 'Charcoal on paper',
    year: 2025,
    price: "CHF 14'000",
    description: {
      de: 'Drei Frauen, die sich wie eine Einheit bewegen. Inspiriert von den antiken griechischen Göttinnen der Schönheit, der Freude und des Charmes – dieses Werk ist ein Tribut an Anmut, Verbindung und Fluss. Ein stiller Tanz, eingefangen in Linien und Licht.',
      en: 'Three women, moving as one. Inspired by the ancient Greek goddesses of beauty, joy and charm - this piece is a tribute to grace, connection and flow. A quit dance captured in lines and light.',
    },
  },
  {
    title: 'Purity',
    slug: 'Purity',
    image: '/images/portfolio/Thumbnail/Purity.png',
    imageFull: '/images/portfolio/FullSize/Purity_full.png',
    size: '70 × 100 cm',
    medium: 'Charcoal on paper',
    year: 2024,
    price: "CHF 8'100",
    description: {
      de: 'Drei Frauen, die sich wie eine Einheit bewegen. Inspiriert von den antiken griechischen Göttinnen der Schönheit, der Freude und des Charmes – dieses Werk ist ein Tribut an Anmut, Verbindung und Fluss. Ein stiller Tanz, eingefangen in Linien und Licht.',
      en: 'Three women, moving as one. Inspired by the ancient Greek goddesses of beauty, joy and charm - this piece is a tribute to grace, connection and flow. A quit dance captured in lines and light.',
    },
  },
  {
    title: 'Inside the box',
    slug: 'Inside the box',
    image: '/images/portfolio/Thumbnail/Insidethebox.png',
    imageFull: '/images/portfolio/FullSize/Insidethebox_full.png',
    size: '140 × 140 cm',
    medium: 'Charcoal on paper',
    year: 2024,
    price: "CHF 22'000",
    description: {
      de: 'Drei Frauen, die sich wie eine Einheit bewegen. Inspiriert von den antiken griechischen Göttinnen der Schönheit, der Freude und des Charmes – dieses Werk ist ein Tribut an Anmut, Verbindung und Fluss. Ein stiller Tanz, eingefangen in Linien und Licht.',
      en: 'Three women, moving as one. Inspired by the ancient Greek goddesses of beauty, joy and charm - this piece is a tribute to grace, connection and flow. A quit dance captured in lines and light.',
    },
  },
    {
    title: 'Born into waste',
    slug: 'Born into waste',
    image: '/images/portfolio/Thumbnail/Bornintowaste.png',
    imageFull: '/images/portfolio/FullSize/Bornintowaste_full.png',
    size: '85.5 × 105.5 cm',
    medium: 'Charcoal on paper',
    year: 2024,
    price: "CHF 10'000",
    description: {
      de: 'Drei Frauen, die sich wie eine Einheit bewegen. Inspiriert von den antiken griechischen Göttinnen der Schönheit, der Freude und des Charmes – dieses Werk ist ein Tribut an Anmut, Verbindung und Fluss. Ein stiller Tanz, eingefangen in Linien und Licht.',
      en: 'Three women, moving as one. Inspired by the ancient Greek goddesses of beauty, joy and charm - this piece is a tribute to grace, connection and flow. A quit dance captured in lines and light.',
    },
  },
  {
    title: 'Human',
    slug: 'Human',
    image: '/images/portfolio/Thumbnail/Human.png',
    imageFull: '/images/portfolio/FullSize/Human_full.png',
    size: '100 × 125 cm',
    medium: 'Charcoal on paper',
    year: 2023,
    price: "SOLD",
    description: {
      de: 'Drei Frauen, die sich wie eine Einheit bewegen. Inspiriert von den antiken griechischen Göttinnen der Schönheit, der Freude und des Charmes – dieses Werk ist ein Tribut an Anmut, Verbindung und Fluss. Ein stiller Tanz, eingefangen in Linien und Licht.',
      en: 'Three women, moving as one. Inspired by the ancient Greek goddesses of beauty, joy and charm - this piece is a tribute to grace, connection and flow. A quit dance captured in lines and light.',
    },
  },
    {
    title: 'Sweet dreams',
    slug: 'Sweet dreams',
    image: '/images/portfolio/Thumbnail/Sweetdreams.png',
    imageFull: '/images/portfolio/FullSize/Sweetdreams_full.png',
    size: '50 × 70 cm',
    medium: 'Charcoal on paper',
    year: 2023,
    price: "CHF 5'200",
    description: {
      de: 'Drei Frauen, die sich wie eine Einheit bewegen. Inspiriert von den antiken griechischen Göttinnen der Schönheit, der Freude und des Charmes – dieses Werk ist ein Tribut an Anmut, Verbindung und Fluss. Ein stiller Tanz, eingefangen in Linien und Licht.',
      en: 'Three women, moving as one. Inspired by the ancient Greek goddesses of beauty, joy and charm - this piece is a tribute to grace, connection and flow. A quit dance captured in lines and light.',
    },
  },
  {
    title: 'Freedom',
    slug: 'Freedom',
    image: '/images/portfolio/Thumbnail/Freedom.png',
    imageFull: '/images/portfolio/FullSize/Freedom_full.png',
    size: '70 × 100 cm',
    medium: 'Charcoal on paper',
    year: 2023,
    price: "CHF 7'000",
    description: {
      de: 'Drei Frauen, die sich wie eine Einheit bewegen. Inspiriert von den antiken griechischen Göttinnen der Schönheit, der Freude und des Charmes – dieses Werk ist ein Tribut an Anmut, Verbindung und Fluss. Ein stiller Tanz, eingefangen in Linien und Licht.',
      en: 'Three women, moving as one. Inspired by the ancient Greek goddesses of beauty, joy and charm - this piece is a tribute to grace, connection and flow. A quit dance captured in lines and light.',
    },
  },
   {
    title: 'Beauty marks',
    slug: 'Beauty marks',
    image: '/images/portfolio/Thumbnail/Beautymarks.png',
    imageFull: '/images/portfolio/FullSize/Beautymarks_full.png',
    size: '30 × 42 cm',
    medium: 'Charcoal on paper',
    year: 2023,
    price: "SOLD",
    description: {
      de: 'Drei Frauen, die sich wie eine Einheit bewegen. Inspiriert von den antiken griechischen Göttinnen der Schönheit, der Freude und des Charmes – dieses Werk ist ein Tribut an Anmut, Verbindung und Fluss. Ein stiller Tanz, eingefangen in Linien und Licht.',
      en: 'Three women, moving as one. Inspired by the ancient Greek goddesses of beauty, joy and charm - this piece is a tribute to grace, connection and flow. A quit dance captured in lines and light.',
    },
  },
    {
    title: 'The sunkissed girl',
    slug: 'The sunkissed girl',
    image: '/images/portfolio/Thumbnail/Thesunkissedgirl.png',
    imageFull: '/images/portfolio/FullSize/Thesunkissedgirl._full.png',
    size: '30 × 42 cm',
    medium: 'Charcoal on paper',
    year: 2023,
    price: "CHF 4'500",
    description: {
      de: 'Drei Frauen, die sich wie eine Einheit bewegen. Inspiriert von den antiken griechischen Göttinnen der Schönheit, der Freude und des Charmes – dieses Werk ist ein Tribut an Anmut, Verbindung und Fluss. Ein stiller Tanz, eingefangen in Linien und Licht.',
      en: 'Three women, moving as one. Inspired by the ancient Greek goddesses of beauty, joy and charm - this piece is a tribute to grace, connection and flow. A quit dance captured in lines and light.',
    },
  },
  {
    title: 'Satisfaction',
    slug: 'Satisfaction',
    image: '/images/portfolio/Thumbnail/Satisfaction.png',
    imageFull: '/images/portfolio/FullSize/Satisfaction_full.png',
    size: '70 × 100 cm',
    medium: 'Charcoal on paper',
    year: 2023,
    price: "CHF 7'000",
    description: {
      de: 'Drei Frauen, die sich wie eine Einheit bewegen. Inspiriert von den antiken griechischen Göttinnen der Schönheit, der Freude und des Charmes – dieses Werk ist ein Tribut an Anmut, Verbindung und Fluss. Ein stiller Tanz, eingefangen in Linien und Licht.',
      en: 'Three women, moving as one. Inspired by the ancient Greek goddesses of beauty, joy and charm - this piece is a tribute to grace, connection and flow. A quit dance captured in lines and light.',
    },
  },
  {
    title: 'The Stain',
    slug: 'The Stain',
    image: '/images/portfolio/Thumbnail/TheStain.jpg',      
    imageFull: '/images/portfolio/FullSize/TheStain.png', 
    size: '50 cm x 65 cm',
    medium: 'Charcoal on paper',
    year: 2024,
    price: "SOLD",
    description: {
      de: 'Das Bild zeigt ein Mädchen, das mit zahlreichen bunten Punkten auf ihrem Körper und ihrer Kleidung geschmückt ist. Diese Punkte symbolisieren die vielfältigen Erfahrungen und Einflüsse, die uns im Laufe unseres Lebens prägen. Das Mädchen im Bild repräsentiert die individuelle Persönlichkeit. Sie ist von den Punkten auf ihrem Körper gezeichnet, wird jedoch nicht von ihnen eingeschränkt. Sie blickt den Betrachter direkt an und demonstriert damit das Bewusstsein für ihre eigene Identität. Wir sollten nicht zulassen, dass wir über unsere „Punkte“ definiert werden, sondern sie vielmehr als Teil dessen annehmen, wer wir sind.',
      en: 'The image depicts a girl adorned with numerous colorful spots on her body and clothing. These spots symbolize the diverse experiences and influences that shape us throughout our lives. The girl in the picture represents the individual personality. She is marked by the spots on her body, yet she is not confined by them. She gazes directly at the viewer, demonstrating her awareness of her identity. We should not allow ourselves to be defined by our spots, but rather embrace them as part of who we are.',
    },
  },
  {
    title: 'The Cage',
    slug: 'The Cage',
    image: '/images/portfolio/Thumbnail/Thecage.jpg',
    imageFull: '/images/portfolio/FullSize/Thecage_full.png',
    size: '50 × 70 cm',
    medium: 'Charcoal on paper',
    year: 2022,
    price: "CHF 5'200",
    description: {
      de: 'Drei Frauen, die sich wie eine Einheit bewegen. Inspiriert von den antiken griechischen Göttinnen der Schönheit, der Freude und des Charmes – dieses Werk ist ein Tribut an Anmut, Verbindung und Fluss. Ein stiller Tanz, eingefangen in Linien und Licht.',
      en: 'Three women, moving as one. Inspired by the ancient Greek goddesses of beauty, joy and charm - this piece is a tribute to grace, connection and flow. A quit dance captured in lines and light.',
    },
  },
  {
    title: 'Survivor',
    slug: 'Survivor',
    image: '/images/portfolio/Thumbnail/Survivor.png',
    imageFull: '/images/portfolio/FullSize/Survivor_full.png',
    size: '100 × 125 cm',
    medium: 'Charcoal on paper',
    year: 2022,
    price: "CHF 12'000",
    description: {
      de: 'Drei Frauen, die sich wie eine Einheit bewegen. Inspiriert von den antiken griechischen Göttinnen der Schönheit, der Freude und des Charmes – dieses Werk ist ein Tribut an Anmut, Verbindung und Fluss. Ein stiller Tanz, eingefangen in Linien und Licht.',
      en: 'Three women, moving as one. Inspired by the ancient Greek goddesses of beauty, joy and charm - this piece is a tribute to grace, connection and flow. A quit dance captured in lines and light.',
    },
  },
  {
    title: 'Imprisoned spirit',
    slug: 'Imprisoned spirit',
    image: '/images/portfolio/Thumbnail/Imprisonedspirit.png',
    imageFull: '/images/portfolio/FullSize/Imprisonedspirit_full.jpg',
    size: '70 × 100 cm',
    medium: 'Charcoal on paper',
    year: 2012,
    price: "CHF 6'800",
    description: {
      de: 'Drei Frauen, die sich wie eine Einheit bewegen. Inspiriert von den antiken griechischen Göttinnen der Schönheit, der Freude und des Charmes – dieses Werk ist ein Tribut an Anmut, Verbindung und Fluss. Ein stiller Tanz, eingefangen in Linien und Licht.',
      en: 'Three women, moving as one. Inspired by the ancient Greek goddesses of beauty, joy and charm - this piece is a tribute to grace, connection and flow. A quit dance captured in lines and light.',
    },
  },
  {
    title: 'Trapped Soul',
    slug: 'Trapped Soul',
    image: '/images/portfolio/Thumbnail/Trappedsoul.png',
    imageFull: '/images/portfolio/FullSize/Trappedsoul_full.jpg',
    size: '70 × 100 cm',
    medium: 'Charcoal on paper',
    year: 2021,
    price: "CHF 6'800",
    description: {
      de: 'Drei Frauen, die sich wie eine Einheit bewegen. Inspiriert von den antiken griechischen Göttinnen der Schönheit, der Freude und des Charmes – dieses Werk ist ein Tribut an Anmut, Verbindung und Fluss. Ein stiller Tanz, eingefangen in Linien und Licht.',
      en: 'Three women, moving as one. Inspired by the ancient Greek goddesses of beauty, joy and charm - this piece is a tribute to grace, connection and flow. A quit dance captured in lines and light.',
    },
  },
];

export function getWorkBySlug(slug: string): PortfolioWork | undefined {
  return portfolioWorks.find((work) => work.slug === slug);
}
