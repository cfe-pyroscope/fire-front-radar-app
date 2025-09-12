import React, { useEffect, useRef, useState } from "react";
import { CRS, Point, type LatLngBoundsExpression } from "leaflet";
import { useMap, ImageOverlay } from "react-leaflet";
import { getHeatmapImage } from "../api/fireIndexApi";

interface HeatmapOverlayProps {
    indexName: string;
    base: string;                         // ISO base_time
    forecastTime: string;                 // ISO forecast_time
    mode: "by_date" | "by_forecast";
    onLoadingChange?: (loading: boolean) => void;
    onScaleChange?: (scale: { vmin: number; vmax: number } | null) => void;
}

const HeatmapOverlay: React.FC<HeatmapOverlayProps> = ({
    indexName,
    base,
    forecastTime,
    mode,
    onLoadingChange,
    onScaleChange,
}) => {
    const map = useMap();
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [bounds, setBounds] = useState<LatLngBoundsExpression | null>(null);
    const [mapBounds, setMapBounds] = useState<ReturnType<typeof map.getBounds> | null>(null);
    const abortCtrl = useRef<AbortController | null>(null);

    // console.log("[HeatmapOverlay]  props:", { indexName, base, forecastTime, mode });

    useEffect(() => {
        if (!map) return;

        const handleMapMove = () => setMapBounds(map.getBounds()); // Triggers re-render by updating the dependency

        map.on("moveend", handleMapMove);
        map.on("zoomend", handleMapMove);

        // initial trigger
        setMapBounds(map.getBounds());

        return () => {
            map.off("moveend", handleMapMove);
            map.off("zoomend", handleMapMove);
        };
    }, [map]);

    useEffect(() => {
        if (!map || !mapBounds) {
            // console.log("[HeatmapOverlay] No map available");
            return;
        }

        // console.log("[HeatmapOverlay] Starting heatmap fetch...");
        onLoadingChange?.(true); // notify parent loading starts

        // cancel any in-flight request
        abortCtrl.current?.abort();
        const ctrl = new AbortController();
        abortCtrl.current = ctrl;

        // console.log("[HeatmapOverlay] base: ", base);
        // console.log("[HeatmapOverlay] forecastTime: ", forecastTime);

        (async () => {
            try {
                // 1) bbox in EPSG:3857
                const sw3857 = CRS.EPSG3857.project(mapBounds.getSouthWest());
                const ne3857 = CRS.EPSG3857.project(mapBounds.getNorthEast());
                const bbox = [sw3857.x, sw3857.y, ne3857.x, ne3857.y].join(",");

                // 2) fetch PNG + metadata via API layer
                const { blob, extent3857, vmin, vmax } = await getHeatmapImage(
                    indexName as "pof" | "fopi",
                    mode,
                    base,
                    forecastTime,
                    bbox,
                    ctrl.signal
                );

                // 3) update scale
                if (vmin != null && vmax != null) {
                    // console.warn("[HeatmapOverlay] Missing scale headers");
                    onScaleChange?.({ vmin, vmax });
                } else {
                    // console.log("[HeatmapOverlay] Setting scale from heatmap headers:", { vmin, vmax });
                    onScaleChange?.(null);
                }

                // 4) extent → LatLngBounds
                const [left, right, bottom, top] = extent3857;
                const swLatLng = CRS.EPSG3857.unproject(new Point(left, bottom));
                const neLatLng = CRS.EPSG3857.unproject(new Point(right, top));
                const overlayBounds: LatLngBoundsExpression = [
                    [swLatLng.lat, swLatLng.lng],
                    [neLatLng.lat, neLatLng.lng],
                ];

                // console.log("[HeatmapOverlay] Calculated bounds:", overlayBounds);

                // 5) blob → object URL
                const objectUrl = URL.createObjectURL(blob);
                setImageUrl((prev) => {
                    if (prev) URL.revokeObjectURL(prev);
                    return objectUrl;
                });

                // console.log("[HeatmapOverlay] Created object URL:", objectUrl);
                // console.log("[HeatmapOverlay] Setting image and bounds...");

                setBounds(overlayBounds);
            } catch (err: any) {
                if (err.name !== "AbortError") {
                    console.error("[HeatmapOverlay] error:", err);
                }
            } finally {
                onLoadingChange?.(false); // notify parent loading ends
                // console.log("[HeatmapOverlay] Heatmap overlay ready!");
            }
        })();

        return () => {
            // console.log("[HeatmapOverlay] Cleaning up heatmap overlay...");
            ctrl.abort();
            onLoadingChange?.(false); // ensure cleanup disables loader
        };
    }, [map, indexName, base, forecastTime, mapBounds, mode]);


    // console.log("[HeatmapOverlay] render - imageUrl:", !!imageUrl, "bounds:", !!bounds);


    // revoke URL on unmount
    useEffect(() => {
        return () => {
            if (imageUrl) URL.revokeObjectURL(imageUrl);
        };
    }, [imageUrl]);

    if (!imageUrl || !bounds) {
        // console.log("[HeatmapOverlay] Not rendering overlay - missing imageUrl or bounds");
        return null;
    }

    // console.log("[HeatmapOverlay] Rendering ImageOverlay with:", { imageUrl, bounds });


    return (
        <ImageOverlay
            url={imageUrl}
            bounds={bounds}
            opacity={1}
        />
    );
};

export default HeatmapOverlay;
