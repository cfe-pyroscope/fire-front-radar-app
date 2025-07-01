import { API_BASE_URL, INITIAL_MAP_BOUNDS, INITIAL_MAP_CENTER, INITIAL_MAP_ZOOM } from '../utils/config';
import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { CRS, LatLngBounds } from "leaflet";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';
import '../css/Home.css';
import DatePicker from '../components/DatePicker';
import DrawControl from '../components/DrawControl';
import DownloadButton from '../components/DownloadButton';
import LogoContainer from '../components/LogoContainer';
import HeatmapController from '../components/HeatmapController';
import IndexToggle from '../components/IndexToggle';
import Loader from '../components/Loader';
import LocationSearch from '../components/LocationSearch';
import MapLabels from '../components/MapLabels';
import ResetViewControl from '../components/ResetViewControl';
import logo1 from '../assets/FFR-logo.svg';
import logo2 from '../assets/ECMWF-logo-white.png';

const Home: React.FC = () => {
    const [indexName, setIndexName] = useState<'pof' | 'fopi'>('pof');
    const [availableDates, setAvailableDates] = useState<Date[] | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [drawnBounds, setDrawnBounds] = useState<LatLngBounds | null>(null);
    const [isHeatmapLoading, setIsHeatmapLoading] = useState(false);

    console.log('Home component render - selectedDate:', selectedDate, 'isValid:', selectedDate instanceof Date && !isNaN(selectedDate.getTime()));


    useEffect(() => {
        const fetchAvailableDates = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/available-dates?index=${indexName}`);
                if (!res.ok) throw new Error("Failed to fetch available dates");
                const data = await res.json();
                const parsedDates = data.available_dates.map((d: string) =>
                    new Date(Date.UTC(
                        new Date(d).getFullYear(),
                        new Date(d).getMonth(),
                        new Date(d).getDate(),
                        12
                    ))
                );
                setAvailableDates(parsedDates);
            } catch (err) {
                console.error("🔥 Failed to fetch available dates:", err);
            }
        };

        fetchAvailableDates();
    }, [indexName]);

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

    const isDateInAvailableDates = (date: Date, dates: Date[] | null) => {
        if (!dates) return false;
        return dates.some(d => d.toDateString() === date.toDateString());
    };

    return (
        <>
            <LogoContainer
                logo1Src={logo1}
                logo2Src={logo2}
                alt1="Fire Front Radar App Logo"
                alt2="ECMWF Logo"
                betweenText="Fire Front Radar"
            />

            <div className="map-container">
                <IndexToggle currentIndex={indexName} onToggle={setIndexName} />
                <DatePicker
                    value={selectedDate}
                    onChange={(date) => {
                        const isValid = date instanceof Date && !isNaN(date.getTime());
                        console.log('DatePicker onChange - received:', date, 'isValid:', isValid);

                        if (isValid) {
                            setSelectedDate(date);
                            console.log('Successfully set new date:', date);
                        }
                    }}
                    availableDates={availableDates}
                />

                {isHeatmapLoading && isDateInAvailableDates(selectedDate, availableDates) && (
                    <Loader message="Loading forecast..." />
                )}

                <MapContainer
                    center={INITIAL_MAP_CENTER}
                    zoom={INITIAL_MAP_ZOOM}
                    minZoom={2.5}
                    scrollWheelZoom={true}
                    crs={CRS.EPSG3857}
                    maxBounds={INITIAL_MAP_BOUNDS}
                    maxBoundsViscosity={1.0}
                    worldCopyJump={false}
                    style={{ height: '100%', width: '100%', zIndex: 0 }}
                >

                    <LocationSearch />
                    <DrawControl onDrawComplete={setDrawnBounds} />
                    <ResetViewControl />
                    <DownloadButton />

                    <MapLabels />

                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                        url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
                        noWrap={true}
                    />

                    {isDateInAvailableDates(selectedDate, availableDates) ? (
                        <HeatmapController
                            key={`${indexName}-${selectedDate.toISOString()}`}
                            indexName={indexName}
                            selectedDate={selectedDate}
                            drawnBounds={drawnBounds}
                            onHeatmapLoadingChange={setIsHeatmapLoading}
                        />
                    ) : (
                        <div className="forecast-error">
                            ⚠️ No data available for {selectedDate.toDateString()} in index "{indexName}". Please choose a different date.
                        </div>
                    )}

                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                        url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
                        noWrap={true}
                        pane="labels"
                    />
                </MapContainer>
            </div>
        </>
    );
};

export default Home;