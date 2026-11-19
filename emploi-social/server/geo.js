// Géographie : géocodage suisse (service public geo.admin.ch, sans clé) et distances.

const SEARCH = "https://api3.geo.admin.ch/rest/services/api/SearchServer";

/** Coordonnées d'un NPA ou d'une localité suisse, ou null. */
export async function geocoder(npa, ville) {
  if (process.env.OFFRES_DEMO === "1") return DEMO_COORDS[String(npa).trim()] ?? null;
  const essais = [
    npa && /^\d{4}$/.test(String(npa).trim()) ? { q: String(npa).trim(), origins: "zipcode" } : null,
    ville ? { q: ville, origins: "gg25" } : null,
  ].filter(Boolean);
  for (const { q, origins } of essais) {
    try {
      const u = `${SEARCH}?searchText=${encodeURIComponent(q)}&type=locations&origins=${origins}&limit=1&sr=4326`;
      const res = await fetch(u, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const r = (await res.json()).results?.[0]?.attrs;
      if (r?.lat && r?.lon) {
        const libelle = r.label.replace(/<\/?b>/g, "");
        const canton = libelle.match(/\(([A-Z]{2})\)/)?.[1] ?? (await cantonDe(libelle.replace(/^\d{4} - /, "")));
        return { lat: r.lat, lon: r.lon, libelle, canton };
      }
    } catch {
      // Hors ligne : on garde le classement par canton.
    }
  }
  return null;
}

/** Canton d'une commune (le résultat par NPA ne le donne pas). */
async function cantonDe(commune) {
  try {
    const u = `${SEARCH}?searchText=${encodeURIComponent(commune)}&type=locations&origins=gg25&limit=1&sr=4326`;
    const res = await fetch(u, { signal: AbortSignal.timeout(8000) });
    const label = (await res.json()).results?.[0]?.attrs?.label ?? "";
    return label.match(/\(([A-Z]{2})\)/)?.[1] ?? "";
  } catch {
    return "";
  }
}

/** Distance à vol d'oiseau en km (formule de haversine). */
export function distanceKm(a, b) {
  if (!a?.lat || !a?.lon || !b?.lat || !b?.lon) return null;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * 6371 * Math.asin(Math.sqrt(h)));
}

// Coordonnées approximatives pour le mode démonstration (hors ligne).
export const DEMO_COORDS = {
  "1004": { lat: 46.5319, lon: 6.6162, libelle: "1004 - Lausanne", canton: "VD" },
  "1950": { lat: 46.2331, lon: 7.3606, libelle: "1950 - Sion" },
  "1227": { lat: 46.1816, lon: 6.1393, libelle: "1227 - Carouge GE" },
  "1700": { lat: 46.8065, lon: 7.1620, libelle: "1700 - Fribourg" },
  "2000": { lat: 46.9900, lon: 6.9293, libelle: "2000 - Neuchâtel" },
  "1400": { lat: 46.7785, lon: 6.6410, libelle: "1400 - Yverdon-les-Bains" },
  "1201": { lat: 46.2100, lon: 6.1426, libelle: "1201 - Genève" },
  "2800": { lat: 47.3653, lon: 7.3445, libelle: "2800 - Delémont" },
};
