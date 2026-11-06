# Middle East Explorer

An educational website about the economics and geopolitics of the Middle East and how the region interacts with major powers. It's built with Astro and globe.gl, and the content lives in Markdown files.

## Running the site

You need Node.js 22 (22.23.4 or newer).

```bash
npm install     # Download the libraries (first time only)
npm run dev     # Start the site at http://localhost:4321
npm run build   # Check every content file and build the final site
```

Press Ctrl + C to stop the dev server.

## The content rule

Never guess a figure or fact. Every real figure must be sourced and cited. If you don't have a sourced value yet, leave the field as exactly `TODO: fill in`, which shows up in yellow on the site.

## URL names and codes

Each country has a code, used inside files, and a slug, used for filenames and URLs. They're defined in `src/data/countries.ts`.

| Country | Code | Slug | Type |
|---|---|---|---|
| United Arab Emirates | `ARE` | `uae` | producer |
| Saudi Arabia | `SAU` | `sau` | producer |
| Qatar | `QAT` | `qat` | producer |
| Kuwait | `KWT` | `kwt` | producer |
| Oman | `OMN` | `omn` | producer |
| Bahrain | `BHR` | `bhr` | producer |
| Iran | `IRN` | `irn` | producer |
| Israel | `ISR` | `isr` | producer |
| Egypt | `EGY` | `egy` | producer |
| Turkey | `TUR` | `tur` | producer |
| Iraq | `IRQ` | `irq` | producer |
| Jordan | `JOR` | `jor` | importer |
| Syria | `SYR` | `syr` | other |
| Lebanon | `LBN` | `lbn` | importer |
| Palestine | `PSE` | `pse` | other |
| Yemen | `YEM` | `yem` | importer |
| United States | `USA` | `usa` | external |
| China | `CHN` | `chn` | external |
| India | `IND` | `ind` | external |
| Russia | `RUS` | `rus` | external |
| United Kingdom | `GBR` | `uk` | external |
| South Korea | `KOR` | `kor` | external |
| Japan | `JPN` | `jpn` | external |
| European Union | `EUU` | `eu` | external |

## Add a country

1. Create `src/content/countries/<slug>.md`, using the slug from the table. For Saudi Arabia, that's `sau.md`.
2. Paste in this template and fill it in. All the fields are required.
3. Run `npm run build` to check it.

```markdown
---
name: "Saudi Arabia"
iso3: "SAU"
region: "core"
gdpUsdBn: "TODO: fill in"
gdpPerCapitaUsd: "TODO: fill in"
population: "TODO: fill in"
oilGasShareOfExportsPct: "TODO: fill in"
exposureType: "TODO: fill in"
resourceRentsPctGdp: "TODO: fill in"
fiscalBreakevenOilPriceUsd: "TODO: fill in"
energyImportDependencePct: "TODO: fill in"
fuelImportsPctOfImports: "TODO: fill in"
nonOilGdpSharePct: "TODO: fill in"
hittingNow: "TODO: fill in"
marketImpact: "TODO: fill in"
topExports:
  - "TODO: fill in"
topPartners:
  - "TODO: fill in"
sovereignWealthFunds:
  - name: "TODO: fill in"
    aumUsdBn: "TODO: fill in"
currencyRegime: "TODO: fill in"
diversificationPlan: "TODO: fill in"
keyRisks:
  - "TODO: fill in"
summary: "TODO: fill in"
sources:
  - title: "TODO: fill in"
    url: "TODO: fill in"
lastUpdated: "TODO: fill in"
---

TODO: fill in: the longer written analysis goes here.
```

What you'll get:

- **Producer, importer or other:** a page at `/countries/<slug>`, a summary in the globe's panel, and a link on `/browse`.
- **External power:** a summary in the globe's panel only, with no page of its own.

### Notes on figures

Every field in the template is required, except `notes`, which is optional and isn't in the template. Use it to show readers a figure's date or caveats. Add it below `oilGasShareOfExportsPct`, or leave it out completely:

```yaml
notes:
  - "GDP: 2024 nominal."
  - "Fund assets: external estimate."
```

These values only show the format. They aren't real data.

### Country fields

| Field | Type | Notes |
|---|---|---|
| `name` | text | Display name |
| `iso3` | code | From the table above |
| `region` | `producer`, `importer`, `other` or `external` | Must match the table above |
| `exposureType` | `exporter`, `importer` or `mixed` | |
| `gdpUsdBn` | number | US$ billions |
| `gdpPerCapitaUsd` | number | US$ |
| `population` | number | Whole number of people |
| `oilGasShareOfExportsPct` | number | 0 to 100, with no `%` sign. Use exactly `"Not available"` if no reliable source gives it |
| `resourceRentsPctGdp`, `fiscalBreakevenOilPriceUsd`, `fuelImportsPctOfImports`, `nonOilGdpSharePct` | indicator | `{ value: 12.5, year: 2023, source: "World Bank" }`. Numbers may be negative |
| `energyImportDependencePct` | indicator plus `method` | As above, plus `method: eurostat` (net imports / gross available energy) or `method: worldbank` (net energy imports as % of energy use, the fallback where the first can't be computed) |
| `hittingNow`, `marketImpact` | text | Short text for the globe's exposure panel |
| `notes` | list of text | **Optional.** Dates and caveats shown under Key figures |
| `topExports` | list of text | At least one item |
| `topPartners` | list of text | At least one item |
| `sovereignWealthFunds` | list of `name` and `aumUsdBn`, plus an optional `note` | Use `[]` if the country has none. `note` appears right beside the amount |
| `currencyRegime` | text | |
| `diversificationPlan` | text | |
| `keyRisks` | list of text | At least one item |
| `summary` | text | Two sentences (not checked automatically) |
| `sources` | list of `title` and `url` | At least one |
| `lastUpdated` | date | Such as `2026-01-31` |

## Add a relationship

1. Put the two slugs in alphabetical order and join them with a hyphen. The UAE and the US become `uae-usa`.
2. Create `src/content/relationships/<slug-slug>.md`, such as `uae-usa.md`.
3. Paste in this template and fill it in. All the fields are required.
4. Run `npm run build` to check it.

```markdown
---
countryA: "ARE"
countryB: "USA"
title: "TODO: fill in"
summary: "TODO: fill in"
tradeAtoB: "TODO: fill in"
tradeBtoA: "TODO: fill in"
investmentFlows: "TODO: fill in"
energyTies: "TODO: fill in"
securityTies: "TODO: fill in"
recentDevelopments:
  - "TODO: fill in"
whyItMatters: "TODO: fill in"
interviewAngle: "TODO: fill in"
sources:
  - title: "TODO: fill in"
    url: "TODO: fill in"
lastUpdated: "TODO: fill in"
---

TODO: fill in: the longer written analysis goes here.
```

You'll get a page at `/relationships/<slug-slug>`, a summary and link when someone clicks both countries on the globe (in either order), and a link on `/browse`.

### Relationship fields

| Field | Type | Notes |
|---|---|---|
| `countryA`, `countryB` | code | Two different codes from the table above, not slugs |
| `title` | text | |
| `summary` | text | Two sentences (not checked automatically) |
| `tradeAtoB` | text | Trade from country A to country B |
| `tradeBtoA` | text | Trade from country B to country A |
| `investmentFlows` | text | |
| `energyTies` | text | |
| `securityTies` | text | |
| `recentDevelopments` | list of text | At least one item |
| `whyItMatters` | text | |
| `interviewAngle` | text | |
| `sources` | list of `title` and `url` | At least one |
| `lastUpdated` | date | Such as `2026-01-31` |

The text below the second `---` is the longer written analysis.

## Filling in real values

Every number, web address and date field accepts either a real value or exactly `TODO: fill in`:

```yaml
gdpUsdBn: 1250.5                  # Numbers have no quotes or commas
lastUpdated: 2026-01-31           # Dates have no quotes
url: "https://example.org/report" # Web addresses must be complete
```

The values above only show the format. They aren't real data.

## When the build shows an error

`npm run build` stops and names the file and field that need fixing. For example:

```text
countries → uae data does not match collection schema.
gdpUsdBn: Must be a number with no quotes or commas (like 1250.5), or exactly "TODO: fill in".
```

The rules are in `src/content.config.ts`.

## Where things are

| Path | What it's for |
|---|---|
| `src/content/` | The Markdown content files |
| `src/content.config.ts` | The rules each content file must follow |
| `src/data/countries.ts` | The list of clickable countries, EU members and map positions |
| `src/pages/` | One file or template per kind of page |
| `src/scripts/globe.ts` | Everything the globe does |
| `src/styles/global.css` | All the styling |
| `public/data/countries.geojson` | Natural Earth country shapes, already prepared |
| `scripts/build-map-data.mjs` | Recreates the map file, and is only needed for fresh map data |

## Deploying

Vercel rebuilds the live site each time you push to GitHub. If a content file has an error, the build fails and the previous version stays live.
