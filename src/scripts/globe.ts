// Everything the globe does in the browser: drawing the map, colours, rotation,
// hover names, the panel, and the arc between two selected countries.
import Globe from 'globe.gl';
import { TODO, findCountry, findCountryOnMap, relationshipSlug } from '../data/countries';

const COLOURS = {
  background: '#0b1730',
  ocean: '#10264d',
  core: '#2dd4bf',
  coreHover: '#8ff0e0',
  external: '#f59e0b',
  externalHover: '#fcd34d',
  selected: '#ffffff',
  arc: '#ffffff',
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

// The data behind the arc: the two selected countries.
interface Pair {
  first: Entry;
  second: Entry;
}

// What we track as the visitor moves around.
let hoveredCode: string | null = null;
let selectedCodes: string[] = []; // Holds zero, one or two codes, like ['ARE', 'GBR']

// Gets the clickable entry a map shape belongs to, or undefined for grey countries.
function entryFor(country: MapCountry) {
  return findCountryOnMap(country.properties.code);
}

// Picks a colour for a clickable entry based on its region and current state.
function colourFor(entry: Entry) {
  if (selectedCodes.includes(entry.code)) return COLOURS.selected;
  if (entry.code === hoveredCode) {
    return entry.region === 'core' ? COLOURS.coreHover : COLOURS.externalHover;
  }
  return COLOURS[entry.region];
}

// ---------- The panel ----------

// Reads the summaries that Globe.astro stored in the page at build time.
const panelData: {
  countries: {
    code: string;
    summary: string;
    // A number, or the TODO text if it hasn't been filled in yet.
    gdpUsdBn: number | string;
    population: number | string;
  }[];
  relationships: { slug: string; summary: string }[];
} = JSON.parse(document.getElementById('panel-data')!.textContent!);

const panel = document.getElementById('panel')!;
const panelType = document.getElementById('panel-type')!;
const panelTitle = document.getElementById('panel-title')!;
const panelSummary = document.getElementById('panel-summary')!;
const panelStats = document.getElementById('panel-stats')!;
const panelGdp = document.getElementById('panel-gdp')!;
const panelPopulation = document.getElementById('panel-population')!;
const panelHint = document.getElementById('panel-hint')!;
const panelLink = document.getElementById('panel-link') as HTMLAnchorElement;

// Shows one stat with commas, or highlights it if it's still a placeholder.
function fillStat(element: HTMLElement, value: number | string) {
  element.textContent = typeof value === 'number' ? value.toLocaleString('en-US') : value;
  element.classList.toggle('todo', value === TODO);
}

// Fills in the panel's text. Missing text shows "Coming soon", and a missing
// link address hides the link.
function fillPanel(content: {
  type: string;
  title: string;
  summary: string | undefined;
  hint: string;
  link?: { href: string; text: string };
  stats?: { gdpUsdBn: number | string; population: number | string };
}) {
  panelType.textContent = content.type;
  panelTitle.textContent = content.title;
  panelSummary.textContent = content.summary ?? 'Coming soon';
  // Placeholders get the same yellow highlight they have on the content pages.
  panelSummary.classList.toggle('todo', content.summary === TODO);
  panelStats.hidden = !content.stats;
  if (content.stats) {
    fillStat(panelGdp, content.stats.gdpUsdBn);
    fillStat(panelPopulation, content.stats.population);
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
  const isCore = entry.region === 'core';
  fillPanel({
    type: isCore ? 'Core country' : 'External power',
    title: entry.name,
    summary: file?.summary,
    stats: file,
    hint: isCore
      ? 'Click another country to see how the two are connected.'
      : 'Click a core country to see its relationship with this one.',
    // Only core countries with a Markdown file have a full page to link to.
    link:
      isCore && file
        ? { href: `/countries/${entry.slug}`, text: 'Read the full profile' }
        : undefined,
  });
}

function showRelationshipPanel(first: Entry, second: Entry) {
  // The slug comes out the same whichever country was clicked first.
  const slug = relationshipSlug(first.code, second.code);
  const file = panelData.relationships.find((item) => item.slug === slug);
  fillPanel({
    type: 'Relationship',
    title: `${first.name} and ${second.name}`,
    summary: file?.summary,
    hint: 'Click another country to start a new selection.',
    link: file ? { href: `/relationships/${slug}`, text: 'Read the full analysis' } : undefined,
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

  // Bahrain is too small to click at this scale, so it also gets a dot.
  const dots: Entry[] = [findCountry('BHR')!];

  // globe.gl only recolours when it's given new colour functions, so highlights
  // are applied by calling this after anything changes.
  function refreshColours() {
    globe
      .polygonCapColor((country) => {
        const entry = entryFor(country as MapCountry);
        return entry ? colourFor(entry) : COLOURS.other;
      })
      .pointColor((dot) => colourFor(dot as Entry));
  }

  function setHovered(code: string | null) {
    hoveredCode = code;
    refreshColours();
  }

  // Decides what happens when a country is clicked.
  function selectCountry(code: string) {
    if (selectedCodes.includes(code)) {
      // Clicking a selected country clears the selection.
      selectedCodes = [];
    } else if (selectedCodes.length === 1) {
      // A second country completes the pair.
      selectedCodes = [selectedCodes[0], code];
    } else {
      // A first click, or a third click, which starts a new selection.
      selectedCodes = [code];
    }
    showSelection();
  }

  function resetSelection() {
    selectedCodes = [];
    showSelection();
  }

  // Updates the panel, the arc and the colours to match the current selection.
  function showSelection() {
    const [first, second] = selectedCodes.map((code) => findCountry(code)!);

    if (first && second) {
      showRelationshipPanel(first, second);
      globe.arcsData([{ first, second }]);
      lookBetween(first, second);
    } else {
      globe.arcsData([]);
      if (first) {
        showCountryPanel(first);
      } else {
        closePanel();
      }
    }
    updateOffset();
    refreshColours();
  }

  // Slides the globe so the panel doesn't cover the selected countries.
  // - Wide screens: slide left by half the panel's width, only while a pair shows.
  // - Phones: slide up by half the bottom sheet's height, whenever it's open.
  function updateOffset() {
    const isBottomSheet = window.innerWidth <= 800; // Matches the CSS breakpoint
    if (isBottomSheet) {
      globe.globeOffset([0, selectedCodes.length > 0 ? -panel.offsetHeight / 2 : 0]);
    } else {
      globe.globeOffset([selectedCodes.length === 2 ? -panel.offsetWidth / 2 : 0, 0]);
    }
  }

  // Turns the globe to face the middle of the arc, so both ends can be seen.
  function lookBetween(first: Entry, second: Entry) {
    // Longitude wraps around at 180 degrees, so the middle of 170 and -170 is 180,
    // not 0. Adding 360 to the western one makes the average come out right.
    const gap = Math.abs(first.lng - second.lng);
    const lngA = gap > 180 && first.lng < 0 ? first.lng + 360 : first.lng;
    const lngB = gap > 180 && second.lng < 0 ? second.lng + 360 : second.lng;
    globe.pointOfView(
      {
        lat: (first.lat + second.lat) / 2,
        lng: (lngA + lngB) / 2,
        // Zoom out if needed, but don't zoom in if the visitor is already further away.
        altitude: Math.max(globe.pointOfView().altitude, fittedAltitude()),
      },
      1000, // The move takes one second.
    );
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
    .pointRadius(0.7)
    .pointLabel((dot) => (dot as Entry).name)
    .onPointHover((dot) => setHovered(dot ? (dot as Entry).code : null))
    .onPointClick((dot) => selectCountry((dot as Entry).code))
    // The arc is drawn from the first selected country to the second. Its dashes
    // move along the line, which is what makes it look animated.
    .arcStartLat((arc) => (arc as Pair).first.lat)
    .arcStartLng((arc) => (arc as Pair).first.lng)
    .arcEndLat((arc) => (arc as Pair).second.lat)
    .arcEndLng((arc) => (arc as Pair).second.lng)
    .arcColor(() => COLOURS.arc)
    .arcStroke(0.7)
    .arcDashLength(0.4)
    .arcDashGap(0.15)
    .arcDashAnimateTime(1800)
    // Arcs ignore the mouse, so countries underneath one can still be clicked.
    .pointerEventsFilter((_object, data) => !(data && 'first' in data))
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
