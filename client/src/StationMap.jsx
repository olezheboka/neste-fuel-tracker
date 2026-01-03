import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default Leaflet icon not appearing correctly in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const LOCATIONS = [
    { name: 'Kuldīgas 1', lat: 56.9463, lng: 24.0722 },
    { name: 'Upesgrīvas 1', lat: 56.9248, lng: 24.0531 },
    { name: 'Ulmaņa gatve 84', lat: 56.9304, lng: 24.0358 },
    { name: 'Lielirbes 30', lat: 56.9333, lng: 24.0436 },
    { name: 'Brīvības 253', lat: 56.9745, lng: 24.1627 },
    { name: 'A.Deglava 51a', lat: 56.9482, lng: 24.1834 }
];

// Helper to invalidate map size on load to ensure full rendering
function MapUpdater() {
    const map = useMap();
    useEffect(() => {
        // Wait a tick for container to have dimensions
        setTimeout(() => {
            map.invalidateSize();
        }, 100);
    }, [map]);
    return null;
}

export default function StationMap() {
    return (
        <MapContainer
            center={[56.9496, 24.1052]}
            zoom={11}
            scrollWheelZoom={false}
            style={{ height: '100%', width: '100%', zIndex: 0 }}
        >
            <MapUpdater />
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {LOCATIONS.map((loc, idx) => (
                <Marker key={idx} position={[loc.lat, loc.lng]}>
                    <Popup>
                        <div className="text-center font-semibold text-slate-800">
                            Neste {loc.name}
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}
