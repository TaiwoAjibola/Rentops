"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type MapPin = {
  id: string;
  href: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  priceLabel: string;
  imageUrl?: string | null;
  rating?: number | null;
};

const MAP_STYLES = `
.rt-pin-label {
  display: inline-flex; align-items: center; white-space: nowrap; transform: translate(-50%, -50%);
  border-radius: 999px; background: #ffffff; border: 1px solid #d8d4cb; color: #10543f;
  font-size: 12px; font-weight: 600; padding: 5px 10px; box-shadow: 0 2px 8px rgba(16,24,20,.18);
}
.rt-pin-label:hover { background: #10543f; color: #ffffff; }
.rt-popup-card { display: flex; gap: 10px; min-width: 200px; }
.rt-popup-image { width: 64px; height: 58px; object-fit: cover; border-radius: 8px; flex-shrink: 0; }
.rt-popup-body { flex: 1; min-width: 0; }
.rt-popup-name { margin: 0 0 2px; font-size: 13px; font-weight: 600; color: #1a1a18; }
.rt-popup-location { margin: 0 0 6px; font-size: 11.5px; color: #6a665e; }
.rt-popup-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px; font-size: 12px; }
.rt-popup-price { font-weight: 700; color: #10543f; }
.rt-popup-rating { color: #a56d2c; font-weight: 600; }
.rt-popup-link { font-size: 12px; font-weight: 600; color: #146b53; text-decoration: underline; }
.leaflet-container { font-family: inherit; }
.leaflet-popup-content-wrapper { border-radius: 10px; }
`;

/**
 * Leaflet + OpenStreetMap canvas.
 *
 * No API key and no third-party service: tiles come straight from OSM. This
 * module lives apart from `map-view.tsx` / `property-map.tsx` because Leaflet
 * touches `window` on import, so it is only ever pulled in with `ssr: false`.
 */
export default function MapCanvas({
  pins,
  height = 560,
  zoom,
  single = false,
}: {
  pins: MapPin[];
  height?: number;
  zoom?: number;
  single?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    const node = container.current;
    if (!node || map.current) return;

    const instance = L.map(node, {
      center: pins[0] ? [pins[0].latitude, pins[0].longitude] : [6.5244, 3.3792], // Lagos
      zoom: zoom ?? (pins.length > 1 ? 12 : 14),
      scrollWheelZoom: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(instance);

    map.current = instance;
    layer.current = L.layerGroup().addTo(instance);

    return () => {
      instance.remove();
      map.current = null;
      layer.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const current = map.current;
    const group = layer.current;
    if (!current || !group) return;

    group.clearLayers();
    if (pins.length === 0) return;

    const markers: L.Marker[] = [];

    for (const pin of pins) {
      const marker = L.marker([pin.latitude, pin.longitude], {
        title: pin.name,
        icon: L.divIcon({
          className: "rt-pin",
          html: `<span class="rt-pin-label">${escapeHtml(pin.priceLabel)}</span>`,
          iconSize: [0, 0],
        }),
      });

      // Built from DOM nodes so listing text can never be injected into the map.
      marker.bindPopup(buildCard(pin), { closeButton: true, autoPan: false, minWidth: 220, maxWidth: 250 });

      if (!single) {
        marker.on("mouseover", () => marker.openPopup());
        marker.on("mouseout", () => marker.closePopup());
      }

      group.addLayer(marker);
      markers.push(marker);
    }

    if (pins.length > 1) {
      current.fitBounds(L.latLngBounds(pins.map((pin) => [pin.latitude, pin.longitude] as [number, number])), {
        padding: [48, 48],
        maxZoom: 14,
      });
    } else if (pins[0]) {
      current.setView([pins[0].latitude, pins[0].longitude], zoom ?? 15);
      if (single) markers[0]?.openPopup();
    }
  }, [pins, zoom, single]);

  return (
    <div>
      <style>{MAP_STYLES}</style>
      <div
        ref={container}
        style={{ height }}
        className="w-full overflow-hidden rounded-lg border border-line bg-ink-100"
        role="img"
        aria-label="Map of this location"
      />
      <p className="mt-2 text-[12px] text-ink-500">
        Approximate location{!single ? " — the exact address is shared once your booking is confirmed" : ""}. Map data © OpenStreetMap contributors.
      </p>
    </div>
  );
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

function buildCard(pin: MapPin): HTMLElement {
  const card = document.createElement("div");
  card.className = "rt-popup-card";

  if (pin.imageUrl) {
    const image = document.createElement("img");
    image.src = pin.imageUrl;
    image.alt = "";
    image.className = "rt-popup-image";
    card.appendChild(image);
  }

  const body = document.createElement("div");
  body.className = "rt-popup-body";

  const name = document.createElement("p");
  name.className = "rt-popup-name";
  name.textContent = pin.name;
  body.appendChild(name);

  const location = document.createElement("p");
  location.className = "rt-popup-location";
  location.textContent = pin.location;
  body.appendChild(location);

  const row = document.createElement("div");
  row.className = "rt-popup-row";

  const price = document.createElement("span");
  price.className = "rt-popup-price";
  price.textContent = pin.priceLabel;
  row.appendChild(price);

  if (pin.rating != null && pin.rating > 0) {
    const rating = document.createElement("span");
    rating.className = "rt-popup-rating";
    rating.textContent = `★ ${pin.rating.toFixed(1)}`;
    row.appendChild(rating);
  }

  body.appendChild(row);

  const link = document.createElement("a");
  link.href = pin.href;
  link.className = "rt-popup-link";
  link.textContent = "View property";
  body.appendChild(link);

  card.appendChild(body);
  return card;
}
