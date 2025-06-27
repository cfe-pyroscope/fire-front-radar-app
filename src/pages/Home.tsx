import { API_BASE_URL } from '../api/config';

import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { CRS, LatLngBounds } from "leaflet";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';
import '../css/Home.css';
import HeatmapController from '../components/HeatmapController';
import IndexToggle from '../components/IndexToggle';
import DatePickerComponent from '../components/DatePickerComponent';
import MapLabels from '../components/MapLabels';


const DrawControl: React.FC<{ onDrawComplete: (bounds: LatLngBounds) => void }> = ({ onDrawComplete }) => {
    const map = useMap();
    const drawnItemsRef = useRef<L.FeatureGroup>(new L.FeatureGroup());

    React.useEffect(() => {
        const drawnItems = drawnItemsRef.current;
        map.addLayer(drawnItems);

        const drawControl = new L.Control.Draw({
            position: 'topleft',
            draw: {
                rectangle: {
                    showArea: false, // ✅ disables faulty area calculation
                    shapeOptions: {
                        color: '#96C1FC',
                        weight: 2,
                        fillOpacity: 0.2
                    }
                },
                polygon: true,
                circle: false,
                polyline: false,
                marker: false,
                circlemarker: false
            },
            edit: {
                featureGroup: drawnItems,
                edit: false,
                remove: true
            }
        });

        map.addControl(drawControl);

        const onDrawCreated = (e: L.DrawEvents.Created) => {
            const layer = e.layer;

            if (e.layerType === 'rectangle' && layer instanceof L.Rectangle) {
                const bounds = layer.getBounds();

                console.log('🟩 Rectangle bounds:', bounds.toBBoxString());
                map.fitBounds(bounds, { padding: [20, 20] });
                onDrawComplete(bounds);
            } else if (e.layerType === 'polygon' && layer instanceof L.Polygon) {
                const bounds = layer.getBounds();
                console.log('🔷 Polygon bounds:', bounds.toBBoxString());
                map.fitBounds(bounds, { padding: [20, 20] });
                onDrawComplete(bounds);
            } else {
                console.warn('⚠️ Unknown layer type:', e.layerType);
            }
        };



        map.on(L.Draw.Event.CREATED, onDrawCreated);

        return () => {
            map.off(L.Draw.Event.CREATED, onDrawCreated);
            map.removeControl(drawControl);
            map.removeLayer(drawnItems);
        };
    }, [map]);

    return null;
};


const Home: React.FC = () => {
    const [indexName, setIndexName] = useState<'pof' | 'fopi'>('pof');
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [drawnBounds, setDrawnBounds] = useState<LatLngBounds | null>(null);

    console.log('Home component render - selectedDate:', selectedDate, 'isValid:', selectedDate instanceof Date && !isNaN(selectedDate.getTime()));


    useEffect(() => {
        const fetchLatestDate = async () => {
            try {
                console.log("🧪 Using API_BASE_URL:", API_BASE_URL);
                console.log('Fetching latest date...');
                const res = await fetch(`${API_BASE_URL}/api/latest-date`);
                console.log('Response status:', res.status);
                if (!res.ok) throw new Error('Failed to fetch latest date');
                const data = await res.json();
                console.log("Received:", data);

                const latest_date = data.latest_date;
                const parsed = new Date(latest_date);

                if (!isNaN(parsed.getTime())) {
                    // const utcDate = new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
                    const utcDate = new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12)); // shift to 12:00 UTC to avoid selecting midnight, which is earlier than the first forecast time in NetCDF files
                    setSelectedDate(utcDate);
                } else {
                    console.warn('❌ Invalid date from API:', latest_date);
                }

            } catch (err) {
                console.error('🔥 Failed to fetch latest date:', err);
            }
        };

        fetchLatestDate();
    }, []);


    if (!selectedDate) {
        return <div>Loading map and data for latest date...</div>;
    }

    return (
        <div className="map-container">
            <IndexToggle currentIndex={indexName} onToggle={setIndexName} />
            <DatePickerComponent
                value={selectedDate}
                onChange={(date) => {
                    const isValid = date instanceof Date && !isNaN(date.getTime());
                    console.log('DatePicker onChange - received:', date, 'isValid:', isValid);

                    if (isValid) {
                        setSelectedDate(date);
                        console.log('Successfully set new date:', date);
                    }
                }}
            />

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

                <DrawControl onDrawComplete={setDrawnBounds} />

                <MapLabels />

                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
                    noWrap={true}
                />

                <HeatmapController
                    key={`${indexName}-${selectedDate.toISOString()}`}
                    indexName={indexName}
                    selectedDate={selectedDate}
                    drawnBounds={drawnBounds}
                />

                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
                    noWrap={true}
                    pane="labels"
                />
            </MapContainer>
        </div>
    );
};

export default Home;