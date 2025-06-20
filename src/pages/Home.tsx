import React, { useState } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import { CRS } from "leaflet";
import 'leaflet/dist/leaflet.css';
import '../css/Home.css';
import HeatmapOverlay from '../components/HeatmapOverlay';
import IndexToggle from '../components/IndexToggle';


const Home: React.FC = () => {
    const [indexName, setIndexName] = useState<'pof' | 'fopi'>('pof');
    const base = "2024-12-01T00:00:00Z";
    const lead = 0;

    return (
        <div className="map-container">
            <IndexToggle currentIndex={indexName} onToggle={setIndexName} />

            <MapContainer
                center={[28, 2]}
                zoom={2.5}
                minZoom={2.5}
                scrollWheelZoom={true}
                crs={CRS.EPSG3857}           // default, ma lo esplicito
                maxBounds={[[-85, -180], [85, 180]]}
                maxBoundsViscosity={1.0}     // 0 – 1   (1 ⇒ pan hard-clamp)
                worldCopyJump={false}
                style={{ height: '100%', width: '100%', zIndex: 0 }}
            >
                <TileLayer
                    attribution='&copy; OpenStreetMap contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    noWrap={true}                // 🔑 NON replicare i tile oltre ±180°
                />

                <HeatmapOverlay
                    key={indexName}
                    indexName={indexName}
                    base={base}
                    lead={lead}
                />
            </MapContainer>
        </div>
    );
};

export default Home;
