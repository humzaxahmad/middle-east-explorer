// Everything the globe does in the browser: drawing the map, colours, rotation,
// hover names, and the panel.
import Globe from 'globe.gl';
import { TODO, findCountry, findCountryOnMap, hasFullPage } from '../data/countries';

const COLOURS = {
  background: '#0b1730',
  ocean: '#10264d',
  core: '#2dd4bf',
  coreHover: '#8ff0e0',
  external: '#f59e0b',
  externalHover: '#fcd34d',
  selected: '#ffffff',
  other: '#3b4760',
  border: '#0b1730',
};

// The shape of one country in countries.geojson.
interface MapCountry {
  properties: { code: string; name: string };
  geometry: { type: string; coordinates: any };
}

// A clickable entry from the master list in data/countries.ts.
type Entry = NonNullable<ReturnType<typeof findCountry>>;

// A click area for a country too small to click on the map.
interface Dot {
  entry: Entry;
  lat: number;
  lng: number;
  radius: number;
  visible: boolean;
}

// What we track as the visitor moves around.
let hoveredCode: string | null = null;
let selectedCodes: string[] = []; // Holds zero or one code, like ['ARE']

// Gets the clickable entry a map shape belongs to, or undefined for grey countries.
function entryFor(country: MapCountry) {
  return findCountryOnMap(country.properties.code);
}

// Picks a colour for a clickable entry based on its region and current state.
function colourFor(entry: Entry) {
  if (selectedCodes.includes(entry.code)) return COLOURS.selected;
  if (entry.code === hoveredCode) {
    return hasFullPage(entry.region) ? COLOURS.coreHover : COLOURS.externalHover;
  }
  return hasFullPage(entry.region) ? COLOURS.core : COLOURS.external;
}

// ---------- The panel ----------

// Reads the summaries that Globe.astro stored in the page at build time.
const panelData: {
  countries: {
    code: string;
    summary: string;
    header: string;
    indicators: { label: string; value: string }[];
    hittingNow: string;
    chain?: { text: string; href?: string };
  }[];
} = JSON.parse(document.getElementById('panel-data')!.textContent!);

const panel = document.getElementById('panel')!;
const panelType = document.getElementById('panel-type')!;
const panelTitle = document.getElementById('panel-title')!;
const panelSummary = document.getElementById('panel-summary')!;
const panelChain = document.getElementById('panel-chain')!;
const panelIndicators = document.getElementById('panel-indicators')!;
const panelHitting = document.getElementById('panel-hitting')!;
const panelHittingText = document.getElementById('panel-hitting-text')!;
const panelHint = document.getElementById('panel-hint')!;
const panelLink = document.getElementById('panel-link') as HTMLAnchorElement;

// Makes one element with some text, highlighted yellow if it's a placeholder.
// textContent (not innerHTML) keeps any text from being treated as code.
function make(tag: string, text: string, className = '') {
  const element = document.createElement(tag);
  element.textContent = text;
  element.className = className;
  element.classList.toggle('todo', text === TODO || text.endsWith(TODO));
  return element;
}

// Draws the chain button: a real link once the chain page exists, and plain
// "coming soon" text until then.
function fillChain(chain: { text: string; href?: string }) {
  if (chain.href) {
    const link = make('a', `${chain.text} →`, 'chain-button');
    (link as HTMLAnchorElement).href = chain.href;
    panelChain.replaceChildren(link);
  } else {
    panelChain.replaceChildren(make('span', `${chain.text} (coming soon)`, 'chain-button is-disabled'));
  }
}

// Fills in the panel's text. Missing text shows "Coming soon", and a missing
// link address hides the link.
function fillPanel(content: {
  type: string;
  title: string;
  summary: string | undefined;
  hint: string;
  link?: { href: string; text: string };
  // These three only exist for a single country.
  indicators?: { label: string; value: string }[];
  hittingNow?: string;
  chain?: { text: string; href?: string };
}) {
  panelType.textContent = content.type;
  panelTitle.textContent = content.title;
  // An empty string hides the summary (country panels lead with indicators instead).
  panelSummary.hidden = content.summary === '';
  panelSummary.textContent = content.summary ?? 'Coming soon';
  // Placeholders get the same yellow highlight they have on the content pages.
  panelSummary.classList.toggle('todo', content.summary === TODO);

  panelChain.hidden = !content.chain;
  if (content.chain) fillChain(content.chain);

  panelIndicators.hidden = !content.indicators;
  panelIndicators.replaceChildren(
    ...(content.indicators ?? []).map(({ label, value }) => {
      const row = document.createElement('div');
      row.append(make('dt', label), make('dd', value));
      return row;
    }),
  );

  panelHitting.hidden = content.hittingNow === undefined;
  if (content.hittingNow !== undefined) {
    panelHittingText.textContent = content.hittingNow;
    panelHittingText.classList.toggle('todo', content.hittingNow === TODO);
  }
  panelHint.textContent = content.hint;
  panelLink.hidden = !content.link;
  if (content.link) {
    panelLink.href = content.link.href;
    panelLink.textContent = content.link.text;
  }
  panel.classList.add('is-open');
}

function showCountryPanel(entry: Entry) {
  const file = panelData.countries.find((item) => item.code === entry.code);
  const isCore = hasFullPage(entry.region);
  fillPanel({
    // Middle East countries get their exposure header, like "EXPORTER · Partly protected".
    type: isCore && file ? file.header : 'External power',
    title: entry.name,
    // Middle East countries lead with their exposure; external powers keep a summary.
    summary: isCore && file ? '' : file?.summary,
    indicators: file?.indicators,
    hittingNow: file?.hittingNow,
    chain: file?.chain,
    hint: isCore
      ? 'Click a chokepoint or buyer to see the link.'
      : 'Click a Middle East country or chokepoint to see the link.',
    // Only non-external countries with a Markdown file have a full page to link to.
    link:
      isCore && file
        ? { href: `/countries/${entry.slug}`, text: 'Read the full profile' }
        : undefined,
  });
}

function closePanel() {
  panel.classList.remove('is-open');
}

// ---------- The globe ----------

// How far away the camera should be so the whole globe fits on screen.
// A tall, narrow phone needs the camera further back than a wide laptop.
function fittedAltitude() {
  const viewAngle = Math.tan((25 * Math.PI) / 180); // Half of the camera's 50 degree view
  const aspectRatio = window.innerWidth / window.innerHeight;
  const distanceToFitWidth = 110 / (viewAngle * aspectRatio); // 110 = radius plus a margin
  // The globe's radius is 100. Altitude is measured in radiuses above the surface.
  return Math.max(distanceToFitWidth / 100 - 1, 2.2);
}

async function startGlobe() {
  const container = document.getElementById('globe')!;

  const response = await fetch('/data/countries.geojson');
  if (!response.ok) throw new Error('Could not load the map data.');
  const map: { features: MapCountry[] } = await response.json();

  // Bahrain, the West Bank and Gaza are too small to click at this scale, so they
  // get invisible click areas (radius is in degrees). Bahrain also gets a small
  // visible dot, because its shape is only a pixel or two wide.
  const bahrain = findCountry('BHR')!;
  const palestine = findCountry('PSE')!;
  const dots: Dot[] = [
    { entry: bahrain, lat: bahrain.lat, lng: bahrain.lng, radius: 0.55, visible: false },
    { entry: bahrain, lat: bahrain.lat, lng: bahrain.lng, radius: 0.22, visible: true },
    { entry: palestine, lat: palestine.lat, lng: palestine.lng, radius: 0.42, visible: false }, // West Bank
    { entry: palestine, lat: 31.42, lng: 34.37, radius: 0.3, visible: false }, // Gaza
  ];

  // globe.gl only recolours when it's given new colour functions, so highlights
  // are applied by calling this after anything changes.
  function refreshColours() {
    globe
      .polygonCapColor((country) => {
        const entry = entryFor(country as MapCountry);
        return entry ? colourFor(entry) : COLOURS.other;
      })
      // An alpha of 0 makes a click area see-through, but it can still be clicked.
      .pointColor((dot) => ((dot as Dot).visible ? colourFor((dot as Dot).entry) : 'rgba(0,0,0,0)'));
  }

  function setHovered(code: string | null) {
    hoveredCode = code;
    refreshColours();
  }

  // Clicking a selected country clears the selection. Clicking any other
  // country replaces it: only one country is selected at a time.
  function selectCountry(code: string) {
    selectedCodes = selectedCodes.includes(code) ? [] : [code];
    showSelection();
  }

  function resetSelection() {
    selectedCodes = [];
    showSelection();
  }

  // Updates the panel and the colours to match the current selection.
  function showSelection() {
    const [first] = selectedCodes.map((code) => findCountry(code)!);
    if (first) {
      showCountryPanel(first);
    } else {
      closePanel();
    }
    updateOffset();
    refreshColours();
  }

  // On phones, slides the globe up so the bottom sheet doesn't cover it.
  function updateOffset() {
    const isBottomSheet = window.innerWidth <= 800; // Matches the CSS breakpoint
    globe.globeOffset(isBottomSheet && selectedCodes.length > 0 ? [0, -panel.offsetHeight / 2] : [0, 0]);
  }

  const globe = new Globe(container)
    .width(container.clientWidth)
    .height(container.clientHeight)
    .backgroundColor(COLOURS.background)
    // Colour changes should be instant, not a slow fade.
    .polygonsTransitionDuration(0)
    .pointsTransitionDuration(0)
    // globe.gl hands each country back as a general "object", so we state its shape.
    .polygonsData(map.features)
    .polygonSideColor(() => COLOURS.background)
    .polygonStrokeColor(() => COLOURS.border)
    .polygonAltitude(0.008)
    // An empty label means grey countries show no name when hovered.
    .polygonLabel((country) => entryFor(country as MapCountry)?.name ?? '')
    .onPolygonHover((country) => {
      setHovered(country ? entryFor(country as MapCountry)?.code ?? null : null);
    })
    .onPolygonClick((country) => {
      const entry = entryFor(country as MapCountry);
      if (entry) selectCountry(entry.code);
    })
    .pointsData(dots)
    .pointAltitude(0.012)
    .pointRadius((dot) => (dot as Dot).radius)
    .pointLabel((dot) => (dot as Dot).entry.name)
    .onPointHover((dot) => setHovered(dot ? (dot as Dot).entry.code : null))
    .onPointClick((dot) => selectCountry((dot as Dot).entry.code))
    // Only show the hand cursor over things that can be clicked.
    .showPointerCursor((type, item) => {
      if (type === 'point') return true;
      return type === 'polygon' && Boolean(entryFor(item as MapCountry));
    });

  refreshColours();
  document.getElementById('globe-loading')!.hidden = true;

  // Colours the sphere itself. globe.gl's type doesn't list .color, hence "as any".
  (globe.globeMaterial() as any).color.set(COLOURS.ocean);

  // Start with the Middle East facing the viewer.
  globe.pointOfView({ lat: 25, lng: 45, altitude: fittedAltitude() });

  // Rotate slowly, unless the visitor's device asks for reduced motion.
  const controls = globe.controls();
  controls.autoRotate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  controls.autoRotateSpeed = 0.4;

  // Stop people zooming in so far that one country fills the screen.
  // The globe's radius is 100, so this keeps the camera above the surface.
  controls.minDistance = 125;

  // "start" fires when someone begins to drag, zoom or touch the globe.
  controls.addEventListener('start', () => {
    controls.autoRotate = false;
  });

  // Two ways to reset: the button and the Escape key.
  document.getElementById('panel-reset')!.addEventListener('click', resetSelection);
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') resetSelection();
  });

  // Keep the globe filling the screen if the window changes size.
  window.addEventListener('resize', () => {
    globe.width(container.clientWidth).height(container.clientHeight);
    updateOffset();
  });
}

startGlobe().catch((error) => {
  console.error(error);
  document.getElementById('globe-loading')!.hidden = true;
  document.getElementById('globe-message')!.hidden = false;
});
