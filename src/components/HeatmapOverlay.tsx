import React, { useEffect, useRef, useState } from "react";
import { CRS, Point, type LatLngBoundsExpression } from "leaflet";
import { useMap, ImageOverlay } from "react-leaflet";
import { API_BASE_URL } from "../utils/config";

interface HeatmapOverlayProps {
    indexName: string;
    base: string;                         // ISO base_time
    forecastTime: string;                 // ISO forecast_time (NEW: replaces lead_hours)
    step?: number;                        // kept for by_forecast mode (uses step index)
    mode: "by_date" | "by_forecast";
    onLoadingChange?: (loading: boolean) => void;
    onScaleChange?: (scale: { vmin: number; vmax: number } | null) => void;
}


/**
 * HeatmapOverlay component
 *
 * Displays a geospatial heatmap image as an overlay on a Leaflet map.
 * 
 * Responsibilities:
 * - Listens for map movement and zoom changes to determine the current bounding box.
 * - Fetches the heatmap image from the backend API, either:
 *   - By forecast initialization time and step index (by_forecast mode), or
 *   - By base time and forecast time (by_date mode).
 * - Reads custom HTTP headers (extent and scale) from the API response to:
 *   - Compute the geographic bounds for overlay placement.
 *   - Extract the value range (vmin/vmax) for color scale adjustments.
 * - Manages the loading state via the `onLoadingChange` callback.
 * - Notifies the parent about scale changes via `onScaleChange`.
 * - Cleans up network requests when dependencies change or component unmounts.
 *
 * Props:
 * - indexName: Data index to query (e.g., "fopi" or "pof").
 * - base: ISO base_time string.
 * - forecastTime: ISO forecast_time string.
 * - step: Step index (only for by_forecast mode).
 * - mode: Either "by_date" or "by_forecast".
 * - onLoadingChange: Callback to signal loading start/end.
 * - onScaleChange: Callback to update the heatmap's color scale.
 */
const HeatmapOverlay: React.FC<HeatmapOverlayProps> = ({
    indexName,
    base,
    forecastTime,
    mode,
    step,
    onLoadingChange,
    onScaleChange,
}) => {
    const map = useMap();
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [bounds, setBounds] = useState<LatLngBoundsExpression | null>(null);
    const [mapBounds, setMapBounds] = useState<ReturnType<typeof map.getBounds> | null>(null);
    const abortCtrl = useRef<AbortController | null>(null);

    console.log("HeatmapOverlay props:", { indexName, base, forecastTime, mode, step });

    useEffect(() => {
        if (!map) return;

        const handleMapMove = () => {
            // Triggers re-render by updating the dependency
            setMapBounds(map.getBounds());
        };

        map.on("moveend", handleMapMove);
        map.on("zoomend", handleMapMove);

        // Initial trigger
        setMapBounds(map.getBounds());

        return () => {
            map.off("moveend", handleMapMove);
            map.off("zoomend", handleMapMove);
        };
    }, [map]);

    useEffect(() => {
        if (!map || !mapBounds) {
            console.log("No map available");
            return;
        }

        console.log("Starting heatmap fetch...");
        onLoadingChange?.(true); // notify parent loading starts

        abortCtrl.current?.abort();
        const ctrl = new AbortController();
        abortCtrl.current = ctrl;

        (async () => {
            try {
                /* ---------- 1) bbox in EPSG:3857 ---------- */
                const mb = map.getBounds();
                const sw3857 = CRS.EPSG3857.project(mb.getSouthWest());
                const ne3857 = CRS.EPSG3857.project(mb.getNorthEast());
                const bbox = [sw3857.x, sw3857.y, ne3857.x, ne3857.y].join(",");

                let url = "";

                if (mode === "by_forecast" && step !== undefined && step !== null) {
                    // Forecast-init endpoint (step-based)
                    url =
                        `${API_BASE_URL}/api/${indexName}/forecast/heatmap/image` +
                        `?forecast_init=${encodeURIComponent(base)}` +     //  use verbatim string
                        `&step=${step}` +
                        `&bbox=${encodeURIComponent(bbox)}`;
                } else {
                    // Date-based endpoint: base_time + forecast_time
                    url =
                        `${API_BASE_URL}/api/${indexName}/heatmap/image` +
                        `?base_time=${encodeURIComponent(base)}` +         //  use verbatim string
                        `&forecast_time=${encodeURIComponent(forecastTime)}` +
                        `&bbox=${encodeURIComponent(bbox)}`;
                }

                console.log("Fetching heatmap from:", url);

                /* ---------- 2) fetch PNG and header properties ---------- */
                const res = await fetch(url, { signal: ctrl.signal });
                console.log("Heatmap response status:", res.status);

                if (!res.ok) {
                    const errorText = await res.text();
                    console.error("Heatmap fetch error:", res.status, errorText);
                    throw new Error(`Heatmap fetch error ${res.status}: ${errorText}`);
                }

                const extentHdr = res.headers.get("x-extent-3857");
                console.log("Extent header:", extentHdr);

                if (!extentHdr) {
                    console.error("Missing X-Extent-3857 header");
                    throw new Error("Missing X-Extent-3857 header");
                }

                const vminHeader = res.headers.get("x-scale-min");
                const vmaxHeader = res.headers.get("x-scale-max");

                if (!vminHeader || !vmaxHeader) {
                    console.warn("⚠️ Missing scale headers");
                    onScaleChange?.(null);
                } else {
                    const vmin = parseFloat(vminHeader);
                    const vmax = parseFloat(vmaxHeader);
                    console.log("📏 Setting scale from heatmap headers:", { vmin, vmax });
                    onScaleChange?.({ vmin, vmax });
                }

                /* ---------- 3) extent → LatLngBounds ---------- */
                const [left, right, bottom, top] = extentHdr.split(",").map(Number);
                const swLatLng = CRS.EPSG3857.unproject(new Point(left, bottom));
                const neLatLng = CRS.EPSG3857.unproject(new Point(right, top));
                const overlayBounds: LatLngBoundsExpression = [
                    [swLatLng.lat, swLatLng.lng],
                    [neLatLng.lat, neLatLng.lng],
                ];

                console.log("Calculated bounds:", overlayBounds);

                /* ---------- 4) blob → object URL ---------- */
                const blob = await res.blob();
                const objectUrl = URL.createObjectURL(blob);

                console.log("Created object URL:", objectUrl);
                console.log("Setting image and bounds...");

                setImageUrl(objectUrl);
                setBounds(overlayBounds);
                onLoadingChange?.(false); // notify parent loading ends
                console.log("Heatmap overlay ready!");
            } catch (err: any) {
                if (err.name !== "AbortError") {
                    console.error("Heatmap overlay error:", err);
                }
                onLoadingChange?.(false); // notify parent loading ends
            }
        })();

        return () => {
            console.log("Cleaning up heatmap overlay...");
            ctrl.abort();
            onLoadingChange?.(false); // ensure cleanup disables loader
        };
    }, [map, indexName, base, forecastTime, mapBounds, mode, step]);

    console.log("HeatmapOverlay render - imageUrl:", !!imageUrl, "bounds:", !!bounds);

    if (!imageUrl || !bounds) {
        console.log("Not rendering overlay - missing imageUrl or bounds");
        return null;
    }

    console.log("Rendering ImageOverlay with:", { imageUrl, bounds });

    return (
        <ImageOverlay
            url={imageUrl}
            bounds={bounds}
            opacity={1}
        />
    );
};

export default HeatmapOverlay;
