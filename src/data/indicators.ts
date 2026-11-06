// Which exposure indicators each kind of country is judged on, with their labels.
// Country pages, the globe panel and (from step 2) the globe colours read this file.
//
// Exporters and importers face different risks, so each gets its own set, and the
// numbers are always shown side by side, never blended into a single score.

export const INDICATORS = {
  oilShareOfGovRevenuePct: { label: 'Oil share of government revenue', unit: '%' },
  fiscalBreakevenOilPriceUsd: { label: 'Fiscal breakeven oil price', unit: 'US$ a barrel' },
  nonOilGdpSharePct: { label: 'Non-oil share of GDP', unit: '%' },
  energyImportDependencePct: { label: 'Energy import dependence', unit: '%' },
  fuelImportsPctOfImports: { label: 'Fuel imports, share of goods imports', unit: '%' },
  resourceRentsPctGdp: { label: 'Resource rents, share of GDP', unit: '%' },
} as const;

export type IndicatorKey = keyof typeof INDICATORS;

export const INDICATOR_SETS: Record<'exporter' | 'importer', IndicatorKey[]> = {
  exporter: ['oilShareOfGovRevenuePct', 'fiscalBreakevenOilPriceUsd', 'nonOilGdpSharePct'],
  importer: ['energyImportDependencePct', 'fuelImportsPctOfImports'],
};

// The headline indicators for one country: the exporter set or the importer set,
// never both. A mixed or undecided country gets none until a set is chosen.
export function indicatorsFor(exposureType: string): IndicatorKey[] {
  if (exposureType === 'exporter') return INDICATOR_SETS.exporter;
  if (exposureType === 'importer') return INDICATOR_SETS.importer;
  return [];
}

// A stored indicator: a sourced number, or placeholder text like "Not applicable".
// A range (low and high) is used when respected estimates disagree.
export type IndicatorValue =
  | string
  | { value: number; year: number; source: string; method?: string }
  | { low: number; high: number; year: number; source: string };

// Writes the number part, like "54.6" or "80 to 96".
export function indicatorNumber(stored: Exclude<IndicatorValue, string>) {
  if ('low' in stored) return `${stored.low.toLocaleString('en-US')} to ${stored.high.toLocaleString('en-US')}`;
  return stored.value.toLocaleString('en-US');
}

// The short form used in the globe panel, like "60% (2024)" or "$80-96 a barrel (2026)".
export function shortIndicator(key: IndicatorKey, stored: IndicatorValue) {
  if (typeof stored === 'string') return stored;
  const number = 'low' in stored ? `${stored.low}-${stored.high}` : stored.value.toLocaleString('en-US');
  const shown = INDICATORS[key].unit === '%' ? `${number}%` : `$${number} a barrel`;
  return `${shown} (${stored.year})`;
}

// The panel's header line, like "EXPORTER · Partly protected".
export function exposureHeader(exposureType: string, protectionStatus: string, todo: string) {
  const type = exposureType === todo ? 'Exposure type TODO' : EXPOSURE_LABELS[exposureType].toUpperCase();
  const protection = protectionStatus === todo ? 'protection TODO' : PROTECTION_LABELS[protectionStatus];
  return `${type} · ${protection}`;
}

// Display names for the two badges at the top of a country's page and panel.
export const EXPOSURE_LABELS: Record<string, string> = {
  exporter: 'Exporter',
  importer: 'Importer',
  mixed: 'Mixed exposure',
};
export const PROTECTION_LABELS: Record<string, string> = {
  protected: 'Protected',
  'partly protected': 'Partly protected',
  exposed: 'Exposed',
};
