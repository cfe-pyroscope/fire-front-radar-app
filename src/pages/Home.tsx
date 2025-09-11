import React, { useCallback, useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import { CRS, LatLngBounds } from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw";
import "leaflet-draw/dist/leaflet.draw.css";

import "../css/Home.css";
import {
    INITIAL_MAP_BOUNDS,
    INITIAL_MAP_CENTER,
    INITIAL_MAP_ZOOM,
} from "../utils/config";
import logo1 from "../assets/FFR-logo.svg";
import logo2 from "../assets/ECMWF-logo-white.png";

import LogoContainer from "../components/LogoContainer";
import Loader from "../components/Loader";

import MapLabels from "../components/MapLabels";
import HeatmapController from "../components/HeatmapController";
import LeftControlsController from "../components/LeftControlsController";
import RightControlsController from "../components/RightControlsController";
import SideChartSwiper from "../components/SideChartSwiper";

import { useAvailableDates, useLatestDate, useForecastSteps } from "../hooks/useFireIndex";


const Home: React.FC = () => {
    const [indexName, setIndexName] = useState<"pof" | "fopi">("pof");
    const [mode, setMode] = useState<"by_date" | "by_forecast">("by_date");
    const [chartsOpen, setChartsOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth <= 768); // adjust breakpoint as needed
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);


    const availableDates = useAvailableDates(indexName);
    const latest = useLatestDate(indexName);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    useEffect(() => {
        if (latest) setSelectedDate(latest);
    }, [latest]);

    const {
        steps: forecastSteps,
        baseTime,
        selectedForecastTime,
        error: metaError,
        loading: metaLoading,
    } = useForecastSteps(indexName, mode, selectedDate);

    const [selectedForecastTimeLocal, setSelectedForecastTimeLocal] = useState<string | null>(null);
    useEffect(() => {
        if (forecastSteps.length > 0) {
            setSelectedForecastTimeLocal(forecastSteps[0].forecast_time);
        } else {
            setSelectedForecastTimeLocal(null);
        }
    }, [baseTime, forecastSteps]);

    useEffect(() => {
        console.log("[Home] state", {
            indexName,
            mode,
            selectedDate: selectedDate?.toISOString(),
            baseTime,
            stepsCount: forecastSteps.length,
            selectedForecastTimeFromHook: selectedForecastTime,
            selectedForecastTimeLocal,
            showControls:
                !metaLoading &&
                !metaError &&
                forecastSteps.length > 0 &&
                !!selectedForecastTimeLocal &&
                !!baseTime,
        });
    }, [
        indexName,
        mode,
        selectedDate,
        baseTime,
        forecastSteps,
        selectedForecastTime,
        selectedForecastTimeLocal,
        metaLoading,
        metaError,
    ]);

    const [drawnBounds, setDrawnBounds] = useState<LatLngBounds | null>(null);

    useEffect(() => {
        const onAreaClear = () => setDrawnBounds(null);
        window.addEventListener('area-clear', onAreaClear);
        return () => window.removeEventListener('area-clear', onAreaClear);
    }, []);


    const [isHeatmapLoading, setIsHeatmapLoading] = useState(false);
    const [scale, setScale] = useState<{ vmin: number; vmax: number } | null>(null);

    const drawnBbox3857 = useMemo(() => {
        if (!drawnBounds) return null;
        const sw = drawnBounds.getSouthWest(); // lat,lng
        const ne = drawnBounds.getNorthEast(); // lat,lng
        const pSW = CRS.EPSG3857.project(sw);  // {x,y} meters
        const pNE = CRS.EPSG3857.project(ne);  // {x,y} meters
        return `${pSW.x},${pSW.y},${pNE.x},${pNE.y}`;
    }, [drawnBounds]);

    const showControls = useMemo(
        () =>
            !metaLoading &&
            !metaError &&
            forecastSteps.length > 0 &&
            !!selectedForecastTimeLocal &&
            !!baseTime,
        [metaLoading, metaError, forecastSteps.length, selectedForecastTimeLocal, baseTime]
    );

    const handleDateChange = useCallback((date: Date | null) => {
        if (date instanceof Date && !isNaN(date.getTime())) setSelectedDate(date);
    }, []);

    if (!selectedDate) return <div>Loading map and data for latest date...</div>;

    return (
        <>
            {(!isMobile || (isMobile && !chartsOpen)) && (
                <LogoContainer
                    logo1Src={logo1}
                    logo2Src={logo2}
                    alt1="Fire Front Radar App Logo"
                    alt2="ECMWF Logo"
                    betweenText="Fire Front Radar"
                />
            )}

            <div className="map-container">
                {!chartsOpen && (
                    <RightControlsController
                        indexName={indexName}
                        onIndexToggle={setIndexName}
                        mode={mode}
                        onModeToggle={setMode}
                        selectedDate={selectedDate}
                        onDateChange={handleDateChange}
                        availableDates={availableDates}
                        dateLabel={mode === "by_forecast" ? "Pick forecast" : "Pick date"}
                        showControls={showControls}
                        forecastSteps={forecastSteps}
                        baseTime={baseTime}
                        selectedForecastTime={(selectedForecastTimeLocal ?? selectedForecastTime)!}
                        onForecastTimeChange={(t) => setSelectedForecastTimeLocal(t)}
                        scale={scale}
                    />
                )}

                {isHeatmapLoading && <Loader message="Loading data..." />}
                {metaLoading && <Loader message="Loading forecast steps..." />}
                {metaError && <div className="forecast-error">⚠️ {metaError}</div>}

                <MapContainer
                    center={INITIAL_MAP_CENTER}
                    zoom={INITIAL_MAP_ZOOM}
                    minZoom={2.5}
                    scrollWheelZoom
                    crs={CRS.EPSG3857}
                    maxBounds={INITIAL_MAP_BOUNDS}
                    maxBoundsViscosity={1.0}
                    worldCopyJump={false}
                    style={{ height: "100%", width: "100%", zIndex: 0 }}
                >
                    {!chartsOpen && (
                        <LeftControlsController
                            onDrawComplete={setDrawnBounds}
                            indexName={indexName}
                            mode={mode}
                            baseTime={baseTime ?? null}
                            forecastTime={(selectedForecastTimeLocal ?? selectedForecastTime) ?? null}
                            onOpenCharts={() => setChartsOpen(true)}
                            isAreaSelected={!!drawnBbox3857}
                        />
                    )}

                    <MapLabels />

                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                        url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
                        noWrap
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
                        noWrap
                        pane="labels"
                    />
                </MapContainer>
            </div>

            <SideChartSwiper
                opened={chartsOpen}
                onClose={() => setChartsOpen(false)}
                indexName={indexName}
                bbox={drawnBbox3857}
            />
        </>
    );
};

export default Home;
