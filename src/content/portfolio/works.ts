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

// Ändere diese URL wenn du auf Custom Domain wechselst (z.B. https://images.fabulous-art.ch)
const R2_BASE = 'https://pub-4c1a1d3bcc4f437faf31c8e1bea0cb6c.r2.dev';

/**
 * Portfolio-Werke — hier neue Werke hinzufügen.
 * Bilder liegen auf Cloudflare R2 (fabulous-art-images Bucket).
 *
 * WICHTIG: Backticks (`) verwenden für Template Literals!
 *   ✅  `${R2_BASE}/portfolio/...`
 *   ❌  '${R2_BASE}/portfolio/...'
 */

export const portfolioWorks: PortfolioWork[] = [
  {
    title: 'The dance of eternal threads',
    slug: 'the-dance-of-eternal-threads',
    image: `${R2_BASE}/portfolio/Thumbnail/Thedanceofeternaltreads.png`,
    imageFull: `${R2_BASE}/portfolio/Fullsize/Thedanceofeternaltreads.png`,
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
    slug: 'fragile',
    image: `${R2_BASE}/portfolio/Thumbnail/fragile.jpg`,
    imageFull: `${R2_BASE}/portfolio/Fullsize/fragile_full.png`,
    size: '77 × 110.5 cm',
    medium: 'Charcoal on paper',
    year: 2025,
    price: "CHF 8'500",
    description: {
      de: 'Die Balance zwischen Verletzlichkeit und Stärke. Während das "Fragile"-Klebeband für Selbstzweifel steht, symbolisiert die kontrollierte Pose volle Widerstandsfähigkeit. Eine Erinnerung daran, dass wir trotz unserer Unsicherheiten zu Erstaunlichem fähig sind. Wahre Stärke liegt im Akzeptieren unserer Zerbrechlichkeit.',
      en: 'The balance between vulnerability and strength. While the "Fragile" tape represents self-doubt, the controlled pose symbolizes complete resilience. A reminder that despite our insecurities, we are capable of extraordinary things. True strength lies in accepting our fragility.',
    },
  },
  {
    title: 'The Graces',
    slug: 'the-graces',
    image: `${R2_BASE}/portfolio/Thumbnail/TheGraces.png`,
    imageFull: `${R2_BASE}/portfolio/Fullsize/TheGraces_full.png`,
    size: '100 × 125 cm',
    medium: 'Charcoal on paper',
    year: 2025,
    price: "CHF 14'000",
    description: {
      de: 'Drei Frauen, die sich als eine Einheit bewegen. Inspiriert durch die antiken griechischen Göttinnen Aglaia (Schönheit), Euphrosyne (Freude) und Thaleia (Charme). Dieses Stück ist eine Hommage an Anmut, Verbindung und Flow. Ein stiller Tanz, eingefangen in Linien und Licht.',
      en: 'Three women moving as one. Inspired by the ancient Greek goddesses Aglaia (Splendor), Euphrosyne (Mirth), and Thalia (Abundance). This piece is an homage to grace, connection, and flow. A silent dance captured in lines and light.',
    },
  },
  {
    title: 'Purity',
    slug: 'purity',
    image: `${R2_BASE}/portfolio/Thumbnail/Purity.png`,
    imageFull: `${R2_BASE}/portfolio/Fullsize/Purity_full.png`,
    size: '70 × 100 cm',
    medium: 'Charcoal on paper',
    year: 2024,
    price: "CHF 8'100",
    description: {
      de: '„Purity“ ist ein Spiegelbild unserer Seele. Dieses Kunstwerk spiegelt die Sehnsucht nach Harmonie und Gleichgewicht wider. Es erinnert uns daran, dass wahre Schönheit von innen kommt und dass wir nach aussen strahlen, wenn wir mit uns selbst im Reinen sind. In einer Welt voller Hektik und Trubel bietet dieses Werk einen stillen Rückzugsort für die Seele.',
      en: '„Purity“ is a reflection of our soul. This artwork reflects the longing for harmony and balance. It reminds us that true beauty comes from within and that we radiate outward when we are at peace with ourselves. In a world full of hustle and bustle, this work offers a quiet retreat for the soul.',
    },
  },
  {
    title: 'Inside the Box',
    slug: 'inside-the-box',
    image: `${R2_BASE}/portfolio/Thumbnail/Insidethebox.png`,
    imageFull: `${R2_BASE}/portfolio/Fullsize/Insidethebox_full.png`,
    size: '140 × 140 cm',
    medium: 'Charcoal on paper',
    year: 2024,
    price: "CHF 22'000",
    description: {
      de: 'Stell dir vor, dein Geist ist eine prall gefüllte Schatztruhe, in der du all deine Erfahrungen, Erinnerungen und Emotionen aufbewahrst. Jede Schublade dieser Truhe enthält einen Schatz. Ein Stück deiner Persönlichkeit. Mal ist es die Schublade mit der kindlichen Neugier, mal die mit der erwachsenen Verantwortung. Manchmal finden wir in den Tiefen der Truhe versteckte Schätze, von denen wir gar nicht wussten, dass sie existieren.',
      en: 'Imagine your mind is a bursting treasure chest in which you keep all your experiences, memories, and emotions. Every drawer of this chest contains a treasure. A piece of your personality. Sometimes it is the drawer with childlike curiosity, sometimes the one with adult responsibility. Sometimes we find hidden treasures in the depths of the chest that we didnt even know existed.',
    },
  },
  {
    title: 'Born into Waste',
    slug: 'born-into-waste',
    image: `${R2_BASE}/portfolio/Thumbnail/Bornintowaste.png`,
    imageFull: `${R2_BASE}/portfolio/Fullsize/Bornintowaste_full.png`,
    size: '85.5 × 105.5 cm',
    medium: 'Charcoal on paper',
    year: 2024,
    price: "CHF 10'000",
    description: {
      de: 'Stell dir vor, in einer Welt geboren zu werden, in der Plastikfolie deine Wiege ist. Das ist die Realität unseres Planeten. Millionen Tonnen Plastikmüll ersticken unsere Ozeane, töten Wildtiere und gelangen in unsere Nahrungskette. Wir ertrinken in einem Meer aus Plastik. Unser Planet erstickt unter dem Gewicht unserer Verschmutzung. Es ist Zeit aufzuwachen und zu handeln. Gemeinsam können wir eine Welt schaffen, in der Kinder nicht in Müll geboren werden.',
      en: 'Imagine being born into a world where plastic wrap is your cradle. This is the reality of our planet. Millions of tons of plastic waste are suffocating our oceans, killing wildlife, and entering our food chain. We are drowning in a sea of plastic. Our planet is suffocating under the weight of our pollution. It is time to wake up and act. Together, we can create a world where children are not born into trash.',
    },
  },
  {
    title: 'Human',
    slug: 'human',
    image: `${R2_BASE}/portfolio/Thumbnail/Human.png`,
    imageFull: `${R2_BASE}/portfolio/Fullsize/Human_full.png`,
    size: '100 × 125 cm',
    medium: 'Charcoal on paper',
    year: 2023,
    price: 'SOLD',
    description: {
      de: 'Eine Gruppe von Menschen aus verschiedenen Nationen. Es soll darauf aufmerksam machen, dass wir alle gleich sind, unabhängig von unserer Herkunft. Wir sind alle Menschen, und wir sollten gemeinsam in Harmonie leben. Gewalt und Konflikte sind keine Lösung. Das Bild ist ein Aufruf zur Toleranz und zum Frieden. Es wurde in einer Zeit der politischen und sozialen Spannungen geschaffen.',
      en: 'A group of people from different nations. It is intended to draw attention to the fact that we are all the same, regardless of our origin. We are all humans, and we should live together in harmony. Violence and conflict are not a solution. The image is a call for tolerance and peace. It was created in a time of political and social tension.',
    },
  },
  {
    title: 'Sweet Dreams',
    slug: 'sweet-dreams',
    image: `${R2_BASE}/portfolio/Thumbnail/Sweetdreams.png`,
    imageFull: `${R2_BASE}/portfolio/Fullsize/Sweetdreams_full.png`,
    size: '50 × 70 cm',
    medium: 'Charcoal on paper',
    year: 2023,
    price: "CHF 5'200",
    description: {
      de: 'Zerrissen und neu zusammengeklebt. Die sichtbaren Brüche in diesem Bild stehen für die Hindernisse des Lebens. Sie sind jedoch kein Scheitern, sondern ein Zeichen von Hoffnung und Widerstandskraft. Eine Ermutigung, trotz Rückschlägen optimistisch weiterzumachen.',
      en: 'Torn apart and glued back together. The visible fractures in this image represent the obstacles of life. However, they are not a failure, but a sign of hope and resilience. An encouragement to continue optimistically despite setbacks.',
    },
  },
  {
    title: 'Freedom',
    slug: 'freedom',
    image: `${R2_BASE}/portfolio/Thumbnail/Freedom.png`,
    imageFull: `${R2_BASE}/portfolio/Fullsize/Freedom_full.png`,
    size: '70 × 100 cm',
    medium: 'Charcoal on paper',
    year: 2023,
    price: "CHF 7'000",
    description: {
      de: 'Freiheit bedeutet für jeden etwas anderes. Für mich bedeutet sie, loszulassen und mir selbst treu zu sein. Jeden Moment im Leben zu geniessen, selbst die kleinsten Dinge. Was bedeutet Freiheit für dich? Das funkelnde Blattgold auf den Schmetterlingen soll die kostbare und flüchtige Natur der Freiheit verkörpern.',
      en: 'Freedom means something different to everyone. For me, it means letting go and being true to myself. Enjoying every moment in life, even the smallest things. What does freedom mean to you? The sparkling gold leaf on the butterflies is meant to embody the precious and fleeting nature of freedom.',
    },
  },
  {
    title: 'Beauty Marks',
    slug: 'beauty-marks',
    image: `${R2_BASE}/portfolio/Thumbnail/Beautymarks.png`,
    imageFull: `${R2_BASE}/portfolio/Fullsize/Beautfymarks_full.png`,
    size: '30 × 42 cm',
    medium: 'Charcoal on paper',
    year: 2023,
    price: 'SOLD',
    description: {
      de: 'Das Bild ist eine Botschaft der Selbstliebe. Es zeigt, dass Schönheitsflecken nicht als Makel, sondern als einzigartige Merkmale angesehen werden können. Die Künstlerin möchte die Betrachter*innen ermutigen, ihren eigenen Schönheitsflecken zu akzeptieren und zu lieben. In den sozialen Medien werden oft unrealistische Schönheitsideale vermittelt, die zu Selbstzweifeln und Unzufriedenheit führen können.',
      en: 'The image is a message of self-love. It shows that beauty marks can be seen not as flaws, but as unique features. The artist wants to encourage viewers to accept and love their own beauty marks. Social media often conveys unrealistic beauty standards that can lead to self-doubt and dissatisfaction.',
    },
  },
  {
    title: 'The Sunkissed Girl',
    slug: 'the-sunkissed-girl',
    image: `${R2_BASE}/portfolio/Thumbnail/Thesunkissedgirl.png`,
    imageFull: `${R2_BASE}/portfolio/Fullsize/Thesunkissedgirl._full.png`,
    size: '30 × 42 cm',
    medium: 'Charcoal on paper',
    year: 2023,
    price: "CHF 4'500",
    description: {
      de: 'Ihre Sommersprossen sind wie winzige goldene Sterne, die ihre Haut in einen einzigartigen Kosmos verwandeln. Jede Sommersprosse ist ein Miniatur-Meisterwerk der Natur, das sie zu einem wahrhaft unverwechselbaren und schönen Wesen macht. In einer Welt, die oft nach Perfektion strebt, erinnert sie uns daran, dass wahre Schönheit in der Individualität liegt.',
      en: 'Her freckles are like tiny golden stars, transforming her skin into a unique cosmos. Each freckle is a miniature masterpiece of nature, making her a truly distinctive and beautiful being. In a world that often strives for perfection, she reminds us that true beauty lies in individuality.',
    },
  },
  {
    title: 'Satisfaction',
    slug: 'satisfaction',
    image: `${R2_BASE}/portfolio/Thumbnail/Satisfaction.png`,
    imageFull: `${R2_BASE}/portfolio/Fullsize/Satisfaction_full.png`,
    size: '70 × 100 cm',
    medium: 'Charcoal on paper',
    year: 2022,
    price: "CHF 10'000",
    description: {
      de: 'Das Werk thematisiert das Recht auf Selbstbestimmung. Eine junge Frau, gefangen im Labyrinth fremder Erwartungen, kämpft um ihren eigenen Weg. Als Symbol für den Ausbruch aus gesellschaftlichen Zwängen wird sie zur Heldin, die trotz Einsamkeit und Unsicherheit entschlossen für ihre Freiheit einsteht.',
      en: 'The work addresses the right to self-determination. A young woman, trapped in the labyrinth of others expectations, fights for her own path. As a symbol of breaking out of social constraints, she becomes a heroine who, despite loneliness and insecurity, resolutely stands up for her freedom.',
    },
  },
  {
    title: 'The Stain',
    slug: 'the-stain',
    image: `${R2_BASE}/portfolio/Thumbnail/TheStain.jpg`,
    imageFull: `${R2_BASE}/portfolio/Fullsize/TheStain.png`,
    size: '50 × 65 cm',
    medium: 'Charcoal on paper',
    year: 2022,
    price: 'SOLD',
    description: {
      de: 'Das Bild zeigt ein Mädchen mit vielen Farbflecken auf ihrem Körper und ihrer Kleidung. Die Flecken symbolisieren die vielfältigen Erfahrungen und Einflüsse, die uns im Laufe unseres Lebens prägen. Das Mädchen im Bild steht für die individuelle Persönlichkeit. Sie ist geprägt von den Flecken auf ihrem Körper, aber sie ist nicht gefangen in ihnen. Sie blickt den Betrachtenden direkt an und zeigt, dass sie sich ihrer Identität bewusst ist.',
      en: 'The image shows a girl with many paint stains on her body and clothing. The stains symbolize the diverse experiences and influences that shape us throughout our lives. The girl in the image represents the individual personality. She is shaped by the stains on her body, but she is not trapped in them. She looks directly at the viewer and shows that she is conscious of her identity.',
    },
  },
  {
    title: 'The Cage',
    slug: 'the-cage',
    image: `${R2_BASE}/portfolio/Thumbnail/Thecage.jpg`,
    imageFull: `${R2_BASE}/portfolio/Fullsize/Thecage_full.png`,
    size: '50 × 70 cm',
    medium: 'Charcoal on paper',
    year: 2022,
    price: "CHF 5'200",
    description: {
      de: 'Gefangen im eigenen Körper. Das Gefühl, den eigenen Erwartungen nicht gerecht zu werden, kann eine schwere Last sein. Der Druck, perfekt zu sein, ist allgegenwärtig und führt oft dazu, dass wir uns in unserem eigenen Körper unwohl fühlen. Es ist wichtig zu erkennen, dass niemand perfekt ist und dass es okay ist, Schwächen zu haben.',
      en: 'Trapped in ones own body. The feeling of not living up to ones own expectations can be a heavy burden. The pressure to be perfect is omnipresent and often leads to us feeling uncomfortable in our own bodies. It is important to realize that no one is perfect and that it is okay to have weaknesses.',
    },
  },
  {
    title: 'Survivor',
    slug: 'survivor',
    image: `${R2_BASE}/portfolio/Thumbnail/Survivor.png`,
    imageFull: `${R2_BASE}/portfolio/Fullsize/Survivor_full.png`,
    size: '100 × 125 cm',
    medium: 'Charcoal on paper',
    year: 2022,
    price: "CHF 12'000",
    description: {
      de: 'Ein Paar, verbunden und doch distanziert. Als Metapher für zwischenmenschliche Beziehungen zeigt das Bild das Paradoxon unserer Existenz. Bindungen schenken uns Kraft, können sich aber auch wie Fesseln anfühlen.',
      en: 'A couple, connected and yet distant. As a metaphor for interpersonal relationships, the image shows the paradox of our existence. Bonds give us strength, but they can also feel like shackles.',
    },
  },
  {
    title: 'Imprisoned Spirit',
    slug: 'imprisoned-spirit',
    image: `${R2_BASE}/portfolio/Thumbnail/Imprisonedspirit.png`,
    imageFull: `${R2_BASE}/portfolio/Fullsize/Imprisonedspirit_full.jpg`,
    size: '70 × 100 cm',
    medium: 'Charcoal on paper',
    year: 2022,
    price: "CHF 6'800",
    description: {
      de: 'Das Kunstwerk legt die unverfälschte Emotion offen, im eigenen Geist gefangen zu sein. Ein beklemmendes Gefühl, das zu Verzweiflung und Hoffnungslosigkeit führen kann.',
      en: 'The artwork lays bare the raw emotion of being trapped within ones own mind, a suffocating sensation that can lead to feelings of despair and hopelessness.',
    },
  },
  {
    title: 'Trapped Soul',
    slug: 'trapped-soul',
    image: `${R2_BASE}/portfolio/Thumbnail/Trappedsoul.png`,
    imageFull: `${R2_BASE}/portfolio/Fullsize/Trappedsoul_full.jpg`,
    size: '70 × 100 cm',
    medium: 'Charcoal on paper',
    year: 2021,
    price: "CHF 6'800",
    description: {
      de: 'Dieses Kunstwerk erkundet die Reise der Selbstentdeckung und die Herausforderungen, denen wir auf diesem Weg begegnen. Es symbolisiert die inneren Konflikte, die entstehen können, während wir durch unsere eigenen Gedanken, Emotionen und Überzeugungen navigieren.',
      en: 'This artwork explores the journey of self-discovery and the challenges we face along the way. It symbolizes the internal conflicts that can arise as we navigate our own thoughts, emotions, and beliefs.',
    },
  },
];

export function getWorkBySlug(slug: string): PortfolioWork | undefined {
  return portfolioWorks.find((work) => work.slug === slug);
}