// One-time script that creates public/data/countries.geojson.
// You only need to run it again if you want fresh map data:
//   node scripts/build-map-data.mjs
//
// Natural Earth makes the same map at several levels of detail. We use the
// small 110m map for most of the world, and its more detailed 50m map for the
// Middle East and its neighbours. At 110m Gaza has no shape of its own, Bahrain
// is missing and the Gulf's coastlines are very rough. Using 50m everywhere
// would make the file about nine times bigger, for detail nobody would see.
import { mkdir, writeFile } from 'node:fs/promises';

const BASE =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson';

// Neighbours are included so that shared borders line up where people look most.
const DETAILED_COUNTRIES = [
  // Core countries
  'ARE', 'SAU', 'QAT', 'KWT', 'OMN', 'BHR', 'IRN', 'ISR', 'PSX', 'EGY', 'TUR',
  'IRQ', 'JOR', 'SYR', 'LBN', 'YEM',
  // Neighbours
  'CYP', 'CYN', 'SDN', 'LBY', 'ERI', 'DJI', 'SOM', 'ETH', 'AFG', 'PAK', 'TKM',
  'AZE', 'ARM', 'GEO', 'GRC', 'BGR',
  // Too small to appear on the 110m map at all
  'MLT',
];

async function download(fileName) {
  const response = await fetch(`${BASE}/${fileName}`);
  if (!response.ok) throw new Error(`Download failed: ${fileName} (${response.status})`);
  return response.json();
}

const map110m = await download('ne_110m_admin_0_countries.geojson');
const map50m = await download('ne_50m_admin_0_countries.geojson');

const detailed = map50m.features.filter((feature) =>
  DETAILED_COUNTRIES.includes(feature.properties.ADM0_A3),
);
const missing = DETAILED_COUNTRIES.filter(
  (code) => !detailed.some((feature) => feature.properties.ADM0_A3 === code),
);
if (missing.length > 0) {
  throw new Error(`Could not find these countries in the 50m map: ${missing.join(', ')}`);
}

const rest = map110m.features.filter(
  (feature) => !DETAILED_COUNTRIES.includes(feature.properties.ADM0_A3),
);

// Keep only the shape, code and name, which makes the file much smaller.
// We use ADM0_A3 as the code because ISO_A3 is "-99" for France in this data.
const features = [...rest, ...detailed].map((feature) => ({
  type: 'Feature',
  properties: { code: feature.properties.ADM0_A3, name: feature.properties.NAME },
  geometry: feature.geometry,
}));

await mkdir('public/data', { recursive: true });
await writeFile(
  'public/data/countries.geojson',
  JSON.stringify({ type: 'FeatureCollection', features }),
);
console.log(`Wrote ${features.length} countries to public/data/countries.geojson`);
