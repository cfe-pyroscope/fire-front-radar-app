import React, { useEffect, useState } from "react";
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
}

const HeatmapController: React.FC<HeatmapControllerProps> = ({ indexName }) => {
    const [forecastSteps, setForecastSteps] = useState<ForecastStep[]>([]);
    const [selectedLeadHours, setSelectedLeadHours] = useState<number | null>(null);
    const [baseTime, setBaseTime] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const now = new Date();
                const baseMidnight = new Date(Date.UTC(
                    now.getUTCFullYear(),
                    now.getUTCMonth(),
                    now.getUTCDate()
                ));
                const baseIso = baseMidnight.toISOString();

                const url = `${API_BASE_URL}/api/${indexName}?base_time=${baseIso}&lead_hours=0`;
                const res = await fetch(url);

                if (!res.ok) {
                    const msg = await res.text();
                    throw new Error(`Metadata API error ${res.status}: ${msg}`);
                }

                const data: MetadataResponse = await res.json();

                if (!data.forecast_steps || data.forecast_steps.length === 0) {
                    throw new Error("No forecast steps available.");
                }

                setForecastSteps(data.forecast_steps);
                setSelectedLeadHours(data.forecast_steps[0].lead_hours);
                setBaseTime(baseIso);
                setError(null);
            } catch (err: any) {
                console.error("Failed to load metadata:", err);
                setError(err.message || "Unknown error");
            }
        };

        fetchMetadata();
    }, [indexName]);

    if (error) {
        return (
            <div className="forecast-error">
                ⚠️ Error loading heatmap: {error}
            </div>
        );
    }

    return (
        <>
            {forecastSteps.length > 0 && (
                <div className="forecast-dropdown">
                    <label>
                        Forecast time:&nbsp;
                        <br />
                        <select
                            value={selectedLeadHours ?? ""}
                            onChange={(e) => setSelectedLeadHours(parseInt(e.target.value))}
                        >
                            {forecastSteps.map((step) => (
                                <option key={step.lead_hours} value={step.lead_hours}>
                                    {step.time}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>
            )}

            {baseTime !== null && selectedLeadHours !== null && (
                <HeatmapOverlay
                    key={`${indexName}-${baseTime}-${selectedLeadHours}`}
                    indexName={indexName}
                    base={baseTime}
                    lead={selectedLeadHours}
                />
            )}
        </>
    );
};

export default HeatmapController;
