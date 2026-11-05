// The rules every Markdown file must follow. If a field is missing or has the
// wrong type, the build stops and names the file and the field.
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { COUNTRIES, NOT_AVAILABLE, TODO, findCountry, relationshipSlug } from './data/countries';

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
      region: z.enum(['core', 'external']),
      gdpUsdBn: numberOrTodo,
      gdpPerCapitaUsd: numberOrTodo,
      population: numberOrTodo,
      oilGasShareOfExportsPct: percentOrTodo,
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

const relationships = defineCollection({
  loader: glob({
    pattern: '*.md',
    base: './src/content/relationships',
    // Same idea as above: a pair's filename must match its two country codes.
    generateId: ({ entry, data }) => {
      const name = fileName(entry);
      const expected = relationshipSlug(data.countryA, data.countryB);
      if (expected && data.countryA !== data.countryB && expected !== name) {
        throw new Error(
          `${entry}: a file for ${data.countryA} and ${data.countryB} must be named ${expected}.md`,
        );
      }
      return name;
    },
  }),
  schema: z
    .object({
      countryA: countryCode,
      countryB: countryCode,
      title: text,
      summary: text,
      tradeAtoB: text,
      tradeBtoA: text,
      investmentFlows: text,
      energyTies: text,
      securityTies: text,
      recentDevelopments: textList,
      whyItMatters: text,
      interviewAngle: text,
      sources,
      lastUpdated: dateOrTodo,
    })
    .refine((data) => data.countryA !== data.countryB, {
      path: ['countryB'],
      message: 'countryA and countryB must be two different countries.',
    }),
});

export const collections = { countries, relationships };
