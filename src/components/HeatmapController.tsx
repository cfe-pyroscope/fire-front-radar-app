import React, { useEffect, useState } from "react";
import ForecastSelect from "./ForecastSelect";
import HeatmapOverlay from "./HeatmapOverlay";
import "../css/HeatmapController.css";
import { API_BASE_URL } from "../api/config";

interface ForecastStep {
    time: string;
    lead_hours: number;
}

interface MetadataResponse {
    location: [number, number];
    valid_time: string;
    forecast_steps: ForecastStep[];
}

interface HeatmapControllerProps {
    indexName: "fopi" | "pof";
    selectedDate: Date;
}

const HeatmapController: React.FC<HeatmapControllerProps> = ({ indexName, selectedDate }) => {
    const [forecastSteps, setForecastSteps] = useState<ForecastStep[]>([]);
    const [selectedLeadHours, setSelectedLeadHours] = useState<number | null>(null);
    const [baseTime, setBaseTime] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);

    useEffect(() => {
        // Reset state when dependencies change
        setError(null);
        setLoading(true);

        // More robust date validation
        if (!selectedDate || !(selectedDate instanceof Date) || isNaN(selectedDate.getTime())) {
            console.error("Invalid selectedDate:", selectedDate);
            setError("Invalid date selected");
            setLoading(false);
            return;
        }

        console.log("Fetching metadata for:", indexName, selectedDate.toISOString());

        const fetchMetadata = async () => {
            try {
                const baseIso = selectedDate.toISOString();
                console.log("Base ISO time:", baseIso);

                const url = `${API_BASE_URL}/api/${indexName}?base_time=${baseIso}&lead_hours=0`;
                console.log("Fetching from URL:", url);

                const res = await fetch(url);

                if (!res.ok) {
                    const msg = await res.text();
                    throw new Error(`Metadata API error ${res.status}: ${msg}`);
                }

                const data: MetadataResponse = await res.json();
                console.log("Metadata response:", JSON.stringify(data, null, 2));

                if (!data.forecast_steps || !Array.isArray(data.forecast_steps) || data.forecast_steps.length === 0) {
                    console.error("Invalid forecast_steps:", data.forecast_steps);
                    throw new Error("No forecast steps available for this date.");
                }

                setForecastSteps(data.forecast_steps);
                setSelectedLeadHours(data.forecast_steps[0].lead_hours);
                setBaseTime(baseIso);
                setError(null);

            } catch (err: any) {
                console.error("Failed to load metadata:", err);
                setError(err.message || "Failed to load data for this date");
            } finally {
                setLoading(false);
            }
        };

        fetchMetadata();
    }, [indexName, selectedDate]);

    if (loading) {
        return (
            <div className="forecast-loading">
                Loading forecast data...
            </div>
        );
    }

    if (error) {
        return (
            <div className="forecast-error">
                ⚠️ Error loading heatmap: {error}
            </div>
        );
    }

    console.log("indexName:", indexName);
    console.log("selectedLeadHours:", selectedLeadHours);
    console.log("forecastSteps:", forecastSteps);

    const selectedStep = forecastSteps.find(
        (s) => s.lead_hours === selectedLeadHours
    );

    return (
        <>
            {forecastSteps.length > 0 && (
                <ForecastSelect
                    forecastSteps={forecastSteps}
                    selectedLeadHours={selectedLeadHours}
                    onChange={setSelectedLeadHours}
                />
            )}

            {baseTime !== null && selectedStep && (
                <HeatmapOverlay
                    key={`${indexName}-${baseTime}-${selectedLeadHours}`}
                    indexName={indexName}
                    base={baseTime}              // ✅ original file base
                    lead={selectedLeadHours}     // ✅ new lead selected
                />
            )}
        </>
    );
};

export default HeatmapController;