import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const DEFAULT_CENTER = [12.9716, 77.5946];

const toPoint = (item) => {
  const latitude = Number(item?.lat ?? item?.latitude);
  const longitude = Number(item?.lng ?? item?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { position: [latitude, longitude], address: item.address || 'Complaint location' };
};

function FitLocations({ points }) {
  const map = useMap();

  useEffect(() => {
    if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points.map((point) => point.position)), { padding: [24, 24] });
    }
  }, [map, points]);

  return null;
}

export default function ComplaintLocationMap({ lat, lng, address = 'Complaint location', locations = [] }) {
  const points = useMemo(() => {
    const multiplePoints = locations.map(toPoint).filter(Boolean);
    if (multiplePoints.length) return multiplePoints;
    const singlePoint = toPoint({ lat, lng, address });
    return singlePoint ? [singlePoint] : [{ position: DEFAULT_CENTER, address }];
  }, [address, lat, lng, locations]);

  const center = useMemo(() => {
    if (points.length === 1) return points[0].position;
    return points.reduce((total, point) => [total[0] + point.position[0], total[1] + point.position[1]], [0, 0]).map((value) => value / points.length);
  }, [points]);

  /*
   * Keep the first point as the initial center. FitLocations then expands the
   * viewport when multiple uploaded photos have different coordinates.
   */
  const markerPoints = points;

  return (
    <MapContainer center={center} zoom={16} scrollWheelZoom className="h-64 w-full rounded-2xl">
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitLocations points={markerPoints} />
      {markerPoints.map((point, index) => (
        <Marker key={`${point.position.join('-')}-${index}`} position={point.position} icon={markerIcon}>
          <Popup>{point.address}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
