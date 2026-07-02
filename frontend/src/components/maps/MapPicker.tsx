'use client';

import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface Coordinates {
  lat: number;
  lng: number;
}

interface MapPickerProps {
  center: Coordinates;
  marker: Coordinates | null;
  storeMarker?: Coordinates;
  onLocationSelect?: (coords: Coordinates) => void;
  draggable?: boolean;
  readOnly?: boolean;
  showStore?: boolean;
  heightClass?: string;
  storeLabel?: string;
  customerLabel?: string;
}

const customerIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const storeIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function MapRecenter({ center }: { center: Coordinates }) {
  const map = useMap();

  useEffect(() => {
    map.flyTo([center.lat, center.lng], Math.max(map.getZoom(), 15), { duration: 0.6 });
  }, [center.lat, center.lng, map]);

  return null;
}

function MapClickHandler({
  onLocationSelect,
  enabled,
}: {
  onLocationSelect: (coords: Coordinates) => void;
  enabled: boolean;
}) {
  useMapEvents({
    click(e) {
      if (enabled) {
        onLocationSelect({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });
  return null;
}

function DraggableCustomerMarker({
  position,
  onDragEnd,
  label,
}: {
  position: Coordinates;
  onDragEnd: (coords: Coordinates) => void;
  label: string;
}) {
  const eventHandlers = useMemo(
    () => ({
      dragend(e: L.DragEndEvent) {
        const m = e.target as L.Marker;
        const pos = m.getLatLng();
        onDragEnd({ lat: pos.lat, lng: pos.lng });
      },
    }),
    [onDragEnd]
  );

  return (
    <Marker
      draggable
      eventHandlers={eventHandlers}
      position={[position.lat, position.lng]}
      icon={customerIcon}
    >
      <Popup>{label}</Popup>
    </Marker>
  );
}

function DraggableStoreMarker({
  position,
  onDragEnd,
  label,
}: {
  position: Coordinates;
  onDragEnd: (coords: Coordinates) => void;
  label: string;
}) {
  const eventHandlers = useMemo(
    () => ({
      dragend(e: L.DragEndEvent) {
        const m = e.target as L.Marker;
        const pos = m.getLatLng();
        onDragEnd({ lat: pos.lat, lng: pos.lng });
      },
    }),
    [onDragEnd]
  );

  return (
    <Marker
      draggable
      eventHandlers={eventHandlers}
      position={[position.lat, position.lng]}
      icon={storeIcon}
    >
      <Popup>{label}</Popup>
    </Marker>
  );
}

export default function MapPicker({
  center,
  marker,
  storeMarker,
  onLocationSelect,
  draggable = false,
  readOnly = true,
  showStore = true,
  heightClass = 'h-72',
  storeLabel = 'Lokasi Laundry',
  customerLabel = 'Lokasi Anda',
}: MapPickerProps) {
  useEffect(() => {
    delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
  }, []);

  const mapCenter = marker || storeMarker || center;
  const interactive = !readOnly && Boolean(onLocationSelect);

  return (
    <MapContainer
      center={[mapCenter.lat, mapCenter.lng]}
      zoom={15}
      className={`${heightClass} w-full rounded-xl z-0`}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapRecenter center={mapCenter} />

      {interactive && onLocationSelect && (
        <MapClickHandler
          onLocationSelect={onLocationSelect}
          enabled={!draggable || !marker}
        />
      )}

      {showStore && storeMarker && (
        interactive && draggable && onLocationSelect ? (
          <DraggableStoreMarker
            position={storeMarker}
            onDragEnd={onLocationSelect}
            label={storeLabel}
          />
        ) : (
          <Marker position={[storeMarker.lat, storeMarker.lng]} icon={storeIcon}>
            <Popup>{storeLabel}</Popup>
          </Marker>
        )
      )}

      {marker && (
        interactive && draggable && onLocationSelect ? (
          <DraggableCustomerMarker
            position={marker}
            onDragEnd={onLocationSelect}
            label={customerLabel}
          />
        ) : (
          <Marker position={[marker.lat, marker.lng]} icon={customerIcon}>
            <Popup>{customerLabel}</Popup>
          </Marker>
        )
      )}
    </MapContainer>
  );
}
