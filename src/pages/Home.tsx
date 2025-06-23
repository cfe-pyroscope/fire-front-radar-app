import React, { useState } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import { CRS } from "leaflet";
import 'leaflet/dist/leaflet.css';
import '../css/Home.css';
import IndexToggle from '../components/IndexToggle';
import HeatmapController from '../components/HeatmapController';  // ✅ NEW

const Home: React.FC = () => {
    const [indexName, setIndexName] = useState<'pof' | 'fopi'>('pof');

    return (
        <div className="map-container">
            <IndexToggle currentIndex={indexName} onToggle={setIndexName} />

            <MapContainer
                center={[28, 2]}
                zoom={2.5}
                minZoom={2.5}
                scrollWheelZoom={true}
                crs={CRS.EPSG3857}
                maxBounds={[[-85, -180], [85, 180]]}
                maxBoundsViscosity={1.0}
                worldCopyJump={false}
                style={{ height: '100%', width: '100%', zIndex: 0 }}
            >
                <TileLayer
                    attribution='&copy; OpenStreetMap contributors &copy; CARTO'
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    noWrap={true}
                />
                <HeatmapController indexName={indexName} />
            </MapContainer>
        </div>
    );
};

export default Home;
