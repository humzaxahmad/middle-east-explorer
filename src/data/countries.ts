// The master list of every clickable country on the site.
// This is the one place that connects a real code (ARE) to its URL name (uae).
// Only identifiers live here. Statistics belong in the Markdown files.

// The placeholder text for fields that haven't been filled in yet.
export const TODO = 'TODO: fill in';

// For a figure no reliable source gives. This is different from a TODO: the
// research has been done, and the honest answer is that the number doesn't exist.
export const NOT_AVAILABLE = 'Not available';

// For a measure that doesn't fit the country, such as a breakeven oil price for
// a country that doesn't export oil.
export const NOT_APPLICABLE = 'Not applicable';

// lat and lng are rough map positions, used only to place arcs and Bahrain's dot.
// They point at the main landmass, such as the mainland US rather than Alaska.
export const COUNTRIES = [
  // Producers
  { code: 'ARE', slug: 'uae', name: 'United Arab Emirates', region: 'producer', lat: 24, lng: 54 },
  { code: 'SAU', slug: 'sau', name: 'Saudi Arabia', region: 'producer', lat: 24, lng: 45 },
  { code: 'QAT', slug: 'qat', name: 'Qatar', region: 'producer', lat: 25.3, lng: 51.2 },
  { code: 'KWT', slug: 'kwt', name: 'Kuwait', region: 'producer', lat: 29.3, lng: 47.6 },
  { code: 'OMN', slug: 'omn', name: 'Oman', region: 'producer', lat: 21, lng: 57 },
  { code: 'BHR', slug: 'bhr', name: 'Bahrain', region: 'producer', lat: 26, lng: 50.55 },
  { code: 'IRN', slug: 'irn', name: 'Iran', region: 'producer', lat: 32, lng: 53 },
  { code: 'ISR', slug: 'isr', name: 'Israel', region: 'producer', lat: 31.4, lng: 34.9 },
  { code: 'EGY', slug: 'egy', name: 'Egypt', region: 'producer', lat: 26.5, lng: 30 },
  { code: 'TUR', slug: 'tur', name: 'Turkey', region: 'producer', lat: 39, lng: 35 },
  { code: 'IRQ', slug: 'irq', name: 'Iraq', region: 'producer', lat: 33, lng: 44 },
  // Importer and chokepoint cases
  { code: 'JOR', slug: 'jor', name: 'Jordan', region: 'importer', lat: 31, lng: 36.5 },
  { code: 'LBN', slug: 'lbn', name: 'Lebanon', region: 'importer', lat: 33.9, lng: 35.9 },
  { code: 'YEM', slug: 'yem', name: 'Yemen', region: 'importer', lat: 15.5, lng: 47.5 },
  // Weak fit for the energy angle: standard profiles
  { code: 'SYR', slug: 'syr', name: 'Syria', region: 'other', lat: 35, lng: 38.5 },
  { code: 'PSE', slug: 'pse', name: 'Palestine', region: 'other', lat: 31.9, lng: 35.25 },
  // External powers
  { code: 'USA', slug: 'usa', name: 'United States', region: 'external', lat: 39, lng: -98 },
  { code: 'CHN', slug: 'chn', name: 'China', region: 'external', lat: 35, lng: 103 },
  { code: 'IND', slug: 'ind', name: 'India', region: 'external', lat: 21, lng: 79 },
  { code: 'RUS', slug: 'rus', name: 'Russia', region: 'external', lat: 60, lng: 95 },
  { code: 'GBR', slug: 'uk', name: 'United Kingdom', region: 'external', lat: 54, lng: -2 },
  { code: 'KOR', slug: 'kor', name: 'South Korea', region: 'external', lat: 36.5, lng: 127.8 },
  { code: 'JPN', slug: 'jpn', name: 'Japan', region: 'external', lat: 36.5, lng: 138 },
  // The EU gets a full page like Jordan, unlike the other buyers above: it's a
  // heavy energy importer with real diversification dynamics (away from
  // Russian gas), not just a trading partner. The EU has no ISO3 code, so we
  // use the World Bank's code for it.
  { code: 'EUU', slug: 'eu', name: 'European Union', region: 'importer', lat: 50.8, lng: 4.4 },
] as const;

// All 27 EU members. The globe treats them as one clickable bloc, because energy
// policy, sanctions and LNG diversification are decided at EU level.
export const EU_MEMBERS = [
  'AUT', 'BEL', 'BGR', 'HRV', 'CYP', 'CZE', 'DNK', 'EST', 'FIN',
  'FRA', 'DEU', 'GRC', 'HUN', 'IRL', 'ITA', 'LVA', 'LTU', 'LUX',
  'MLT', 'NLD', 'POL', 'PRT', 'ROU', 'SVK', 'SVN', 'ESP', 'SWE',
];

// Every region except external powers gets a full page at /countries/<slug>.
// External powers appear through the globe panel only, as buyers/counterparts.
export function hasFullPage(region: string) {
  return region !== 'external';
}

// Find a country by its code. Returns undefined if the code isn't in the list.
export function findCountry(code: unknown) {
  return COUNTRIES.find((country) => country.code === code);
}

// Takes a code from the map and finds which clickable entry it belongs to:
// 'ESP' gives the EU, 'ARE' gives the UAE, and 'BRA' gives undefined (greyed out).
export function findCountryOnMap(mapCode: string) {
  // The map calls Palestine 'PSX', while the World Bank and our files use 'PSE'.
  if (mapCode === 'PSX') return findCountry('PSE');
  return findCountry(EU_MEMBERS.includes(mapCode) ? 'EUU' : mapCode);
}
