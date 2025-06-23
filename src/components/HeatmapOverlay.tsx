import React, { useEffect, useRef, useState } from "react";
import { CRS, Point, type LatLngBoundsExpression } from "leaflet";
import { useMap, ImageOverlay } from "react-leaflet";
import { API_BASE_URL } from "../api/config";

interface HeatmapOverlayProps {
    indexName: string;
    base: string;
    lead: number;
}

const HeatmapOverlay: React.FC<HeatmapOverlayProps> = ({ indexName, base, lead }) => {
    const map = useMap();
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [bounds, setBounds] = useState<LatLngBoundsExpression | null>(null);
    const abortCtrl = useRef<AbortController | null>(null);

    useEffect(() => {
        if (!map) return;

        abortCtrl.current?.abort();
        const ctrl = new AbortController();
        abortCtrl.current = ctrl;

        (async () => {
            /* ---------- 1) bbox in EPSG:3857 ---------- */
            const mapBounds = map.getBounds();
            const sw3857 = CRS.EPSG3857.project(mapBounds.getSouthWest());
            const ne3857 = CRS.EPSG3857.project(mapBounds.getNorthEast());
            const bbox = [sw3857.x, sw3857.y, ne3857.x, ne3857.y].join(",");

            const url =
                `${API_BASE_URL}/api/${indexName}/heatmap/image` +
                `?base_time=${base}&lead_hours=${lead}&bbox=${bbox}`;


            /* ---------- 2) fetch PNG ---------- */
            const res = await fetch(url, { signal: ctrl.signal });
            if (!res.ok) throw new Error(`Heatmap fetch error ${res.status}`);

            const extentHdr = res.headers.get("x-extent-3857");
            if (!extentHdr) throw new Error("Missing X-Extent-3857 header");

            /* ---------- 3) extent → LatLngBounds ---------- */
            const [left, right, bottom, top] = extentHdr.split(",").map(Number);
            const swLatLng = CRS.EPSG3857.unproject(new Point(left, bottom));
            const neLatLng = CRS.EPSG3857.unproject(new Point(right, top));
            const overlayBounds: LatLngBoundsExpression = [
                [swLatLng.lat, swLatLng.lng],
                [neLatLng.lat, neLatLng.lng],
            ];

            /* ---------- 4) blob → object URL ---------- */
            const blob = await res.blob();
            const objectUrl = URL.createObjectURL(blob);

            setImageUrl(objectUrl);
            setBounds(overlayBounds);
        })().catch((err) => {
            if (err.name !== "AbortError") console.error(err);
        });

        return () => ctrl.abort();
    }, [map, indexName, base, lead]);

    if (!imageUrl || !bounds) return null;

    return (
        <ImageOverlay
            url={imageUrl}
            bounds={bounds}
            opacity={0.55}
        />
    );
};

export default HeatmapOverlay;
