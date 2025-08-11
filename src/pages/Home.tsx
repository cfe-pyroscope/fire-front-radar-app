import React, { useCallback, useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import { CRS, LatLngBounds } from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw";
import "leaflet-draw/dist/leaflet.draw.css";

import "../css/Home.css";
import { API_BASE_URL, INITIAL_MAP_BOUNDS, INITIAL_MAP_CENTER, INITIAL_MAP_ZOOM } from "../utils/config";
import logo1 from "../assets/FFR-logo.svg";
import logo2 from "../assets/ECMWF-logo-white.png";

import LogoContainer from "../components/LogoContainer";
import IndexToggle from "../components/IndexToggle";
import ByModeToggle from "../components/ByModeToggle";
import DatePicker from "../components/DatePicker";
import ForecastSelect from "../components/ForecastSelect";
import ForecastSlider from "../components/ForecastSlider";
import ColorBarLegend from "../components/ColorBarLegend";
import Loader from "../components/Loader";

import LocationSearch from "../components/LocationSearch";
import ResetViewControl from "../components/ResetViewControl";
import DrawControl from "../components/DrawControl";
import DownloadButton from "../components/DownloadButton";
import MapLabels from "../components/MapLabels";
import HeatmapController from "../components/HeatmapController";

/** Types */
interface ForecastStep {
    forecast_time: string; // ISO
    base_time: string;     // ISO
}

/** Utilities */
const toMidnightUTC = (d: Date) =>
    new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0));

/** Return full ISO with trailing Z, e.g. 2025-07-20T00:00:00Z */
const toIsoZ = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(
        d.getUTCHours()
    )}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}Z`;
};

function useAvailableDates(indexName: "pof" | "fopi") {
    const [availableDates, setAvailableDates] = useState<Date[] | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const url = `${API_BASE_URL}/api/${indexName}/available_dates`;
                console.log("🌟🌟🌟 [useAvailableDates] GET", url);
                const res = await fetch(url);
                if (!res.ok) throw new Error("Failed to fetch available dates");
                const data = await res.json();
                const parsed = data.available_dates.map((d: string) => {
                    const dt = new Date(d);
                    return new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate(), 12));
                });
                if (!cancelled) setAvailableDates(parsed);
                console.log("🌟🌟🌟 [useAvailableDates] OK", { indexName, count: parsed.length, first: parsed[0], last: parsed[parsed.length - 1] });
            } catch (err) {
                console.error("🌟🌟🌟 Failed to fetch available dates:", err);
                if (!cancelled) setAvailableDates(null);
            }
        })();
        return () => { cancelled = true; };
    }, [indexName]);

    return availableDates;
}

function useLatestDate(indexName: "pof" | "fopi") {
    const [latest, setLatest] = useState<Date | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const url = `${API_BASE_URL}/api/${indexName}/latest_date`;
                console.log("🌟🌟🌟 [useLatestDate] GET", url);
                const res = await fetch(url);
                if (!res.ok) throw new Error("Failed to fetch latest date");
                const data = await res.json();
                const parsed = new Date(data.latest_date);
                if (!isNaN(parsed.getTime())) {
                    const utcNoon = new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12));
                    if (!cancelled) setLatest(utcNoon);
                    console.log("🌟🌟🌟 [useLatestDate] OK", { indexName, utcNoon: utcNoon.toISOString() });
                }
            } catch (err) {
                console.error("🌟🌟🌟 Failed to fetch latest date:", err);
                if (!cancelled) setLatest(null);
            }
        })();
        return () => { cancelled = true; };
    }, [indexName]);

    return latest;
}

function useMetadata(indexName: "pof" | "fopi", mode: "by_date" | "by_forecast", selectedDate: Date | null) {
    const [state, setState] = useState<{
        steps: ForecastStep[];
        baseTime: string | null;
        selectedForecastTime: string | null;
        error: string | null;
        loading: boolean;
    }>({ steps: [], baseTime: null, selectedForecastTime: null, error: null, loading: false });

    useEffect(() => {
        if (!selectedDate) return;

        let cancelled = false;
        const run = async () => {
            setState((s) => ({ ...s, loading: true, error: null }));
            try {
                const baseMidnight = toMidnightUTC(selectedDate);
                const baseIsoZ = toIsoZ(baseMidnight);

                const url =
                    mode === "by_forecast"
                        ? `${API_BASE_URL}/api/${indexName}/by_forecast?forecast_init=${encodeURIComponent(baseIsoZ)}`
                        : `${API_BASE_URL}/api/${indexName}/by_date?base_time=${encodeURIComponent(baseIsoZ)}`;

                console.log("🌟🌟🌟 [useMetadata] GET", { url, indexName, mode, baseIsoZ, selectedDateISO: selectedDate.toISOString() });

                const res = await fetch(url);
                const rawText = await res.text();
                if (!res.ok) throw new Error(`Metadata API error ${res.status}: ${rawText}`);
                const data = JSON.parse(rawText);

                console.log("🌟🌟🌟 [useMetadata] response", {
                    base_time: data.base_time,
                    stepsLength: Array.isArray(data.forecast_steps) ? data.forecast_steps.length : null,
                    sample: Array.isArray(data.forecast_steps) ? data.forecast_steps.slice(0, 12) : null,
                });

                if (!data.forecast_steps || !Array.isArray(data.forecast_steps) || data.forecast_steps.length === 0) {
                    throw new Error("No forecast steps available for this date.");
                }

                const isStringArray = typeof data.forecast_steps[0] === "string";
                let normalizedSteps: ForecastStep[] = [];
                let baseTime: string | null = null;
                let initialForecastTime: string | null = null;

                if (isStringArray) {
                    const availableForecastTimes: string[] = data.forecast_steps as string[];
                    normalizedSteps = availableForecastTimes.map((ft: string) => ({ base_time: data.base_time, forecast_time: ft }));
                    baseTime = data.base_time ?? baseIsoZ;
                    initialForecastTime = availableForecastTimes[0] ?? null;
                } else {
                    normalizedSteps = (data.forecast_steps as any[]).map((s) => ({
                        base_time: s.base_time,
                        forecast_time: s.forecast_time,
                    }));
                    baseTime = normalizedSteps[0]?.base_time ?? baseIsoNaive;
                    initialForecastTime = normalizedSteps[0]?.forecast_time ?? null;
                }

                console.log("🌟🌟🌟 [useMetadata] normalized", {
                    baseTime,
                    count: normalizedSteps.length,
                    first: normalizedSteps[0],
                    last: normalizedSteps[normalizedSteps.length - 1],
                    initialForecastTime,
                });

                if (!cancelled) setState({
                    steps: normalizedSteps,
                    baseTime,
                    selectedForecastTime: initialForecastTime,
                    error: null,
                    loading: false
                });
            } catch (err: any) {
                console.error("🌟🌟🌟 [useMetadata] error", err?.message || err);
                if (!cancelled) setState((s) => ({ ...s, loading: false, error: err?.message || "Failed to load data for this date" }));
            }
        };

        run();
        return () => { cancelled = true; };
    }, [indexName, mode, selectedDate]);

    return state;
}

/** Main Page */
const Home: React.FC = () => {
    const [indexName, setIndexName] = useState<"pof" | "fopi">("pof");
    const [mode, setMode] = useState<"by_date" | "by_forecast">("by_date");

    const availableDates = useAvailableDates(indexName);
    const latest = useLatestDate(indexName);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    useEffect(() => { if (latest) setSelectedDate(latest); }, [latest]);

    const { steps: forecastSteps, baseTime, selectedForecastTime, error: metaError, loading: metaLoading } =
        useMetadata(indexName, mode, selectedDate);

    // Parent-controlled selected forecast time
    const [selectedForecastTimeLocal, setSelectedForecastTimeLocal] = useState<string | null>(null);
    useEffect(() => {
        if (forecastSteps.length > 0) {
            setSelectedForecastTimeLocal(forecastSteps[0].forecast_time);
        } else {
            setSelectedForecastTimeLocal(null);
        }
    }, [baseTime, forecastSteps]);

    // Debug key state changes
    useEffect(() => {
        console.log("🌟🌟🌟 [Home] state", {
            indexName, mode,
            selectedDate: selectedDate?.toISOString(),
            baseTime,
            stepsCount: forecastSteps.length,
            selectedForecastTimeFromHook: selectedForecastTime,
            selectedForecastTimeLocal,
            showControls: !metaLoading && !metaError && forecastSteps.length > 0 && !!selectedForecastTimeLocal && !!baseTime
        });
    }, [indexName, mode, selectedDate, baseTime, forecastSteps, selectedForecastTime, selectedForecastTimeLocal, metaLoading, metaError]);

    const [drawnBounds, setDrawnBounds] = useState<LatLngBounds | null>(null);
    const [isHeatmapLoading, setIsHeatmapLoading] = useState(false);
    const [scale, setScale] = useState<{ vmin: number; vmax: number } | null>(null);

    const showControls = useMemo(
        () => !metaLoading && !metaError && forecastSteps.length > 0 && !!selectedForecastTimeLocal && !!baseTime,
        [metaLoading, metaError, forecastSteps.length, selectedForecastTimeLocal, baseTime]
    );

    const handleDateChange = useCallback((date: Date | null) => {
        if (date instanceof Date && !isNaN(date.getTime())) setSelectedDate(date);
    }, []);

    if (!selectedDate) return <div>Loading map and data for latest date...</div>;

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
                    onChange={handleDateChange}
                    availableDates={availableDates}
                    label={mode === "by_forecast" ? "Pick forecast" : "Pick date"}
                />


                {/* Loaders/errors */}
                {isHeatmapLoading && <Loader message="Loading data..." />}
                {metaLoading && <Loader message="Loading metadata..." />}
                {metaError && <div className="forecast-error">⚠️ {metaError}</div>}


                {showControls && (
                    <div className="forecast-controls">
                        {mode === "by_date" ? (
                            <ForecastSelect
                                key={baseTime /* force reset when backend base changes */}
                                forecastSteps={forecastSteps}
                                selectedForecastTime={selectedForecastTimeLocal!}
                                onChange={(t) => setSelectedForecastTimeLocal(t)}
                            />
                        ) : (
                            <ForecastSlider
                                forecastSteps={forecastSteps}
                                selectedBaseTime={baseTime!}
                                selectedForecastTime={(selectedForecastTimeLocal ?? selectedForecastTime)!}
                                onChange={() => { }}
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
                            selectedForecastTime={selectedForecastTimeLocal!}
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
