# FabulousArt — fabulous-art.ch

Portfolio-Website für Fabienne Meyer — hyperrealistische Kohlezeichnungen, Zürich.

## Tech Stack

- **Framework:** [Astro](https://astro.build/)
- **Hosting:** Cloudflare Pages
- **Bildupload:** Cloudflare R2
- **E-Mail:** Mailjet
- **Sprachen:** DE / EN

## Setup

```bash
# Dependencies installieren
npm install

# Dev-Server starten
npm run dev

# Produktions-Build
npm run build

# Build preview
npm run preview
```

## Projektstruktur

```
src/
├── components/     # Wiederverwendbare Komponenten
├── content/        # Portfolio-Inhalte (Markdown)
├── i18n/           # Übersetzungen (de.json, en.json)
├── layouts/        # Seitenlayouts
├── pages/          # Seiten (de/ und en/)
└── styles/         # Globale Styles
```

## Deployment

Automatisch via Cloudflare Pages bei Push auf `main`.
