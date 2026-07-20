# Verkaufstool unter `/verkauf`

Das frühere lokale Python-/SQLite-Tool wurde in das bestehende Astro- und
Cloudflare-Pages-Projekt integriert.

## Architektur

- Oberfläche: statische Astro-Seite unter `/verkauf/`
- API: Cloudflare Pages Functions unter `/api/verkauf/*`
- Datenbank: Cloudflare D1, Binding `SHOP_DB`
- Anmeldung: Cloudflare Access mit E-Mail-Einmalcode
- CSV/XLSX: wird im Browser gelesen und erzeugt; die Function erhält nur JSON
- Berechtigungen: eine gemeinsame Zugriffsstufe, da nur die Künstlerin Zugriff hat

Die Seite ist nicht verlinkt und erhält `noindex`/`no-store`. Der eigentliche
Schutz kommt trotzdem zwingend von Cloudflare Access.

## 1. Abhängigkeiten installieren

```bash
npm install
```

## 2. D1-Datenbank und Binding

Die D1-Datenbank ist bereits erstellt und in `wrangler.toml` eingetragen:

```toml
[[d1_databases]]
binding = "SHOP_DB"
database_name = "fabulous-art-shop"
database_id = "a30447e6-d94b-43f8-8206-0dd89a65e722"
```

Das Pages-Projekt wird über `wrangler.toml` konfiguriert. Diese Datei ist daher
die maßgebliche Konfiguration; die gleichen Bindings sind im Cloudflare-Dashboard
nur sichtbar und können dort nicht bearbeitet werden. Nach dem nächsten
Deployment erscheint das D1-Binding im Dashboard als `SHOP_DB`.

`SHOP_DB` ist der Variablenname für das Backend (`context.env.SHOP_DB`). Er muss
nicht mit dem Datenbanknamen übereinstimmen.

## 3. Datenbankschema anwenden

Lokal:

```bash
npm run shop:db:local:init
```

Optionale lokale Testdaten:

```bash
npm run shop:db:local:seed
```

Produktion, erst nach Kontrolle der Datenbank-ID:

```bash
npm run shop:db:remote:init
```

Die Produktionsdatenbank bleibt ohne Testdaten. Neue Ware wird danach über den
CSV-/XLSX-Import angelegt.

## 4. Lokal testen

`.env.example` nach `.dev.vars` kopieren. Für das Verkaufstool müssen darin
mindestens diese beiden lokalen Werte stehen:

```dotenv
DEV_AUTH_BYPASS=true
DEV_USER_EMAIL=lokal@fabulous-art.ch
```

Dann:

```bash
npm run shop:dev
```

Wrangler stellt die Website normalerweise unter `http://localhost:8788` bereit.
Das Tool liegt unter:

```text
http://localhost:8788/verkauf/
```

`npm run dev` startet nur Astro und besitzt keine Pages Functions oder D1.
Für den vollständigen Verkaufstest deshalb `npm run shop:dev` verwenden.

## 5. Cloudflare Access mit Einmalcode konfigurieren

Cloudflare Zero Trust öffnen. Unter **Settings → Authentication → Login
methods** zuerst **One-time PIN** aktivieren. Bei neueren Zero-Trust-Konten ist
OTP nicht zwingend automatisch eingerichtet.

Danach **eine einzige** Self-hosted-Anwendung erstellen und dieser Anwendung
die folgenden Public Hostnames/Pfade hinzufügen:

```text
www.fabulous-art.ch/verkauf
www.fabulous-art.ch/verkauf/*
www.fabulous-art.ch/api/verkauf
www.fabulous-art.ch/api/verkauf/*
```

Falls die Domain auch ohne `www` direkt erreichbar ist, dieselben vier Pfade
für `fabulous-art.ch` in derselben Anwendung ergänzen. UI und API müssen zur
gleichen Access-Anwendung gehören, damit beide dasselbe Audience-Tag verwenden.

Access-Policy:

- Action: **Allow**
- Include: **Emails** → ausschliesslich die exakte E-Mail-Adresse der Künstlerin
- Require: **Login Methods** → **One-time PIN**

Nicht nur `Login Methods: One-time PIN` als Include-Regel verwenden; ohne die
konkrete E-Mail-Einschränkung könnte sonst jede gültige E-Mail-Adresse einen
Code anfordern.

Danach in der Access-Anwendung den **Application Audience (AUD) Tag** kopieren.
Die Team-Domain steht typischerweise unter
`https://<team-name>.cloudflareaccess.com`.

Die nicht-sensiblen Access-Werte sind ebenfalls bereits in `wrangler.toml`
eingetragen:

```toml
ACCESS_TEAM_DOMAIN = "https://fabulous-art.cloudflareaccess.com"
ACCESS_AUD = "252793553dc55027cf585600fbdefcd3e1ce199a7463fe6dc71d63157be7224f"
```

Nach dem nächsten Deployment gelten sie für die Pages Functions. Die API prüft
das von Access gelieferte JWT nochmals selbst und verweigert Zugriffe, wenn
Variablen oder Token fehlen.

`DEV_AUTH_BYPASS` darf in Cloudflare niemals gesetzt werden. Zusätzlich akzeptiert
der Code diesen Bypass technisch nur bei `localhost`, `127.0.0.1` oder `::1`.

## 6. Deployment

Vor dem Push:

```bash
npm run check
npm test
npm run build
```

Danach normal auf `main` pushen. Cloudflare Pages führt den bestehenden Build
aus. Vor dem ersten produktiven Aufruf müssen D1-Binding, Migration, Access und
die beiden Access-Variablen eingerichtet sein.

## Datenmodell

### Produkte

```text
UID / Ware / Bezeichnung / Typ / Limited NR / Grösse / Anzahl / Preis / Status
```

- UID: 1–6 Zeichen, nur `A–Z` und `0–9`
- Kunstwerk + Print: Limited NR, Grösse, Preis, Status; Bestand 0 oder 1
- Kunstwerk + Postkarte: Anzahl, Preis, Status
- Buch: Anzahl, Preis, Status

### Verkäufe

Jeder Verkauf speichert Preis, Menge, Zeitpunkt und die von Cloudflare Access
bestätigte E-Mail-Adresse. Rücknahmen bleiben historisch erhalten und werden
nicht aus der Datenbank gelöscht.

### Import

- neue UID: neues Produkt
- vorhandene UID: Produkt wird aktualisiert
- maximal 300 Produktzeilen pro Import
- zuerst vollständige Validierung, danach atomarer D1-Batch
- der Import setzt den aktuellen Bestand, erzeugt aber keine Umsatzbuchungen
- Umsatz entsteht nur durch den grünen Verkaufsbutton

## Wichtige Betriebsregel

Vor grösseren Importen zuerst den aktuellen Bestand als CSV oder XLSX
herunterladen. D1 bietet zusätzlich Wiederherstellung, der Export ist aber die
schnellste fachliche Sicherung für diese kleine Anwendung.
