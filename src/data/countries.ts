// The master list of every clickable country on the site.
// This is the one place that connects a real code (ARE) to its URL name (uae).
// Only identifiers live here. Statistics belong in the Markdown files.

// The placeholder text for fields that haven't been filled in yet.
export const TODO = 'TODO — fill in';

// For a figure no reliable source gives. This is different from a TODO: the
// research has been done, and the honest answer is that the number doesn't exist.
export const NOT_AVAILABLE = 'Not available';

// lat and lng are rough map positions, used only to place arcs and Bahrain's dot.
// They point at the main landmass, such as the mainland US rather than Alaska.
export const COUNTRIES = [
  // Core countries
  { code: 'ARE', slug: 'uae', name: 'United Arab Emirates', region: 'core', lat: 24, lng: 54 },
  { code: 'SAU', slug: 'sau', name: 'Saudi Arabia', region: 'core', lat: 24, lng: 45 },
  { code: 'QAT', slug: 'qat', name: 'Qatar', region: 'core', lat: 25.3, lng: 51.2 },
  { code: 'KWT', slug: 'kwt', name: 'Kuwait', region: 'core', lat: 29.3, lng: 47.6 },
  { code: 'OMN', slug: 'omn', name: 'Oman', region: 'core', lat: 21, lng: 57 },
  { code: 'BHR', slug: 'bhr', name: 'Bahrain', region: 'core', lat: 26, lng: 50.55 },
  { code: 'IRN', slug: 'irn', name: 'Iran', region: 'core', lat: 32, lng: 53 },
  { code: 'ISR', slug: 'isr', name: 'Israel', region: 'core', lat: 31.4, lng: 34.9 },
  { code: 'EGY', slug: 'egy', name: 'Egypt', region: 'core', lat: 26.5, lng: 30 },
  { code: 'TUR', slug: 'tur', name: 'Turkey', region: 'core', lat: 39, lng: 35 },
  { code: 'IRQ', slug: 'irq', name: 'Iraq', region: 'core', lat: 33, lng: 44 },
  { code: 'JOR', slug: 'jor', name: 'Jordan', region: 'core', lat: 31, lng: 36.5 },
  { code: 'SYR', slug: 'syr', name: 'Syria', region: 'core', lat: 35, lng: 38.5 },
  { code: 'LBN', slug: 'lbn', name: 'Lebanon', region: 'core', lat: 33.9, lng: 35.9 },
  { code: 'PSE', slug: 'pse', name: 'Palestine', region: 'core', lat: 31.9, lng: 35.25 },
  { code: 'YEM', slug: 'yem', name: 'Yemen', region: 'core', lat: 15.5, lng: 47.5 },
  // External powers
  { code: 'USA', slug: 'usa', name: 'United States', region: 'external', lat: 39, lng: -98 },
  { code: 'CHN', slug: 'chn', name: 'China', region: 'external', lat: 35, lng: 103 },
  { code: 'IND', slug: 'ind', name: 'India', region: 'external', lat: 21, lng: 79 },
  { code: 'RUS', slug: 'rus', name: 'Russia', region: 'external', lat: 60, lng: 95 },
  { code: 'GBR', slug: 'uk', name: 'United Kingdom', region: 'external', lat: 54, lng: -2 },
  { code: 'KOR', slug: 'kor', name: 'South Korea', region: 'external', lat: 36.5, lng: 127.8 },
  { code: 'JPN', slug: 'jpn', name: 'Japan', region: 'external', lat: 36.5, lng: 138 },
  // France, Germany and Italy are EU members, but each is clickable on its own.
  { code: 'FRA', slug: 'fra', name: 'France', region: 'external', lat: 46.5, lng: 2.5 },
  { code: 'DEU', slug: 'deu', name: 'Germany', region: 'external', lat: 51, lng: 10 },
  { code: 'ITA', slug: 'ita', name: 'Italy', region: 'external', lat: 42.8, lng: 12.5 },
  // The EU has no ISO3 country code, so we use the World Bank's code for it.
  { code: 'EUU', slug: 'eu', name: 'European Union', region: 'external', lat: 50.8, lng: 4.4 },
] as const;

// The EU members the globe treats as one clickable group. There are 24 here,
// because France, Germany and Italy have their own entries above.
export const EU_MEMBERS = [
  'AUT', 'BEL', 'BGR', 'HRV', 'CYP', 'CZE', 'DNK', 'EST', 'FIN',
  'GRC', 'HUN', 'IRL', 'LVA', 'LTU', 'LUX',
  'MLT', 'NLD', 'POL', 'PRT', 'ROU', 'SVK', 'SVN', 'ESP', 'SWE',
];

// Find a country by its code. Returns undefined if the code isn't in the list.
export function findCountry(code: unknown) {
  return COUNTRIES.find((country) => country.code === code);
}

// Build a relationship's filename from two country codes, with the slugs in
// alphabetical order. Both ('ARE', 'GBR') and ('GBR', 'ARE') give 'uae-uk',
// so the order you click two countries in doesn't matter.
export function relationshipSlug(codeA: unknown, codeB: unknown) {
  const a = findCountry(codeA);
  const b = findCountry(codeB);
  if (!a || !b) return undefined;
  return [a.slug, b.slug].sort().join('-');
}

// Takes a code from the map and finds which clickable entry it belongs to:
// 'ESP' gives the EU, 'ARE' gives the UAE, and 'BRA' gives undefined (greyed out).
export function findCountryOnMap(mapCode: string) {
  // The map calls Palestine 'PSX', while the World Bank and our files use 'PSE'.
  if (mapCode === 'PSX') return findCountry('PSE');
  return findCountry(EU_MEMBERS.includes(mapCode) ? 'EUU' : mapCode);
}
