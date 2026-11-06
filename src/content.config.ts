// The rules every Markdown file must follow. If a field is missing or has the
// wrong type, the build stops and names the file and the field.
import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { COUNTRIES, NOT_APPLICABLE, NOT_AVAILABLE, TODO, findCountry } from './data/countries';

// The exact placeholder allowed in fields that haven't been filled in yet.
const todo = z.literal(TODO);

// Required text. Empty text isn't allowed, so a blank field can't slip through.
const text = z.string().min(1, 'This field cannot be empty.');

// A real value, or the exact TODO text. Anything else, like "12abc", fails.
const numberOrTodo = z.union([z.number().nonnegative(), todo], {
  error: `Must be a number with no quotes or commas (like 1250.5), or exactly "${TODO}".`,
});
const percentOrTodo = z.union([z.number().min(0).max(100), todo, z.literal(NOT_AVAILABLE)], {
  error: `Must be a number from 0 to 100 with no % sign, or exactly "${TODO}" or "${NOT_AVAILABLE}".`,
});
const urlOrTodo = z.union([z.url(), todo], {
  error: `Must be a full web address starting with https://, or exactly "${TODO}".`,
});
// YAML turns an unquoted 2026-01-31 into a date, which is what z.date() expects.
const dateOrTodo = z.union([z.date(), todo], {
  error: `Must be a date like 2026-01-31 with no quotes, or exactly "${TODO}".`,
});

// One exposure indicator: a number plus the year and source it comes from, so
// every figure on the site is dated and cited. Or exactly the TODO text.
// Numbers may be negative: a net energy exporter has negative import dependence.
// "Not applicable" is for a measure that doesn't fit the country (a breakeven oil
// price for an oil importer). "Not available" means no reliable source gives it.
const noValue = [todo, z.literal(NOT_APPLICABLE), z.literal(NOT_AVAILABLE)] as const;
const noValueHelp = `"${TODO}", "${NOT_APPLICABLE}" or "${NOT_AVAILABLE}"`;
const year = z.number().int().min(1990).max(2100);
const singleValue = z.object({ value: z.number(), year, source: text });
// A range, for when respected estimates disagree, like a breakeven of $80 to $96.
const rangeValue = z
  .object({ low: z.number(), high: z.number(), year, source: text })
  .refine((range) => range.low < range.high, { message: 'low must be smaller than high.' });
const indicatorOrTodo = z.union([singleValue, rangeValue, ...noValue], {
  error: `Must be { value, year, source } or { low, high, year, source }, like { value: 12.5, year: 2023, source: "World Bank" }, or exactly ${noValueHelp}.`,
});
// Import dependence also records its method. "eurostat" means net imports divided
// by gross available energy. "worldbank" is the simpler fallback, net energy
// imports as a share of energy use, for countries where the first can't be computed.
const importDependenceOrTodo = z.union(
  [
    z.object({
      value: z.number(),
      year: z.number().int().min(1990).max(2100),
      source: text,
      method: z.enum(['eurostat', 'worldbank']),
    }),
    ...noValue,
  ],
  { error: `Must be { value, year, source, method } with method "eurostat" or "worldbank", or exactly ${noValueHelp}.` },
);

// A page name made of lowercase letters, numbers and hyphens, like "hormuz-closure".
const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens only, like "hormuz-closure".');

// A list that must contain at least one item.
const textList = z.array(text).min(1, 'List at least one item.');
const sources = z
  .array(z.object({ title: text, url: urlOrTodo }))
  .min(1, 'List at least one source.');

const countryCode = z.enum(
  COUNTRIES.map((country) => country.code),
  { error: `Must be one of: ${COUNTRIES.map((country) => country.code).join(', ')}.` },
);

// Gets a file's name without its folder or ".md" ("src/x/uae.md" becomes "uae").
function fileName(entry: string) {
  return entry.split('/').pop()!.replace(/\.md$/, '');
}

const countries = defineCollection({
  loader: glob({
    pattern: '*.md',
    base: './src/content/countries',
    // The filename becomes the page URL, so it has to match the country's code.
    // Unknown codes are skipped here because the schema below reports them.
    generateId: ({ entry, data }) => {
      const name = fileName(entry);
      const country = findCountry(data.iso3);
      if (country && country.slug !== name) {
        throw new Error(
          `${entry}: a file with iso3 ${country.code} must be named ${country.slug}.md`,
        );
      }
      return name;
    },
  }),
  schema: z
    .object({
      name: text,
      iso3: countryCode,
      // producer, importer (an importer or chokepoint case), other (no forced
      // energy angle), or external (a major buyer or competing exporter).
      region: z.enum(['producer', 'importer', 'other', 'external']),
      exposureType: z.union([z.enum(['exporter', 'importer', 'mixed']), todo], {
        error: `Must be exporter, importer or mixed, or exactly "${TODO}".`,
      }),
      protectionStatus: z.union([z.enum(['protected', 'partly protected', 'exposed']), todo], {
        error: `Must be protected, partly protected or exposed, or exactly "${TODO}".`,
      }),
      gdpUsdBn: numberOrTodo,
      gdpPerCapitaUsd: numberOrTodo,
      population: numberOrTodo,
      oilGasShareOfExportsPct: percentOrTodo,
      // Exposure indicators. The globe's risk views colour countries by these.
      resourceRentsPctGdp: indicatorOrTodo,
      oilShareOfGovRevenuePct: indicatorOrTodo,
      fiscalBreakevenOilPriceUsd: indicatorOrTodo,
      energyImportDependencePct: importDependenceOrTodo,
      fuelImportsPctOfImports: indicatorOrTodo,
      nonOilGdpSharePct: indicatorOrTodo,
      // Short text for the globe's exposure panel.
      hittingNow: text,
      marketImpact: text,
      // How the country gets its oil or gas out, and any route that avoids a
      // chokepoint. "Not applicable" for countries that don't export energy.
      exportRouteStatus: text,
      // The slug of the shock chain that hits this country hardest, such as
      // "hormuz-closure". Optional: the globe panel only shows a chain button
      // when this is set.
      relatedChainSlug: slug.optional(),
      // Optional: dates and caveats for the figures, shown under Key figures.
      notes: textList.optional(),
      topExports: textList,
      topPartners: textList,
      // This list may be empty, because not every country has one of these funds.
      sovereignWealthFunds: z.array(
        // note is optional: a caveat shown right beside the fund's amount.
        z.object({ name: text, aumUsdBn: numberOrTodo, note: text.optional() }),
      ),
      currencyRegime: text,
      diversificationPlan: text,
      keyRisks: textList,
      // One likely interview question and a sharp point to make about it.
      interviewAngle: text,
      summary: text,
      sources,
      lastUpdated: dateOrTodo,
    })
    // The file's region has to agree with the master list in data/countries.ts.
    .refine((data) => findCountry(data.iso3)?.region === data.region, {
      path: ['region'],
      message: 'This does not match the region listed for this country in src/data/countries.ts.',
    }),
});

// Chokepoints: a small hand-curated data file, not full pages. The globe reads
// "status" to decide how each pin looks, so when the real world changes, you edit
// src/content/chokepoints.yaml and nothing else.
const chokepoints = defineCollection({
  loader: file('src/content/chokepoints.yaml'),
  schema: z.object({
    name: text,
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    status: z.enum(['open', 'closed', 'disputed'], { error: 'Must be open, closed or disputed.' }),
    statusAsOf: z.date({ error: 'Must be a date like 2026-10-13 with no quotes.' }),
    statusSource: z.url({ error: 'Must be a full web address starting with https://.' }),
    relatedChainSlug: slug,
  }),
});

// Shock chains: the main content type. Each one walks trigger -> energy hit ->
// economy hit -> sectors -> countries exposed or protected -> what to watch.
// No difficulty levels yet (deferred): every field is a single piece of text.
const chains = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/chains' }),
  schema: z.object({
    title: text,
    // Fast: a single event (a strait closes). Slow: a multi-year trend (peak
    // oil demand). Decides how the chain is framed and how often it's revisited.
    speed: z.enum(['fast', 'slow'], { error: 'Must be fast or slow.' }),
    // Only chains anchored to one physical place (a strait, a pipeline) get a
    // globe pin. A slow, structural chain like peak oil demand has none.
    location: z
      .object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
      .optional(),
    trigger: text,
    energyHit: text,
    economyHit: text,
    // Shown as a two-column table on the chain page.
    sectorsWinners: textList,
    sectorsLosers: textList,
    countriesExposed: z.array(countryCode).min(1, 'List at least one exposed country.'),
    // May be empty: not every chain has a country that gets away clean.
    countriesProtected: z.array(countryCode),
    whatToWatch: text,
    interviewAngle: text,
    summary: text,
    sources,
    lastUpdated: dateOrTodo,
  }),
});

// The sector cheat sheet: how each sector reacts to higher energy prices. One
// small hand-curated file, the same pattern as chokepoints.yaml. Every chain
// links here instead of re-explaining sector reactions from scratch.
const sectors = defineCollection({
  loader: file('src/content/sectors.yaml'),
  schema: z.object({
    name: text,
    reaction: z.enum(['gain', 'lose', 'depends'], { error: 'Must be gain, lose or depends.' }),
    explainer: text,
  }),
});

// Energy flow arcs for the globe: who supplies whom. A small hand-curated list,
// not full pages. Starts empty; filled in once the chains and chokepoints work.
const flows = defineCollection({
  loader: file('src/content/flows.json'),
  schema: z.object({
    from: countryCode,
    to: countryCode,
    type: z.enum(['crude-oil', 'lng', 'pipeline-oil', 'pipeline-gas'], {
      error: 'Must be crude-oil, lng, pipeline-oil or pipeline-gas.',
    }),
    unit: text,
    volume: indicatorOrTodo,
    explainer: text,
  }),
});

// The news log: short, append-only items, each tagged to the chain it belongs
// to and pinned to a place. No fixed cadence is promised anywhere in the UI,
// so this is filled in whenever there's something worth a 60-word note, not
// on a schedule.
const news = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/news' }),
  schema: z.object({
    date: z.date({ error: 'Must be a date like 2026-10-23 with no quotes.' }),
    headline: text,
    // Not programmatically enforced, the same as every other "not checked
    // automatically" text field: what happened, who's exposed, who gains.
    summary: text,
    relatedChainSlug: slug,
    location: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }),
    sources,
  }),
});

export const collections = { countries, chokepoints, chains, sectors, flows, news };
