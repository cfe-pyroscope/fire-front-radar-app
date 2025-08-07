import { API_BASE_URL, INITIAL_MAP_BOUNDS, INITIAL_MAP_CENTER, INITIAL_MAP_ZOOM } from '../utils/config';
import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { CRS, LatLngBounds } from "leaflet";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';
import '../css/Home.css';
import ByModeToggle from '../components/ByModeToggle';
import ColorBarLegend from '../components/ColorBarLegend';
import DatePicker from '../components/DatePicker';
import DrawControl from '../components/DrawControl';
import DownloadButton from '../components/DownloadButton';
import ForecastSelect from '../components/ForecastSelect';
import ForecastSlider from '../components/ForecastSlider';
import HeatmapController from '../components/HeatmapController';
import IndexToggle from '../components/IndexToggle';
import Loader from '../components/Loader';
import LocationSearch from '../components/LocationSearch';
import LogoContainer from '../components/LogoContainer';
import MapLabels from '../components/MapLabels';
import ResetViewControl from '../components/ResetViewControl';
import logo1 from '../assets/FFR-logo.svg';
import logo2 from '../assets/ECMWF-logo-white.png';

interface ForecastStep {
    time: string;
    lead_hours: number;
}

const Home: React.FC = () => {
    const [indexName, setIndexName] = useState<'pof' | 'fopi'>('pof');
    const [availableDates, setAvailableDates] = useState<Date[] | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [drawnBounds, setDrawnBounds] = useState<LatLngBounds | null>(null);
    const [isHeatmapLoading, setIsHeatmapLoading] = useState(false);
    const [mode, setMode] = useState<"by_date" | "by_forecast">("by_date");
    const [forecastSteps, setForecastSteps] = useState<ForecastStep[]>([]);
    const [selectedLeadHours, setSelectedLeadHours] = useState<number | null>(null);
    const [baseTime, setBaseTime] = useState<string | null>(null);
    const [scale, setScale] = useState<{ vmin: number; vmax: number } | null>(null);
    const [metaError, setMetaError] = useState<string | null>(null);
    const [metaLoading, setMetaLoading] = useState<boolean>(false);

    console.log('Home component render - selectedDate:', selectedDate, 'isValid:', selectedDate instanceof Date && !isNaN(selectedDate.getTime()));

    useEffect(() => {
        if (!selectedDate) return;
        setMetaLoading(true);
        setMetaError(null);

        const fetchMetadata = async () => {
            try {
                const baseIso = selectedDate.toISOString();
                let url = "";
                if (mode === "by_forecast") {
                    url = `${API_BASE_URL}/api/${indexName}/forecast?forecast_init=${baseIso}`;
                } else {
                    url = `${API_BASE_URL}/api/metadata/${indexName}?base_time=${baseIso}&lead_hours=0`;
                }
                const res = await fetch(url);
                if (!res.ok) {
                    const msg = await res.text();
                    throw new Error(`Metadata API error ${res.status}: ${msg}`);
                }
                const data = await res.json();
                if (!data.forecast_steps || !Array.isArray(data.forecast_steps) || data.forecast_steps.length === 0) {
                    throw new Error("No forecast steps available for this date.");
                }
                setForecastSteps(data.forecast_steps);
                setSelectedLeadHours(data.forecast_steps[0].lead_hours);
                setBaseTime(baseIso);
                setMetaError(null);
            } catch (err: any) {
                setMetaError(err.message || "Failed to load data for this date");
            } finally {
                setMetaLoading(false);
            }
        };
        fetchMetadata();
    }, [indexName, selectedDate, mode]);


    useEffect(() => {
        const fetchAvailableDates = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/available_dates?index=${indexName}`);
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
                const res = await fetch(`${API_BASE_URL}/api/latest_date`);
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

    const showControls = !metaLoading && !metaError && forecastSteps.length > 0 && selectedLeadHours !== null && baseTime;


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
                <ByModeToggle mode={mode} onToggle={setMode} />
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
                    label={mode === "by_forecast" ? "Pick forecast" : "Pick date"}
                />

                {isHeatmapLoading && (
                    <Loader message="Loading data..." />
                )}

                {metaLoading && <Loader message="Loading metadata..." />}
                {metaError && <div className="forecast-error">⚠️ {metaError}</div>}

                {showControls && (
                    <div className="forecast-controls">
                        {mode === "by_date" ? (
                            <ForecastSelect
                                forecastSteps={forecastSteps}
                                selectedLeadHours={selectedLeadHours}
                                onChange={setSelectedLeadHours}
                            />
                        ) : (
                            <ForecastSlider
                                forecastSteps={forecastSteps}
                                selectedLeadHours={selectedLeadHours}
                                onChange={setSelectedLeadHours}
                            />
                        )}
                        {scale && (
                            <div className="colorbar-container">
                                <ColorBarLegend vmin={scale.vmin} vmax={scale.vmax} index={indexName} />
                            </div>
                        )}
                    </div>
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
                    <ResetViewControl />
                    <DrawControl onDrawComplete={setDrawnBounds} />
                    <DownloadButton />

                    <MapLabels />

                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                        url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
                        noWrap={true}
                    />

                    {showControls && (
                        <HeatmapController
                            indexName={indexName}
                            baseTime={baseTime!}
                            selectedLeadHours={selectedLeadHours!}
                            forecastSteps={forecastSteps}
                            mode={mode}
                            onHeatmapLoadingChange={setIsHeatmapLoading}
                            onScaleChange={setScale}
                        />
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