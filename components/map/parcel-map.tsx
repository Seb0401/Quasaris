"use client";

import "leaflet/dist/leaflet.css";
import L, { type Map as LeafletMap } from "leaflet";
import { CircleMarker, MapContainer, Marker, Polygon, Polyline, TileLayer, useMapEvents } from "react-leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Globe,
  MapPin,
  PenLine,
  Trash2,
  Undo2,
  Layers,
  LocateFixed,
  Minus,
  Navigation,
  Plus,
  Search,
  X,
} from "lucide-react";
import { useLocale } from "@/components/i18n-provider";
import { GIBS_LAYERS, gibsUrl, smapDate } from "@/lib/gibs";
import { centroid, polygonAreaHa, type LatLon } from "@/lib/geo";

type Props = {
  lat: number;
  lon: number;
  onPick: (lat: number, lon: number) => void;
  ndviTime?: string;
  showNdvi?: boolean;
  className?: string;
  compact?: boolean;
  /** ocupa todo el contenedor padre (vista de mapa a pantalla completa) */
  fill?: boolean;
  /** caja de búsqueda flotante arriba a la izquierda */
  search?: boolean;
  /** paneles flotantes propios de la página, encima del mapa */
  children?: React.ReactNode;
  /** contorno de la parcela; con onBoundary se puede dibujar sobre el mapa */
  boundary?: LatLon[];
  onBoundary?: (pts: LatLon[] | undefined) => void;
};

type Base = "satellite" | "hybrid" | "terrain";
type Data = "ndvi" | "smap" | "none";

const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services";
const BASES: Record<Base, { url: string; labels?: string; thumb: string }> = {
  satellite: {
    url: `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`,
    thumb: `${ESRI}/World_Imagery/MapServer/tile/10/559/306`,
  },
  hybrid: {
    url: `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`,
    labels: `${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`,
    thumb: `${ESRI}/World_Imagery/MapServer/tile/10/559/306`,
  },
  terrain: {
    url: `${ESRI}/World_Topo_Map/MapServer/tile/{z}/{y}/{x}`,
    thumb: `${ESRI}/World_Topo_Map/MapServer/tile/10/559/306`,
  },
};

/** Zonas agrícolas de Arequipa para saltar rápido (centros aproximados). */
const ZONES: { name: string; lat: number; lon: number }[] = [
  { name: "Majes (El Pedregal)", lat: -16.36, lon: -72.19 },
  { name: "Santa Rita de Siguas", lat: -16.49, lon: -72.1 },
  { name: "La Joya", lat: -16.43, lon: -71.82 },
  { name: "Vítor", lat: -16.43, lon: -71.93 },
  { name: "Valle de Camaná", lat: -16.62, lon: -72.71 },
  { name: "Aplao (Valle de Majes)", lat: -16.08, lon: -72.49 },
  { name: "Valle del Colca (Chivay)", lat: -15.64, lon: -71.6 },
  { name: "Valle de Tambo (Cocachacra)", lat: -17.09, lon: -71.77 },
];

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const PIN = L.divIcon({
  className: "map-pin",
  html: `<svg viewBox="0 0 32 44" width="32" height="44" aria-hidden="true"><path d="M16 43c-1-6-14-16-14-27a14 14 0 0 1 28 0c0 11-13 21-14 27z" fill="#b9ff63" stroke="#0a2230" stroke-width="2"/><circle cx="16" cy="16" r="5.5" fill="#0a2230"/></svg>`,
  iconSize: [32, 44],
  iconAnchor: [16, 43],
});

function ClickHandler({ onPick }: { onPick: Props["onPick"] }) {
  useMapEvents({
    click: (event) => onPick(event.latlng.lat, event.latlng.lng),
  });
  return null;
}

const nf = (es: boolean) => new Intl.NumberFormat(es ? "es" : "en", { maximumFractionDigits: 2 });

export default function ParcelMap({
  lat,
  lon,
  onPick,
  ndviTime = "2025-09-01",
  showNdvi = true,
  compact = false,
  fill = false,
  search = false,
  className = "",
  children,
  boundary,
  onBoundary,
}: Props) {
  const es = useLocale() === "es";
  const [base, setBase] = useState<Base>("hybrid");
  const [data, setData] = useState<Data>(showNdvi ? "ndvi" : "none");
  const [opacity, setOpacity] = useState(0.6);
  const [layersOpen, setLayersOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [map, setMap] = useState<LeafletMap | null>(null);
  const [draft, setDraft] = useState<LatLon[] | null>(null); // dibujando el contorno
  const drawing = draft !== null;
  const date = new Intl.DateTimeFormat(es ? "es" : "en", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${ndviTime}T00:00:00Z`));

  // seguir a la parcela cuando cambia desde fuera (GPS, búsqueda, otra pantalla)
  useEffect(() => {
    if (map)
      map.flyTo([lat, lon], Math.max(map.getZoom(), 11), { duration: 1.1 });
  }, [map, lat, lon]);

  const markerEvents = useMemo(
    () => ({
      dragend: (e: L.LeafletEvent) => {
        const p = (e.target as L.Marker).getLatLng();
        onPick(p.lat, p.lng);
      },
    }),
    [onPick],
  );

  const locate = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onPick(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const ndvi = GIBS_LAYERS.ndviMonthly;
  const smap = GIBS_LAYERS.smapRootZone;
  const b = BASES[base];

  return (
    <div
      className={`parcel-map-shell ${compact ? "compact" : ""} ${fill ? "fill" : ""} ${className}`}
    >
      <MapContainer
        ref={setMap}
        center={[lat, lon]}
        zoom={11}
        className="parcel-map"
        scrollWheelZoom
        zoomControl={false}
        attributionControl
      >
        <TileLayer
          key={base}
          attribution="Imagery © Esri"
          url={b.url}
          maxZoom={18}
        />
        {data === "ndvi" && (
          <TileLayer
            key={`ndvi-${ndviTime}`}
            attribution="NDVI: NASA GIBS / MODIS Terra"
            url={gibsUrl(ndvi, ndviTime)}
            maxNativeZoom={ndvi.maxNativeZoom}
            maxZoom={18}
            opacity={opacity}
          />
        )}
        {data === "smap" && (
          <TileLayer
            key={`smap-${ndviTime}`}
            attribution="Soil moisture: NASA GIBS / SMAP L4"
            url={gibsUrl(smap, smapDate(ndviTime))}
            maxNativeZoom={smap.maxNativeZoom}
            maxZoom={18}
            opacity={opacity}
          />
        )}
        {b.labels && (
          <TileLayer
            key={`${base}-labels`}
            url={b.labels}
            maxZoom={18}
            zIndex={5}
          />
        )}
        {boundary && boundary.length >= 3 && !drawing && (
          <Polygon positions={boundary} pathOptions={{ color: "#b9ff63", weight: 2.5, fillColor: "#b9ff63", fillOpacity: 0.15, dashArray: "6 4" }} />
        )}
        {drawing && draft.length >= 3 && <Polygon positions={draft} pathOptions={{ color: "#b9ff63", weight: 2, fillOpacity: 0.12 }} />}
        {drawing && draft.length === 2 && <Polyline positions={draft} pathOptions={{ color: "#b9ff63", weight: 2 }} />}
        {drawing && draft.map((pt, i) => <CircleMarker key={i} center={pt} radius={6} pathOptions={{ color: "#0a2230", weight: 2, fillColor: i === 0 ? "#ffffff" : "#b9ff63", fillOpacity: 1 }} />)}
        {!drawing && <Marker position={[lat, lon]} icon={PIN} draggable eventHandlers={markerEvents} />}
        <ClickHandler onPick={(la, lo) => (drawing ? setDraft((d) => [...(d ?? []), [la, lo]]) : onPick(la, lo))} />
      </MapContainer>

      {search && <SearchBox es={es} onPick={onPick} />}

      {/* arriba a la derecha: fecha de la capa NASA */}
      {data !== "none" && (
        <div className="gm-chip gm-date">
          {data === "ndvi" ? "MODIS NDVI" : "SMAP"} ·{" "}
          <span className="capitalize">{date}</span>
        </div>
      )}

      {/* abajo a la derecha: mi ubicación y zoom, como en Google Maps */}
      <div className="gm-controls">
        <button
          type="button"
          className="gm-round"
          onClick={locate}
          disabled={locating}
          aria-label={es ? "Mi ubicación" : "My location"}
          title={es ? "Mi ubicación" : "My location"}
        >
          <Navigation size={17} className={locating ? "animate-pulse" : ""} />
        </button>
        <button
          type="button"
          className="gm-round"
          onClick={() =>
            map?.flyTo([lat, lon], Math.max(map.getZoom(), 13), { duration: 1 })
          }
          aria-label={es ? "Centrar parcela" : "Center field"}
          title={es ? "Centrar parcela" : "Center field"}
        >
          <LocateFixed size={17} />
        </button>
        <div className="gm-zoom">
          <button
            type="button"
            onClick={() => map?.zoomIn()}
            aria-label={es ? "Acercar" : "Zoom in"}
          >
            <Plus size={17} />
          </button>
          <button
            type="button"
            onClick={() => map?.zoomOut()}
            aria-label={es ? "Alejar" : "Zoom out"}
          >
            <Minus size={17} />
          </button>
        </div>
      </div>

      {/* abajo a la izquierda: botón de capas + leyenda */}
      <div className="gm-layers-anchor">
        {layersOpen && (
          <div
            className="gm-popover gm-layers-pop"
            role="dialog"
            aria-label={es ? "Capas" : "Layers"}
          >
            <div className="gm-pop-head">
              <b>{es ? "Capas" : "Layers"}</b>
              <button
                type="button"
                onClick={() => setLayersOpen(false)}
                aria-label={es ? "Cerrar" : "Close"}
              >
                <X size={15} />
              </button>
            </div>
            <div className="gm-pop-cols">
              <div>
                <small className="gm-pop-kicker">
                  {es ? "Tipo de mapa" : "Map type"}
                </small>
                <div className="gm-thumbs">
                  {(["satellite", "hybrid", "terrain"] as Base[]).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setBase(k)}
                      className={base === k ? "active" : ""}
                      aria-pressed={base === k}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={BASES[k].thumb}
                        alt=""
                        loading="lazy"
                        className={k === "hybrid" ? "hybrid" : ""}
                      />
                      <span>
                        {k === "satellite"
                          ? es
                            ? "Satélite"
                            : "Satellite"
                          : k === "hybrid"
                            ? es
                              ? "Con nombres"
                              : "Labels"
                            : es
                              ? "Relieve"
                              : "Terrain"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <small className="gm-pop-kicker">
                  {es ? "Datos satelitales NASA" : "NASA satellite data"}
                </small>
                <div className="gm-data-list">
                  {(
                    [
                      [
                        "ndvi",
                        es ? "Vigor de la vegetación" : "Vegetation vigor",
                        "MODIS NDVI",
                        "linear-gradient(90deg,#a67c52,#e8d98a,#7fbf5f,#1f6b2a)",
                      ],
                      [
                        "smap",
                        es ? "Humedad del suelo" : "Soil moisture",
                        "SMAP L4",
                        "linear-gradient(90deg,#c9a46b,#e8e3b0,#7fc6c9,#2b6cb0)",
                      ],
                      [
                        "none",
                        es ? "Sin capa" : "No layer",
                        "",
                        "rgba(255,255,255,.08)",
                      ],
                    ] as [Data, string, string, string][]
                  ).map(([k, label, src, swatch]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setData(k)}
                      className={data === k ? "active" : ""}
                      aria-pressed={data === k}
                    >
                      <i style={{ background: swatch }} />
                      <span>
                        <b>{label}</b>
                        {src && <small>{src}</small>}
                      </span>
                      {data === k && <Check size={15} />}
                    </button>
                  ))}
                </div>
                {data !== "none" && (
                  <label className="gm-opacity">
                    <span>{es ? "Transparencia" : "Opacity"}</span>
                    <input
                      type="range"
                      min={0.2}
                      max={0.9}
                      step={0.05}
                      value={opacity}
                      onChange={(e) => setOpacity(Number(e.target.value))}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
        )}
        <button
          type="button"
          className={`gm-layers-btn ${layersOpen ? "open" : ""}`}
          onClick={() => setLayersOpen((o) => !o)}
          aria-expanded={layersOpen}
          aria-label={es ? "Capas" : "Layers"}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={BASES[base === "terrain" ? "satellite" : "terrain"].thumb}
            alt=""
            loading="lazy"
          />
          <span>
            <Layers size={13} />
            {es ? "Capas" : "Layers"}
          </span>
        </button>
        {data !== "none" && !layersOpen && (
          <div className="gm-chip gm-legend">
            <span
              className="ndvi-gradient"
              style={
                data === "smap"
                  ? {
                      background:
                        "linear-gradient(90deg,#c9a46b,#e8e3b0,#7fc6c9,#2b6cb0)",
                    }
                  : undefined
              }
            />
            <small>
              <span>
                {data === "smap"
                  ? es
                    ? "Seco"
                    : "Dry"
                  : es
                    ? "Poca planta"
                    : "Sparse"}
              </span>
              <span>
                {data === "smap"
                  ? es
                    ? "Húmedo"
                    : "Wet"
                  : es
                    ? "Mucha planta"
                    : "Dense"}
              </span>
            </small>
          </div>
        )}
      </div>

      {onBoundary && !drawing && (
        <button type="button" className="gm-chip gm-draw-btn" onClick={() => setDraft([])}>
          <PenLine size={14} />
          {boundary?.length ? (es ? "Redibujar terreno" : "Redraw field") : es ? "Dibujar mi terreno" : "Draw my field"}
        </button>
      )}
      {drawing && (
        <div className="gm-drawbar" role="toolbar" aria-label={es ? "Dibujar terreno" : "Draw field"}>
          <span>
            <b>{draft.length < 3 ? (es ? "Toca las esquinas de tu terreno" : "Tap the corners of your field") : `${nf(es).format(polygonAreaHa(draft))} ha`}</b>
            <small>
              {draft.length} {es ? "puntos" : "points"}
            </small>
          </span>
          <button type="button" onClick={() => setDraft((d) => (d ?? []).slice(0, -1))} disabled={!draft.length} aria-label={es ? "Deshacer punto" : "Undo point"}>
            <Undo2 size={15} />
          </button>
          <button type="button" onClick={() => setDraft(null)} aria-label={es ? "Cancelar" : "Cancel"}>
            <X size={15} />
          </button>
          <button
            type="button"
            className="ok"
            disabled={draft.length < 3}
            onClick={() => {
              const [cla, clo] = centroid(draft);
              onBoundary?.(draft);
              onPick(cla, clo);
              setDraft(null);
            }}
          >
            <Check size={15} />
            {es ? "Listo" : "Done"}
          </button>
          {boundary?.length ? (
            <button
              type="button"
              onClick={() => {
                onBoundary?.(undefined);
                setDraft(null);
              }}
              aria-label={es ? "Borrar contorno" : "Delete outline"}
            >
              <Trash2 size={15} />
            </button>
          ) : null}
        </div>
      )}

      {/* coordenadas, discretas, como la escala de Google Maps */}
      <div className="gm-coords">
        {lat.toFixed(4)}, {lon.toFixed(4)}
      </div>

      {children}
    </div>
  );
}

type Place = { name: string; sub: string; lat: number; lon: number };

/**
 * Búsqueda: zonas locales al escribir; cualquier lugar con OpenStreetMap (Nominatim) solo al confirmar
 * (Enter o el botón), como pide su política de uso: nada de autocompletar contra su servidor.
 */
function SearchBox({ es, onPick }: { es: boolean; onPick: (lat: number, lon: number) => void }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [remote, setRemote] = useState<Place[] | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const ref = useRef<HTMLInputElement>(null);
  const abort = useRef<AbortController | null>(null);
  const coords = q.match(/^\s*(-?\d{1,2}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/);
  const term = q.trim();
  const hits = coords ? [] : ZONES.filter((z) => !term || norm(z.name).includes(norm(term)));
  const canSearch = !coords && term.length >= 3;

  const go = (lat: number, lon: number) => {
    onPick(lat, lon);
    setOpen(false);
    ref.current?.blur();
  };

  const searchOsm = async () => {
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    setStatus("loading");
    setOpen(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&accept-language=${es ? "es" : "en"}&q=${encodeURIComponent(term)}`;
      const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(String(res.status));
      const rows = (await res.json()) as { display_name: string; lat: string; lon: string }[];
      setRemote(
        rows.map((r) => {
          const [name, ...rest] = r.display_name.split(", ");
          return { name, sub: rest.slice(0, 3).join(", "), lat: Number(r.lat), lon: Number(r.lon) };
        }),
      );
      setStatus("idle");
    } catch (e) {
      if ((e as Error).name !== "AbortError") setStatus("error");
    }
  };

  const showList = open && (coords || hits.length > 0 || canSearch || remote !== null || status !== "idle");

  return (
    <div className={`gm-search ${showList ? "open" : ""}`}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (coords) go(Number(coords[1]), Number(coords[2]));
          else if (hits.length === 1 && term) {
            setQ(hits[0].name);
            go(hits[0].lat, hits[0].lon);
          } else if (canSearch) void searchOsm();
        }}
      >
        <Search size={17} />
        <input
          ref={ref}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setRemote(null);
            setStatus("idle");
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={es ? "Busca un lugar o pega coordenadas" : "Search a place or paste coordinates"}
          aria-label={es ? "Buscar lugar" : "Search place"}
          enterKeyHint="search"
        />
        {q && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              setRemote(null);
              setStatus("idle");
            }}
            aria-label={es ? "Borrar" : "Clear"}
          >
            <X size={15} />
          </button>
        )}
      </form>
      {showList && (
        <ul className="gm-search-list">
          {coords && (
            <li>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => go(Number(coords[1]), Number(coords[2]))}>
                <LocateFixed size={15} />
                {es ? "Ir a" : "Go to"} {coords[1]}, {coords[2]}
              </button>
            </li>
          )}
          {remote === null &&
            hits.map((z) => (
              <li key={z.name}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setQ(z.name);
                    go(z.lat, z.lon);
                  }}
                >
                  <Navigation size={14} />
                  <span>
                    {z.name}
                    <small>{es ? "Zona agrícola · Arequipa" : "Farming area · Arequipa"}</small>
                  </span>
                </button>
              </li>
            ))}
          {remote?.map((p, i) => (
            <li key={`${p.lat}-${p.lon}-${i}`}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setQ(p.name);
                  go(p.lat, p.lon);
                }}
              >
                <MapPin size={14} />
                <span>
                  {p.name}
                  <small>{p.sub}</small>
                </span>
              </button>
            </li>
          ))}
          {remote?.length === 0 && <li className="gm-search-note">{es ? "Sin resultados. Prueba con otro nombre." : "No results. Try another name."}</li>}
          {status === "loading" && <li className="gm-search-note">{es ? "Buscando…" : "Searching…"}</li>}
          {status === "error" && <li className="gm-search-note">{es ? "No se pudo buscar. Revisa tu conexión." : "Search failed. Check your connection."}</li>}
          {canSearch && remote === null && status === "idle" && (
            <li>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => void searchOsm()} className="gm-search-osm">
                <Globe size={14} />
                <span>
                  {es ? `Buscar «${term}» en todo el mapa` : `Search “${term}” everywhere`}
                  <small>OpenStreetMap</small>
                </span>
              </button>
            </li>
          )}
          {remote !== null && <li className="gm-search-note">© OpenStreetMap</li>}
        </ul>
      )}
    </div>
  );
}
