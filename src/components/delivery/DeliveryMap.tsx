import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons (Leaflet + bundlers issue)
const pickupIcon = new L.DivIcon({
  className: "",
  html: `<div style="background:oklch(0.62 0.16 150);width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);color:white;font-weight:bold;font-size:13px;">P</span></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});
const dropIcon = new L.DivIcon({
  className: "",
  html: `<div style="background:oklch(0.6 0.22 25);width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);color:white;font-weight:bold;font-size:13px;">D</span></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

export type LatLng = { lat: number; lng: number };

interface Props {
  pickup: LatLng | null;
  dropoff: LatLng | null;
  routeGeometry: [number, number][] | null;
  onPickupChange: (p: LatLng) => void;
  onDropoffChange: (p: LatLng) => void;
  mode: "pickup" | "dropoff";
}

function ClickHandler({ mode, onPickupChange, onDropoffChange }: Pick<Props, "mode" | "onPickupChange" | "onDropoffChange">) {
  useMapEvents({
    click(e) {
      if (mode === "pickup") onPickupChange({ lat: e.latlng.lat, lng: e.latlng.lng });
      else onDropoffChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function FitBounds({ pickup, dropoff }: { pickup: LatLng | null; dropoff: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (pickup && dropoff) {
      map.fitBounds([[pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]], { padding: [60, 60] });
    } else if (pickup) {
      map.setView([pickup.lat, pickup.lng], 14);
    } else if (dropoff) {
      map.setView([dropoff.lat, dropoff.lng], 14);
    }
  }, [pickup, dropoff, map]);
  return null;
}

export default function DeliveryMap({ pickup, dropoff, routeGeometry, onPickupChange, onDropoffChange, mode }: Props) {
  const center = useMemo<[number, number]>(() => [3.139, 101.6869], []); // KL

  return (
    <div className="relative h-[420px] w-full overflow-hidden rounded-lg border">
      <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler mode={mode} onPickupChange={onPickupChange} onDropoffChange={onDropoffChange} />
        <FitBounds pickup={pickup} dropoff={dropoff} />
        {pickup && (
          <Marker
            position={[pickup.lat, pickup.lng]}
            icon={pickupIcon}
            draggable
            eventHandlers={{ dragend: (e) => { const ll = (e.target as L.Marker).getLatLng(); onPickupChange({ lat: ll.lat, lng: ll.lng }); } }}
          />
        )}
        {dropoff && (
          <Marker
            position={[dropoff.lat, dropoff.lng]}
            icon={dropIcon}
            draggable
            eventHandlers={{ dragend: (e) => { const ll = (e.target as L.Marker).getLatLng(); onDropoffChange({ lat: ll.lat, lng: ll.lng }); } }}
          />
        )}
        {routeGeometry && routeGeometry.length > 1 && (
          <Polyline positions={routeGeometry} pathOptions={{ color: "oklch(0.62 0.16 150)", weight: 5, opacity: 0.8 }} />
        )}
      </MapContainer>
      <div className="pointer-events-none absolute left-3 top-3 z-[400] rounded-md bg-background/90 px-3 py-1.5 text-xs font-medium shadow-md backdrop-blur">
        Click map to set <span className="font-bold text-primary">{mode === "pickup" ? "Pickup (P)" : "Drop-off (D)"}</span>
      </div>
    </div>
  );
}
