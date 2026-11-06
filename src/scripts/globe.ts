// Everything the globe does in the browser: drawing the map, colours, rotation,
// hover names, and the panel.
import Globe from 'globe.gl';
import { TODO, findCountry, findCountryOnMap, hasFullPage } from '../data/countries';
import { EXPOSURE_LABELS, PROTECTION_LABELS } from '../data/indicators';

// Which exposure type the toggle currently shows. Exporters and importers get
// separate colour scales, because "high risk" means opposite things for each.
type View = 'exporter' | 'importer';
let activeView: View = 'exporter';

const COLOURS = {
  background: '#0b1730',
  ocean: '#10264d',
  // External powers (buyers): unaffected by the toggle, always this colour.
  external: '#2dd4bf',
  selected: '#ffffff',
  // A Middle East country whose exposureType doesn't match the active view
  // fades to the same colour as a country outside the dataset entirely.
  other: '#3b4760',
  border: '#0b1730',
  // Exposure-risk scale, shared by whichever view is active. Matches the
  // badge colours on the country pages (src/styles/global.css, .badge-*).
  protected: '#34d399',
  partlyProtected: '#fbbf24',
  exposedRisk: '#f87171',
  mixed: '#a78bfa',
  // A country of the active type with no protectionStatus set yet.
  pending: '#6b7591',
};

// Chokepoint pin colours, by status. Unaffected by the exporter/importer
// toggle: a closed strait matters to both views.
const CHOKEPOINT_COLOURS: Record<string, string> = {
  open: '#34d399',
  closed: '#f87171',
  disputed: '#fbbf24',
};

// Flow arc colours, by the commodity's family: oil or gas. More distinctions
// than that would make the globe harder to read at a glance.
const FLOW_COLOURS: Record<string, string> = {
  'crude-oil': '#fbbf24',
  'pipeline-oil': '#fbbf24',
  lng: '#60a5fa',
  'pipeline-gas': '#60a5fa',
};

// Lightens a "#rrggbb" colour toward white, for hover highlights. Keeping this
// as one function avoids hand-picking a hover shade for every colour above.
function lighten(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const channel = (shift: number) => {
    const value = (n >> shift) & 0xff;
    return Math.round(value + (255 - value) * amount);
  };
  return `rgb(${channel(16)}, ${channel(8)}, ${channel(0)})`;
}

// The shape of one country in countries.geojson.
interface MapCountry {
  properties: { code: string; name: string };
  geometry: { type: string; coordinates: any };
}

// A clickable entry from the master list in data/countries.ts.
type Entry = NonNullable<ReturnType<typeof findCountry>>;

// A click area for a country too small to click on the map.
interface Dot {
  kind: 'dot';
  entry: Entry;
  lat: number;
  lng: number;
  radius: number;
  visible: boolean;
}

// A chokepoint pin, from chokepoints.yaml via Globe.astro.
interface Pin {
  kind: 'pin';
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: string;
}

// The two kinds of thing shown as a globe.gl "point": the small click areas
// for countries too tiny to tap, and the chokepoint pins.
type MapPoint = Dot | Pin;

// What we track as the visitor moves around.
let hoveredCode: string | null = null;
let selectedCodes: string[] = []; // Holds zero or one code, like ['ARE']
let selectedChokepoint: string | null = null; // A chokepoint id, such as 'hormuz'
let selectedFlow: number | null = null; // An index into panelData.flows

// Gets the clickable entry a map shape belongs to, or undefined for grey countries.
function entryFor(country: MapCountry) {
  return findCountryOnMap(country.properties.code);
}

// The colour scale's base shade (before hover/selection), driven by the
// active exposure view. External powers ignore the toggle entirely; a Middle
// East country is only shaded by protectionStatus when its own exposureType
// matches the active view (or is "mixed", which shows in both).
function baseColourFor(entry: Entry) {
  if (!hasFullPage(entry.region)) return COLOURS.external;
  const file = panelData.countries.find((item) => item.code === entry.code);
  const exposureType = file?.exposureType;
  if (!exposureType || exposureType === TODO) return COLOURS.pending;
  if (exposureType !== activeView && exposureType !== 'mixed') return COLOURS.other;
  const status = file?.protectionStatus;
  if (status === 'protected') return COLOURS.protected;
  if (status === 'partly protected') return COLOURS.partlyProtected;
  if (status === 'exposed') return COLOURS.exposedRisk;
  return exposureType === 'mixed' ? COLOURS.mixed : COLOURS.pending;
}

// Picks a colour for a clickable entry: selected beats hovered beats base.
function colourFor(entry: Entry) {
  if (selectedCodes.includes(entry.code)) return COLOURS.selected;
  const base = baseColourFor(entry);
  return entry.code === hoveredCode ? lighten(base, 0.4) : base;
}

// ---------- The panel ----------

// Reads the summaries that Globe.astro stored in the page at build time.
const panelData: {
  countries: {
    code: string;
    summary: string;
    header: string;
    // "exporter", "importer", "mixed" or TODO — drives the globe's colouring.
    exposureType: string;
    protectionStatus: string;
    indicators: { label: string; value: string }[];
    hittingNow: string;
    chain?: { text: string; href?: string };
  }[];
  chokepoints: {
    id: string;
    name: string;
    lat: number;
    lng: number;
    status: string;
    statusText: string;
    chain: { text: string; href?: string };
  }[];
  flows: {
    fromName: string;
    toName: string;
    fromLat: number;
    fromLng: number;
    toLat: number;
    toLng: number;
    type: string;
    volumeText: string;
    explainer: string;
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

const legend = document.getElementById('legend')!;
const viewExporterBtn = document.getElementById('view-exporter')!;
const viewImporterBtn = document.getElementById('view-importer')!;

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

const FLOW_TYPE_LABELS: Record<string, string> = {
  'crude-oil': 'Crude oil',
  'pipeline-oil': 'Oil pipeline',
  lng: 'LNG',
  'pipeline-gas': 'Gas pipeline',
};

function showFlowPanel(flow: (typeof panelData.flows)[number]) {
  // Skips the awkward "TODO: fill in. <explainer>" when the volume isn't
  // sourced yet; the explainer alone still carries the point.
  const summary = flow.volumeText === TODO ? flow.explainer : `${flow.volumeText}. ${flow.explainer}`;
  fillPanel({
    type: `Flow · ${FLOW_TYPE_LABELS[flow.type] ?? flow.type}`,
    title: `${flow.fromName} → ${flow.toName}`,
    summary,
    hint: 'Click a country, chokepoint or another flow to see more.',
  });
}

function showChokepointPanel(point: (typeof panelData.chokepoints)[number]) {
  fillPanel({
    type: `Chokepoint · ${point.status.charAt(0).toUpperCase()}${point.status.slice(1)}`,
    title: point.name,
    summary: point.statusText,
    chain: point.chain,
    hint: 'Click a country to see who it affects.',
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
    { kind: 'dot', entry: bahrain, lat: bahrain.lat, lng: bahrain.lng, radius: 0.55, visible: false },
    { kind: 'dot', entry: bahrain, lat: bahrain.lat, lng: bahrain.lng, radius: 0.22, visible: true },
    { kind: 'dot', entry: palestine, lat: palestine.lat, lng: palestine.lng, radius: 0.42, visible: false }, // West Bank
    { kind: 'dot', entry: palestine, lat: 31.42, lng: 34.37, radius: 0.3, visible: false }, // Gaza
  ];
  const pins: Pin[] = panelData.chokepoints.map((point) => ({
    kind: 'pin',
    id: point.id,
    name: point.name,
    lat: point.lat,
    lng: point.lng,
    status: point.status,
  }));
  const points: MapPoint[] = [...dots, ...pins];

  // globe.gl only redraws an accessor-driven property when it's given a new
  // function, so every property that depends on hover/selection state (not
  // just colour) is re-set here, and this is called after anything changes.
  function refreshColours() {
    globe
      .polygonCapColor((country) => {
        const entry = entryFor(country as MapCountry);
        return entry ? colourFor(entry) : COLOURS.other;
      })
      .pointColor((point) => {
        const p = point as MapPoint;
        if (p.kind === 'dot') return p.visible ? colourFor(p.entry) : 'rgba(0,0,0,0)'; // Invisible, but still clickable.
        if (p.id === selectedChokepoint) return COLOURS.selected;
        return CHOKEPOINT_COLOURS[p.status] ?? COLOURS.pending;
      })
      .pointRadius((point) => {
        const p = point as MapPoint;
        if (p.kind === 'dot') return p.radius;
        return p.id === selectedChokepoint ? 0.75 : 0.55;
      })
      .arcColor((flow: object) => {
        const index = panelData.flows.indexOf(flow as (typeof panelData.flows)[number]);
        if (index === selectedFlow) return COLOURS.selected;
        return FLOW_COLOURS[(flow as (typeof panelData.flows)[number]).type] ?? COLOURS.pending;
      })
      .arcStroke((flow: object) => (panelData.flows.indexOf(flow as (typeof panelData.flows)[number]) === selectedFlow ? 1 : 0.4));
  }

  function setHovered(code: string | null) {
    hoveredCode = code;
    refreshColours();
  }

  // Rebuilds the legend to match the active view. A plain swatch list, built
  // the same way the panel's indicator rows are: no innerHTML, so nothing in
  // the data can be mistaken for markup.
  function renderLegend() {
    const rows: [string, string][] = [
      [COLOURS.protected, PROTECTION_LABELS.protected],
      [COLOURS.partlyProtected, PROTECTION_LABELS['partly protected']],
      [COLOURS.exposedRisk, PROTECTION_LABELS.exposed],
      [COLOURS.mixed, EXPOSURE_LABELS.mixed],
      [COLOURS.pending, 'Data pending'],
      [COLOURS.external, 'External power (buyer)'],
    ];
    // Chokepoint pins use their own colour scheme (by status, not exposure),
    // since a closed strait matters the same way in both views.
    const pinRows: [string, string][] = [
      [CHOKEPOINT_COLOURS.open, 'Chokepoint: open'],
      [CHOKEPOINT_COLOURS.disputed, 'Chokepoint: disputed'],
      [CHOKEPOINT_COLOURS.closed, 'Chokepoint: closed'],
    ];
    // Flow arcs: oil and gas, regardless of pipeline or tanker.
    const flowRows: [string, string][] = [
      [FLOW_COLOURS['crude-oil'], 'Flow: oil'],
      [FLOW_COLOURS.lng, 'Flow: gas'],
    ];
    const swatchRow = (colour: string, label: string) => {
      const li = document.createElement('li');
      const swatch = document.createElement('span');
      swatch.className = 'swatch';
      swatch.style.background = colour;
      li.append(swatch, label);
      return li;
    };
    legend.replaceChildren(
      ...rows.map(([colour, label]) => swatchRow(colour, label)),
      ...pinRows.map(([colour, label]) => swatchRow(colour, label)),
      ...flowRows.map(([colour, label]) => swatchRow(colour, label)),
      make('li', 'Click or tap a coloured country to begin', 'legend-hint'),
    );
  }

  // Switches which exposure type the map is shaded by. Exporters and
  // importers never share a colour scale, so switching views is the only way
  // to see both.
  function setView(view: View) {
    activeView = view;
    viewExporterBtn.classList.toggle('is-active', view === 'exporter');
    viewExporterBtn.setAttribute('aria-pressed', String(view === 'exporter'));
    viewImporterBtn.classList.toggle('is-active', view === 'importer');
    viewImporterBtn.setAttribute('aria-pressed', String(view === 'importer'));
    refreshColours();
  }

  // Clicking a selected country clears the selection. Clicking any other
  // country replaces it, and clears any selected chokepoint or flow: the
  // panel only ever shows one thing at a time.
  function selectCountry(code: string) {
    selectedChokepoint = null;
    selectedFlow = null;
    selectedCodes = selectedCodes.includes(code) ? [] : [code];
    showSelection();
  }

  // Same idea, for chokepoint pins instead of countries.
  function selectChokepoint(id: string) {
    selectedCodes = [];
    selectedFlow = null;
    selectedChokepoint = selectedChokepoint === id ? null : id;
    showSelection();
  }

  // Same idea, for a flow arc instead of a country or chokepoint.
  function selectFlow(index: number) {
    selectedCodes = [];
    selectedChokepoint = null;
    selectedFlow = selectedFlow === index ? null : index;
    showSelection();
  }

  function resetSelection() {
    selectedCodes = [];
    selectedChokepoint = null;
    selectedFlow = null;
    showSelection();
  }

  // Updates the panel and the colours to match the current selection.
  function showSelection() {
    const [first] = selectedCodes.map((code) => findCountry(code)!);
    const pin = selectedChokepoint ? panelData.chokepoints.find((p) => p.id === selectedChokepoint) : undefined;
    const flow = selectedFlow !== null ? panelData.flows[selectedFlow] : undefined;
    if (pin) {
      showChokepointPanel(pin);
    } else if (flow) {
      showFlowPanel(flow);
    } else if (first) {
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
    const isOpen = selectedCodes.length > 0 || selectedChokepoint !== null || selectedFlow !== null;
    globe.globeOffset(isBottomSheet && isOpen ? [0, -panel.offsetHeight / 2] : [0, 0]);
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
    .pointsData(points)
    .pointAltitude((point) => ((point as MapPoint).kind === 'pin' ? 0.018 : 0.012))
    .pointLabel((point) => {
      const p = point as MapPoint;
      return p.kind === 'dot' ? p.entry.name : `${p.name} (${p.status})`;
    })
    .onPointHover((point) => setHovered(point && (point as MapPoint).kind === 'dot' ? (point as Dot).entry.code : null))
    .onPointClick((point) => {
      const p = point as MapPoint;
      if (p.kind === 'dot') selectCountry(p.entry.code);
      else selectChokepoint(p.id);
    })
    // Energy flow arcs: who supplies whom. A separate globe.gl layer from the
    // points above, so it needs its own click/hover handling.
    .arcsData(panelData.flows)
    .arcStartLat((flow) => (flow as (typeof panelData.flows)[number]).fromLat)
    .arcStartLng((flow) => (flow as (typeof panelData.flows)[number]).fromLng)
    .arcEndLat((flow) => (flow as (typeof panelData.flows)[number]).toLat)
    .arcEndLng((flow) => (flow as (typeof panelData.flows)[number]).toLng)
    .arcAltitudeAutoScale(0.3)
    .arcDashLength(0.4)
    .arcDashGap(0.15)
    .arcDashAnimateTime(2500)
    .arcLabel((flow) => {
      const f = flow as (typeof panelData.flows)[number];
      return `${f.fromName} → ${f.toName} (${FLOW_TYPE_LABELS[f.type] ?? f.type})`;
    })
    .onArcClick((flow) => selectFlow(panelData.flows.indexOf(flow as (typeof panelData.flows)[number])))
    // Only show the hand cursor over things that can be clicked.
    .showPointerCursor((type, item) => {
      if (type === 'point' || type === 'arc') return true;
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

  viewExporterBtn.addEventListener('click', () => setView('exporter'));
  viewImporterBtn.addEventListener('click', () => setView('importer'));
  setView(activeView);
  renderLegend();

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
