// One-time script that creates public/data/countries.geojson.
// You only need to run it again if you want fresh map data:
//   node scripts/build-map-data.mjs
//
// Natural Earth's 110m map leaves out very small countries, so we take
// Bahrain and Malta from its more detailed 50m map and add them.
import { mkdir, writeFile } from 'node:fs/promises';

const BASE =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson';
const EXTRA_COUNTRIES = ['BHR', 'MLT']; // Bahrain and Malta

async function download(fileName) {
  const response = await fetch(`${BASE}/${fileName}`);
  if (!response.ok) throw new Error(`Download failed: ${fileName} (${response.status})`);
  return response.json();
}

const map110m = await download('ne_110m_admin_0_countries.geojson');
const map50m = await download('ne_50m_admin_0_countries.geojson');

const extras = map50m.features.filter((feature) =>
  EXTRA_COUNTRIES.includes(feature.properties.ADM0_A3),
);
if (extras.length !== EXTRA_COUNTRIES.length) {
  throw new Error('Could not find every extra country in the 50m map.');
}

// Keep only the shape, code and name, which makes the file much smaller.
// We use ADM0_A3 as the code because ISO_A3 is "-99" for France in this data.
const features = [...map110m.features, ...extras].map((feature) => ({
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
