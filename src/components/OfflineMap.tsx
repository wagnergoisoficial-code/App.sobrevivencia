import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";
import "leaflet/dist/leaflet.css";
import "./OfflineMap.css";
import {
  ArrowUp,
  Compass,
  LocateFixed,
  MapPin,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  WifiOff,
  X
} from "lucide-react";
import estadosData from "../data/brasil-estados.json";
import municipiosData from "../data/municipios.json";
import type { MapPoint, MapPointCategory } from "../types";

// Everything the map draws ships with the app — no tile server, no network:
// state borders from the IBGE malhas API (qualidade intermediária) and municipal seats from
// github.com/kelvins/municipios-brasileiros (MIT, built on IBGE data).
type StateProps = { uf: string; nome: string; label: [number, number] };
type City = [nome: string, uf: string, lat: number, lng: number, capital: number];

const STATES = estadosData as unknown as FeatureCollection<Polygon | MultiPolygon, StateProps>;
const CITIES = municipiosData as unknown as City[];

const normalize = (text: string) =>
  text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const CITY_KEYS = CITIES.map((city) => normalize(city[0]));

const BRAZIL_BOUNDS = L.latLngBounds([-34.0, -74.2], [5.5, -28.6]);
const MAX_CITY_LABELS = 300;
// Small states whose abbreviations collide with their neighbours on the country-wide view
const SMALL_STATES = new Set(["DF", "SE", "AL", "RN", "PB", "ES", "RJ"]);

const CATEGORY_ORDER: MapPointCategory[] = ["encontro", "abrigo", "agua", "saude", "suprimentos", "perigo", "outro"];
const CATEGORIES: Record<MapPointCategory, { label: string; color: string }> = {
  encontro: { label: "Ponto de encontro", color: "#f59e0b" },
  abrigo: { label: "Abrigo", color: "#10b981" },
  agua: { label: "Água", color: "#0ea5e9" },
  saude: { label: "Hospital / Saúde", color: "#fb7185" },
  suprimentos: { label: "Suprimentos", color: "#f97316" },
  perigo: { label: "Perigo / Evitar", color: "#dc2626" },
  outro: { label: "Outro", color: "#94a3b8" }
};
const categoryOf = (category: string) => CATEGORIES[category as MapPointCategory] ?? CATEGORIES.outro;

type LatLng = { lat: number; lng: number };

type GpsState = {
  status: "idle" | "locating" | "active" | "weak" | "denied" | "unsupported";
  position: (LatLng & { accuracy: number }) | null;
};

type Draft = {
  id: string | null; // null while creating, the point id while editing
  lat: number;
  lng: number;
  name: string;
  category: MapPointCategory;
  notes: string;
};

// --- Geo helpers ---------------------------------------------------------

const toRad = (deg: number) => (deg * Math.PI) / 180;

function distanceMeters(a: LatLng, b: LatLng) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371008.8 * Math.asin(Math.sqrt(h));
}

// Initial compass bearing from a to b, 0° = north, clockwise
function bearingDegrees(a: LatLng, b: LatLng) {
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(toRad(b.lat));
  const x = Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) - Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

const COMPASS_POINTS = ["N", "NE", "L", "SE", "S", "SO", "O", "NO"];
const compassPoint = (bearing: number) => COMPASS_POINTS[Math.round(bearing / 45) % 8];

function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  return `${km.toLocaleString("pt-BR", { maximumFractionDigits: km < 10 ? 1 : 0 })} km`;
}

const formatCoord = ({ lat, lng }: LatLng) => `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
const round6 = (n: number) => Math.round(n * 1e6) / 1e6;
const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// --- Leaflet icon helpers (text goes in via textContent, never as HTML) ---

function textElement(text: string) {
  const span = document.createElement("span");
  span.textContent = text;
  return span;
}

const textIcon = (className: string, text: string) =>
  L.divIcon({ className, html: textElement(text), iconSize: [0, 0] });

function pinIcon(color: string, state: "" | "is-selected" | "is-draft") {
  const dot = document.createElement("span");
  dot.style.setProperty("--pin", color);
  const size = state === "is-draft" ? 34 : 26;
  return L.divIcon({ className: `offline-map-pin ${state}`, html: dot, iconSize: [size, size] });
}

function setLayerVisible(map: L.Map, layer: L.Layer, visible: boolean) {
  if (visible && !map.hasLayer(layer)) layer.addTo(map);
  else if (!visible && map.hasLayer(layer)) map.removeLayer(layer);
}

// -------------------------------------------------------------------------

interface OfflineMapProps {
  points: MapPoint[];
  onChangePoints: (update: (prev: MapPoint[]) => MapPoint[]) => void;
}

export default function OfflineMap({ points, onChangePoints }: OfflineMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const pointsLayerRef = useRef<L.LayerGroup | null>(null);
  const gpsLayerRef = useRef<L.LayerGroup | null>(null);
  const draftLayerRef = useRef<L.LayerGroup | null>(null);
  const searchLayerRef = useRef<L.LayerGroup | null>(null);
  const placingRef = useRef(false);
  const watchIdRef = useRef<number | null>(null);
  const centerOnFixRef = useRef(false);
  const initialPointsRef = useRef(points);

  const [placing, setPlacing] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [gps, setGps] = useState<GpsState>({ status: "idle", position: null });
  const [query, setQuery] = useState("");
  const [online, setOnline] = useState(() => navigator.onLine);

  const setPlacingMode = (value: boolean) => {
    placingRef.current = value;
    setPlacing(value);
  };

  // Build the map once
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const map = L.map(container, {
      // Leaflet's keyboard handler focuses the map on mousedown, which scrolls the workbook pane
      // mid-tap and drops the new point away from where the user touched
      keyboard: false,
      preferCanvas: true,
      minZoom: 3,
      maxZoom: 18,
      zoomSnap: 0.5,
      maxBounds: BRAZIL_BOUNDS.pad(0.5),
      maxBoundsViscosity: 0.8
    });
    mapRef.current = map;
    map.attributionControl.setPrefix(false);
    map.attributionControl.addAttribution("Leaflet · Dados: IBGE");
    // With no streets drawn, the scale bar is how people judge distances on screen
    L.control.scale({ imperial: false, position: "bottomleft" }).addTo(map);

    L.geoJSON(STATES, {
      interactive: false,
      style: { color: "#334155", weight: 1, fillColor: "#0f172a", fillOpacity: 1 }
    }).addTo(map);

    const stateLabelMarkers = (small: boolean) =>
      STATES.features
        .filter((state) => SMALL_STATES.has(state.properties.uf) === small)
        .map((state) =>
          L.marker(state.properties.label, {
            icon: textIcon("offline-map-uf", state.properties.uf),
            interactive: false,
            keyboard: false
          })
        );
    const stateLabels = L.layerGroup(stateLabelMarkers(false));
    const smallStateLabels = L.layerGroup(stateLabelMarkers(true));

    const capitalDots = L.layerGroup();
    const cityDots = L.layerGroup();
    for (const [, , lat, lng, capital] of CITIES) {
      const dot = L.circleMarker([lat, lng], {
        interactive: false,
        stroke: false,
        radius: capital ? 3.5 : 2,
        fillColor: capital ? "#e2e8f0" : "#64748b",
        fillOpacity: 0.9
      });
      (capital ? capitalDots : cityDots).addLayer(dot);
    }
    const cityLabels = L.layerGroup().addTo(map);

    searchLayerRef.current = L.layerGroup().addTo(map);
    pointsLayerRef.current = L.layerGroup().addTo(map);
    gpsLayerRef.current = L.layerGroup().addTo(map);
    draftLayerRef.current = L.layerGroup().addTo(map);

    // Show more detail as the user zooms in; labels only for what is on screen
    const updateDetail = () => {
      const zoom = map.getZoom();
      setLayerVisible(map, stateLabels, zoom < 7);
      setLayerVisible(map, smallStateLabels, zoom >= 5 && zoom < 7);
      setLayerVisible(map, capitalDots, zoom >= 4.5);
      setLayerVisible(map, cityDots, zoom >= 6);

      cityLabels.clearLayers();
      if (zoom < 5) return;
      const bounds = map.getBounds().pad(0.2);
      const allCities = zoom >= 10;
      let count = 0;
      for (const [nome, , lat, lng, capital] of CITIES) {
        if ((!capital && !allCities) || !bounds.contains([lat, lng])) continue;
        cityLabels.addLayer(
          L.marker([lat, lng], {
            icon: textIcon(capital ? "offline-map-city is-capital" : "offline-map-city", nome),
            interactive: false,
            keyboard: false
          })
        );
        if (++count >= MAX_CITY_LABELS) break;
      }
    };
    map.on("zoomend moveend", updateDetail);

    map.on("click", (event: L.LeafletMouseEvent) => {
      if (!placingRef.current) {
        setSelectedId(null);
        return;
      }
      setPlacingMode(false);
      setSelectedId(null);
      setDraft({ id: null, lat: event.latlng.lat, lng: event.latlng.lng, name: "", category: "encontro", notes: "" });
    });

    const saved = initialPointsRef.current;
    if (saved.length > 0) {
      map.fitBounds(L.latLngBounds(saved.map((p) => [p.lat, p.lng] as [number, number])), { maxZoom: 13, padding: [40, 40] });
    } else {
      map.fitBounds(BRAZIL_BOUNDS);
    }
    updateDetail();

    const resizeObserver = new ResizeObserver(() => map.invalidateSize());
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Saved points
  useEffect(() => {
    const layer = pointsLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    for (const point of points) {
      if (draft?.id === point.id) continue; // the draggable draft marker stands in while editing
      const selected = point.id === selectedId;
      L.marker([point.lat, point.lng], {
        icon: pinIcon(categoryOf(point.category).color, selected ? "is-selected" : ""),
        keyboard: false,
        zIndexOffset: selected ? 1000 : 0
      })
        .bindTooltip(textElement(point.name), {
          permanent: true,
          direction: "top",
          offset: [0, -12],
          className: "offline-map-point-label"
        })
        .on("click", () => setSelectedId(point.id))
        .addTo(layer);
    }
  }, [points, selectedId, draft?.id]);

  // GPS position and accuracy radius
  useEffect(() => {
    const layer = gpsLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    const position = gps.position;
    if (!position) return;
    L.circle([position.lat, position.lng], {
      radius: position.accuracy,
      interactive: false,
      color: "#38bdf8",
      weight: 1,
      opacity: 0.6,
      fillColor: "#38bdf8",
      fillOpacity: 0.1
    }).addTo(layer);
    L.marker([position.lat, position.lng], {
      icon: L.divIcon({ className: "offline-map-gps", html: "<span></span>", iconSize: [24, 24] }),
      interactive: false,
      keyboard: false,
      zIndexOffset: 500
    }).addTo(layer);
  }, [gps.position]);

  // Draft marker, draggable to fine-tune the position
  useEffect(() => {
    const layer = draftLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (!draft) return;
    const marker = L.marker([draft.lat, draft.lng], {
      icon: pinIcon(categoryOf(draft.category).color, "is-draft"),
      draggable: true,
      keyboard: false,
      zIndexOffset: 2000
    });
    marker.on("dragend", () => {
      const { lat, lng } = marker.getLatLng();
      setDraft((current) => current && { ...current, lat, lng });
    });
    marker.addTo(layer);
  }, [draft?.lat, draft?.lng, draft?.category]);

  const draftOpen = draft !== null;
  useEffect(() => {
    if (draftOpen) {
      formRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "nearest" });
    }
  }, [draftOpen]);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(
    () => () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    },
    []
  );

  const focus = (lat: number, lng: number, zoom: number) => {
    const map = mapRef.current;
    if (!map) return;
    if (prefersReducedMotion()) map.setView([lat, lng], zoom);
    else map.flyTo([lat, lng], zoom, { duration: 0.8 });
  };

  // GPS works without internet on phones; the watch keeps refining the fix while the tab is open
  const locate = () => {
    const map = mapRef.current;
    if (gps.position && watchIdRef.current !== null) {
      focus(gps.position.lat, gps.position.lng, Math.max(map?.getZoom() ?? 0, 15));
      return;
    }
    if (!("geolocation" in navigator)) {
      setGps({ status: "unsupported", position: null });
      return;
    }
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    centerOnFixRef.current = true;
    setGps((current) => ({ ...current, status: "locating" }));
    watchIdRef.current = navigator.geolocation.watchPosition(
      (result) => {
        const position = { lat: result.coords.latitude, lng: result.coords.longitude, accuracy: result.coords.accuracy };
        setGps({ status: "active", position });
        if (centerOnFixRef.current) {
          centerOnFixRef.current = false;
          focus(position.lat, position.lng, Math.max(mapRef.current?.getZoom() ?? 0, 15));
        }
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
          setGps({ status: "denied", position: null });
        } else {
          // Timeout or no satellite fix yet — the watch keeps trying
          setGps((current) => ({ ...current, status: current.position ? "active" : "weak" }));
        }
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 30000 }
    );
  };

  const results = useMemo(() => {
    const q = normalize(query.trim());
    if (q.length < 2) return [];
    const starts: number[] = [];
    const contains: number[] = [];
    CITY_KEYS.forEach((key, i) => {
      if (key.startsWith(q)) starts.push(i);
      else if (key.includes(q)) contains.push(i);
    });
    // Exact name first, then capitals, then shorter names
    starts.sort(
      (a, b) =>
        Number(CITY_KEYS[b] === q) - Number(CITY_KEYS[a] === q) ||
        CITIES[b][4] - CITIES[a][4] ||
        CITY_KEYS[a].length - CITY_KEYS[b].length
    );
    return [...starts, ...contains].slice(0, 8);
  }, [query]);

  const goToCity = (index: number) => {
    const [, , lat, lng] = CITIES[index];
    setQuery("");
    const layer = searchLayerRef.current;
    layer?.clearLayers();
    if (layer) {
      L.circleMarker([lat, lng], { radius: 9, color: "#f59e0b", weight: 2, fill: false, interactive: false }).addTo(layer);
    }
    focus(lat, lng, 12);
  };

  const here = gps.position;
  const rows = useMemo(() => {
    const list = points.map((point) => ({
      point,
      meters: here ? distanceMeters(here, point) : null,
      bearing: here ? bearingDegrees(here, point) : null
    }));
    if (here) list.sort((a, b) => (a.meters ?? 0) - (b.meters ?? 0));
    return list;
  }, [points, here]);
  const selectedRow = rows.find((row) => row.point.id === selectedId);

  const toggleAdding = () => {
    setDraft(null);
    setSelectedId(null);
    setPlacingMode(!placing);
  };

  const addAtMyPosition = () => {
    if (!here) return;
    setPlacingMode(false);
    setDraft({ id: null, lat: here.lat, lng: here.lng, name: "", category: "encontro", notes: "" });
    focus(here.lat, here.lng, Math.max(mapRef.current?.getZoom() ?? 0, 15));
  };

  const editPoint = (point: MapPoint) => {
    setPlacingMode(false);
    setSelectedId(point.id);
    setDraft({ id: point.id, lat: point.lat, lng: point.lng, name: point.name, category: point.category in CATEGORIES ? point.category : "outro", notes: point.notes });
    focus(point.lat, point.lng, Math.max(mapRef.current?.getZoom() ?? 0, 14));
  };

  const focusPoint = (point: MapPoint) => {
    setSelectedId(point.id);
    focus(point.lat, point.lng, Math.max(mapRef.current?.getZoom() ?? 0, 14));
    containerRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "nearest" });
  };

  const deletePoint = (id: string) => {
    onChangePoints((prev) => prev.filter((point) => point.id !== id));
    if (selectedId === id) setSelectedId(null);
    if (draft?.id === id) setDraft(null);
  };

  const saveDraft = (event: FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    const point: MapPoint = {
      id: draft.id ?? `map-${Date.now()}`,
      name: draft.name.trim() || categoryOf(draft.category).label,
      category: draft.category,
      lat: round6(draft.lat),
      lng: round6(draft.lng),
      notes: draft.notes.trim()
    };
    onChangePoints((prev) =>
      draft.id ? prev.map((existing) => (existing.id === point.id ? point : existing)) : [...prev, point]
    );
    setDraft(null);
    setSelectedId(point.id);
  };

  const directionText = (meters: number | null, bearing: number | null) =>
    meters !== null && bearing !== null
      ? `${formatDistance(meters)} · ${compassPoint(bearing)} (${Math.round(bearing)}°)`
      : "Ative sua localização para ver distância e direção";

  const gpsText: Record<GpsState["status"], string> = {
    idle: "Localização desligada",
    locating: "Procurando sinal de GPS...",
    active: here ? `GPS ativo · precisão de ${Math.round(here.accuracy)} m` : "GPS ativo",
    weak: "Sinal de GPS fraco · vá para um local aberto",
    denied: "Localização bloqueada · libere nas configurações do navegador",
    unsupported: "Este aparelho não oferece localização"
  };

  const inputClass =
    "w-full bg-slate-950 border border-slate-800 rounded p-2 text-base sm:text-sm text-slate-200 focus:outline-none focus:border-amber-500";

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-950 pb-4">
        <div className="flex items-center space-x-2 text-amber-500 font-mono text-xs uppercase tracking-wider font-bold">
          <Compass className="h-4.5 w-4.5" />
          <span>Navegação Sem Internet</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-serif font-extrabold text-slate-50 mt-1">Mapa Offline</h1>
        <p className="text-xs md:text-sm text-slate-400 mt-1">
          O mapa do Brasil fica salvo no aparelho e funciona sem internet. O GPS do celular mostra onde você está, e
          você marca pontos de encontro, abrigos, fontes de água e perigos, com a distância e a direção até cada um.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-wider print:hidden">
        {online ? (
          <span className="flex items-center gap-1.5 rounded border border-emerald-500/20 bg-emerald-500/5 px-2 py-1 text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            Salvo no aparelho · funciona sem internet
          </span>
        ) : (
          <span className="flex items-center gap-1.5 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-amber-400">
            <WifiOff className="h-3.5 w-3.5" />
            Sem internet · mapa funcionando
          </span>
        )}
        <span
          className={`flex items-center gap-1.5 rounded border px-2 py-1 ${
            gps.status === "active"
              ? "border-sky-500/30 bg-sky-500/10 text-sky-300"
              : gps.status === "denied" || gps.status === "weak" || gps.status === "unsupported"
                ? "border-rose-500/20 bg-rose-500/5 text-rose-300"
                : "border-slate-800 bg-slate-900 text-slate-400"
          }`}
        >
          <LocateFixed className="h-3.5 w-3.5" />
          {gpsText[gps.status]}
        </span>
        {here && <span className="px-1 text-slate-500 normal-case tracking-normal">{formatCoord(here)}</span>}
      </div>

      <div className={`rounded-xl border border-slate-900 bg-slate-900/30 overflow-hidden print:hidden ${placing ? "is-placing" : ""}`}>
        <div className="relative z-20 flex flex-col gap-2 border-b border-slate-900 p-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && results.length > 0) goToCity(results[0]);
                if (event.key === "Escape") setQuery("");
              }}
              placeholder="Buscar cidade..."
              aria-label="Buscar cidade"
              className={`${inputClass} pl-8`}
            />
            {query.trim().length >= 2 && (
              <div className="absolute left-0 right-0 top-full mt-1 max-h-72 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950 py-1 shadow-xl">
                {results.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-slate-500">Nenhuma cidade encontrada.</p>
                ) : (
                  results.map((index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => goToCity(index)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-900 cursor-pointer"
                    >
                      <span>{CITIES[index][0]}</span>
                      <span className="font-mono text-xs text-slate-500">{CITIES[index][1]}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={locate}
              className="flex min-h-11 flex-1 sm:min-h-0 sm:flex-none items-center justify-center gap-1.5 rounded border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-mono font-bold uppercase text-slate-300 transition-colors hover:border-sky-500/40 hover:text-white cursor-pointer"
            >
              <LocateFixed className="h-4 w-4 text-sky-400" />
              <span className="sm:hidden">Onde estou</span>
              <span className="hidden sm:inline">Minha localização</span>
            </button>
            <button
              type="button"
              onClick={toggleAdding}
              className={`flex min-h-11 flex-1 sm:min-h-0 sm:flex-none items-center justify-center gap-1.5 rounded px-3 py-2 text-xs font-mono font-bold uppercase transition-colors cursor-pointer ${
                placing ? "bg-slate-800 text-slate-200 hover:bg-slate-700" : "bg-amber-500 text-slate-950 hover:bg-amber-600"
              }`}
            >
              {placing ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {placing ? (
                <span>Cancelar</span>
              ) : (
                <>
                  <span className="sm:hidden">Novo ponto</span>
                  <span className="hidden sm:inline">Adicionar ponto</span>
                </>
              )}
            </button>
          </div>
        </div>

        {placing && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              Toque no mapa onde fica o ponto.
            </span>
            {here && (
              <button type="button" onClick={addAtMyPosition} className="font-mono font-bold uppercase hover:underline cursor-pointer">
                Usar minha posição atual
              </button>
            )}
          </div>
        )}

        {/* Leaflet owns this element's class list — keep its className static */}
        <div ref={containerRef} role="region" aria-label="Mapa offline do Brasil" className="offline-map isolate h-[55vh] min-h-[320px] max-h-[620px] w-full" />

        {selectedRow && !draft && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-900 bg-slate-950 px-4 py-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: categoryOf(selectedRow.point.category).color }} />
                <span className="truncate">{selectedRow.point.name}</span>
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                {categoryOf(selectedRow.point.category).label} · {directionText(selectedRow.meters, selectedRow.bearing)}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => editPoint(selectedRow.point)}
                className="flex items-center gap-1 rounded px-2 py-1.5 text-xs font-mono uppercase text-slate-400 hover:text-amber-500 cursor-pointer"
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </button>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                aria-label="Fechar detalhes do ponto"
                className="rounded p-1.5 text-slate-500 hover:text-slate-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        <p className="border-t border-slate-900 px-3 py-2 text-[11px] text-slate-500">
          Mapa sem ruas: mostra estados e cidades. Aproxime para ver o nome das cidades e use o GPS e seus pontos para
          se orientar.
        </p>
      </div>

      {draft && (
        <form
          ref={formRef}
          onSubmit={saveDraft}
          className="bg-slate-900/30 p-5 rounded-lg border border-amber-500/20 space-y-4 print:hidden"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-mono text-xs uppercase text-slate-400 font-bold">
              {draft.id ? "Editar ponto" : "Novo ponto no mapa"}
            </h3>
            <span className="font-mono text-[11px] text-slate-500">{formatCoord(draft)}</span>
          </div>
          <p className="text-xs text-slate-500">
            Arraste o marcador tracejado para ajustar a posição
            {here ? (
              <>
                {" ou "}
                <button
                  type="button"
                  onClick={() => setDraft((current) => current && { ...current, lat: here.lat, lng: here.lng })}
                  className="text-amber-500 hover:underline cursor-pointer"
                >
                  use sua posição atual
                </button>
              </>
            ) : null}
            .
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-5 space-y-1">
              <label htmlFor="map-point-name" className="text-[10px] font-mono uppercase text-slate-500 block">
                Nome do ponto:
              </label>
              <input
                id="map-point-name"
                type="text"
                maxLength={60}
                placeholder="Ex: Casa da avó, Praça da igreja..."
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-3 space-y-1">
              <label htmlFor="map-point-category" className="text-[10px] font-mono uppercase text-slate-500 block">
                Tipo:
              </label>
              <select
                id="map-point-category"
                value={draft.category}
                onChange={(event) => setDraft({ ...draft, category: event.target.value as MapPointCategory })}
                className={inputClass}
              >
                {CATEGORY_ORDER.map((category) => (
                  <option key={category} value={category}>
                    {CATEGORIES[category].label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-4 space-y-1">
              <label htmlFor="map-point-notes" className="text-[10px] font-mono uppercase text-slate-500 block">
                Observações:
              </label>
              <input
                id="map-point-notes"
                type="text"
                maxLength={140}
                placeholder="Ex: Portão azul, levar lanterna..."
                value={draft.notes}
                onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
                className={inputClass}
              />
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="rounded border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs font-mono font-bold uppercase text-slate-300 hover:text-white cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded bg-amber-500 px-4 py-2.5 text-xs font-mono font-bold uppercase text-slate-950 transition-colors hover:bg-amber-600 cursor-pointer"
            >
              Salvar ponto
            </button>
          </div>
        </form>
      )}

      <div className="border border-slate-900 rounded-lg overflow-hidden bg-slate-900/10">
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950 border-b border-slate-900 px-4 py-3">
          <h3 className="font-mono text-[10px] uppercase text-slate-400 font-bold tracking-wider">
            Pontos salvos ({points.length})
          </h3>
          {here && points.length > 1 && (
            <span className="font-mono text-[10px] uppercase text-slate-500">Do mais perto ao mais longe</span>
          )}
        </div>
        {rows.length === 0 ? (
          <p className="p-6 text-center text-slate-600 italic font-mono text-xs">
            Nenhum ponto salvo. Toque em “Adicionar ponto” e marque no mapa seu ponto de encontro, abrigo ou fonte de água.
          </p>
        ) : (
          <ul className="divide-y divide-slate-900">
            {rows.map(({ point, meters, bearing }) => {
              const category = categoryOf(point.category);
              return (
                <li
                  key={point.id}
                  className={`flex items-start gap-3 px-4 py-3 ${point.id === selectedId ? "bg-amber-500/5" : "hover:bg-slate-900/20"}`}
                >
                  <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: category.color }} />
                  <button type="button" onClick={() => focusPoint(point)} className="min-w-0 flex-1 text-left cursor-pointer">
                    <p className="truncate text-sm font-semibold text-slate-200">{point.name}</p>
                    <p className="text-xs text-slate-500">
                      {category.label}
                      {point.notes ? ` · ${point.notes}` : ""}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-slate-600">{formatCoord(point)}</p>
                  </button>
                  <div className="shrink-0 text-right">
                    {meters !== null && bearing !== null ? (
                      <>
                        <p className="text-sm font-bold text-slate-100">{formatDistance(meters)}</p>
                        <p className="flex items-center justify-end gap-1 font-mono text-[11px] text-amber-500">
                          <ArrowUp className="h-3 w-3" style={{ transform: `rotate(${bearing}deg)` }} aria-hidden />
                          {compassPoint(bearing)} {Math.round(bearing)}°
                        </p>
                      </>
                    ) : (
                      <p className="font-mono text-[11px] text-slate-600">Sem GPS</p>
                    )}
                    <div className="mt-1 flex justify-end gap-1 print:hidden">
                      <button
                        type="button"
                        onClick={() => editPoint(point)}
                        aria-label={`Editar ${point.name}`}
                        className="p-2 text-slate-500 hover:text-amber-500 transition-colors cursor-pointer"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deletePoint(point.id)}
                        aria-label={`Excluir ${point.name}`}
                        className="p-2 text-slate-500 hover:text-rose-500 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
