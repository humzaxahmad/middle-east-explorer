// Non-oil GDP share, 2016 vs the latest year available, for the six GCC states.
// "now" figures match each country's own nonOilGdpSharePct in src/content/countries,
// so this page and the country pages never disagree with each other.
//
// A rising share isn't purely a diversification win: it also rises mechanically
// whenever oil GDP itself shrinks (a lower oil price, a lost barrel of exports),
// so a widening gap can mean a falling oil price as much as a growing non-oil
// economy. See each row's note.

export interface DiversificationRow {
  name: string;
  // A short form for the chart's row labels, where "United Arab Emirates"
  // doesn't comfortably fit. Falls back to name when absent.
  shortName?: string;
  slug: string;
  then: { value: number; year: number };
  now: { value: number; year: number; source: string };
  thenSource: string;
}

export const DIVERSIFICATION: DiversificationRow[] = [
  {
    name: 'Oman',
    slug: 'omn',
    then: { value: 35, year: 2016 },
    now: { value: 69.2, year: 2025, source: 'Oman Ministry of Economy' },
    thenSource: 'vision2030.ai GCC comparison, compiling national statistics',
  },
  {
    name: 'Qatar',
    slug: 'qat',
    then: { value: 43, year: 2016 },
    now: { value: 64, year: 2024, source: 'Qatar National Planning Council via The Peninsula' },
    thenSource: 'vision2030.ai GCC comparison, compiling national statistics',
  },
  {
    name: 'Kuwait',
    slug: 'kwt',
    then: { value: 40, year: 2016 },
    now: { value: 52.1, year: 2024, source: 'Central Statistical Bureau via Times Kuwait' },
    thenSource: 'Oxford Business Group / IMF Kuwait Selected Issues 2017, corroborated by vision2030.ai',
  },
  {
    name: 'Saudi Arabia',
    slug: 'sau',
    then: { value: 44, year: 2016 },
    now: { value: 56, year: 2025, source: 'Crown Prince Mohammed bin Salman via News of Bahrain' },
    thenSource: 'vision2030.ai GCC comparison, compiling national statistics (GASTAT)',
  },
  {
    name: 'United Arab Emirates',
    shortName: 'UAE',
    slug: 'uae',
    then: { value: 67, year: 2016 },
    now: { value: 75.5, year: 2024, source: 'Federal Competitiveness and Statistics Centre via Gulf News' },
    thenSource: 'vision2030.ai GCC comparison, compiling national statistics (FCSC)',
  },
  {
    name: 'Bahrain',
    slug: 'bhr',
    then: { value: 78, year: 2016 },
    now: { value: 85.8, year: 2025, source: 'Bahrain Economic Report via Arab News' },
    thenSource: 'vision2030.ai GCC comparison, compiling national statistics',
  },
];
