import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";

export type Point = { id: string; lat: number; lon: number; titre: string; sousTitre?: string; ton?: "haut" | "moyen" | "bas" | "neutre" };

const COULEURS = { haut: "#1d7a46", moyen: "#c08a00", bas: "#7a8584", neutre: "#2457a6" };

/** Carte OpenStreetMap : domicile, rayon de recherche et points cliquables. */
export function Carte({
  points,
  domicile,
  rayonKm,
  onSelect,
}: {
  points: Point[];
  domicile?: { lat: number; lon: number } | null;
  rayonKm?: number;
  onSelect?: (id: string) => void;
}) {
  const conteneur = useRef<HTMLDivElement>(null);
  const carte = useRef<L.Map | null>(null);
  const calque = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    const m = L.map(conteneur.current!, { scrollWheelZoom: false }).setView([46.8, 8.2], 7);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(m);
    calque.current = L.layerGroup().addTo(m);
    carte.current = m;
    return () => {
      m.remove();
      carte.current = null;
    };
  }, []);

  useEffect(() => {
    const m = carte.current;
    const g = calque.current;
    if (!m || !g) return;
    g.clearLayers();
    const limites: L.LatLngExpression[] = [];
    if (domicile) {
      if (rayonKm) L.circle([domicile.lat, domicile.lon], { radius: rayonKm * 1000, color: "#0f6e6a", weight: 1.5, fillOpacity: 0.06 }).addTo(g);
      L.circleMarker([domicile.lat, domicile.lon], { radius: 8, color: "#fff", weight: 3, fillColor: "#0f6e6a", fillOpacity: 1 })
        .bindTooltip("Chez vous")
        .addTo(g);
      limites.push([domicile.lat, domicile.lon]);
    }
    // Plusieurs annonces au même endroit : léger décalage pour qu'elles restent cliquables.
    const vus = new Map<string, number>();
    for (const p of points) {
      const cle = `${p.lat.toFixed(3)},${p.lon.toFixed(3)}`;
      const n = vus.get(cle) ?? 0;
      vus.set(cle, n + 1);
      const angle = n * 2.4;
      const lat = p.lat + (n ? Math.sin(angle) * 0.004 * Math.sqrt(n) : 0);
      const lon = p.lon + (n ? Math.cos(angle) * 0.006 * Math.sqrt(n) : 0);
      const mk = L.circleMarker([lat, lon], { radius: 7, color: "#fff", weight: 2, fillColor: COULEURS[p.ton ?? "neutre"], fillOpacity: 0.95 })
        .bindTooltip(`<strong>${echapper(p.titre)}</strong>${p.sousTitre ? `<br>${echapper(p.sousTitre)}` : ""}`)
        .addTo(g);
      if (onSelect) mk.on("click", () => onSelect(p.id));
      limites.push([lat, lon]);
    }
    if (limites.length > 1) m.fitBounds(L.latLngBounds(limites), { padding: [30, 30], maxZoom: 12 });
    else if (limites.length === 1) m.setView(limites[0], 11);
  }, [points, domicile, rayonKm, onSelect]);

  return <div ref={conteneur} className="carte-osm" role="region" aria-label="Carte des résultats" />;
}

const echapper = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
