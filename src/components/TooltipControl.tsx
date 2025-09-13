import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import ReactDOMServer from "react-dom/server";
import { IconMapPin } from "@tabler/icons-react";
import { getTooltipValue } from "../api/fireIndexApi";
import { formatDate } from "../utils/date";
import { getPalette } from "../utils/legend";
import "../css/TooltipControl.css";


type IndexName = "pof" | "fopi";
type Mode = "by_date" | "by_forecast";

type Props = {
    indexName: IndexName;
    baseTime: string;        // ISO Z
    forecastTime: string;    // ISO Z
    mode: Mode;              // "by_date" | "by_forecast"
};

const TooltipControl = ({ indexName, baseTime, forecastTime, mode }: Props) => {
    const map = useMap();
    const containerRef = useRef<HTMLElement | null>(null);
    const enabledRef = useRef(false);
    const abortRef = useRef<AbortController | null>(null);
    const onMapClickRef = useRef<((e: L.LeafletMouseEvent) => void) | null>(null);
    const indexRef = useRef(indexName);
    const modeRef = useRef(mode);
    const baseRef = useRef(baseTime);
    const forecastRef = useRef(forecastTime);
    const popupRef = useRef<L.Popup | null>(null);
    const lastClickLatLngRef = useRef<L.LatLng | null>(null);


    const clamp = (n: number, a = 0, b = 1) => Math.min(b, Math.max(a, n));

    /** Normalize value to 0..1 based on index rules. */
    function normalize(indexName: IndexName, v: number) {
        if (indexName === "fopi") return clamp(v, 0, 1);
        // POF: 0 == no risk; > 0.045 == high risk; scale 0..0.045 into 0..1
        if (v <= 0) return 0;
        if (v < 0.045) return v / 0.045;
        return 1;
    }


    /** Pick official_5 color using real thresholds; t=0 (measured 0) => white; null stays gray via caller */
    function colorFromPalette(t: number) {
        const PALETTE_5 = getPalette('official_5');
        const tt =
            indexRef.current === "fopi"
                ? [0.20, 0.40, 0.60, 0.80, 1]
                // pof thresholds mapped into normalized t-space; 0.050 => Extreme (t=1)
                : [0.0025 / 0.045, 0.0075 / 0.045, 0.015 / 0.045, 0.030 / 0.045, 1];

        const x = clamp(t, 0, 1);

        if (x === 0) return "#ffffff";        // measured value 0 → "No risk" → white

        if (x <= tt[0]) return PALETTE_5[0];    // Low
        if (x <= tt[1]) return PALETTE_5[1];    // Medium
        if (x <= tt[2]) return PALETTE_5[2];    // High
        if (x <= tt[3]) return PALETTE_5[3];    // Very High
        return PALETTE_5[4];                    // Extreme (incl. POF ≥ 0.050)
    }




    /** Simple luminance check to choose readable text color */
    function textOn(bgHex?: string, dark = "#111827", light = "#ffffff") {
        if (!bgHex || typeof bgHex !== "string") return dark;
        if (bgHex === "#00000000") return dark;
        const hex = bgHex.replace("#", "");
        const r = parseInt(hex.substring(0, 2), 16) / 255;
        const g = parseInt(hex.substring(2, 4), 16) / 255;
        const b = parseInt(hex.substring(4, 6), 16) / 255;
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        return lum > 0.6 ? dark : light;
    }


    /** Label logic per index. */
    function labelFor(indexName: IndexName, v: number | null) {
        if (v == null || Number.isNaN(v)) return "";
        if (v <= 0) return "No risk";
        if (v > 1) v = 1;

        if (indexName === "fopi") {
            if (v <= 0.20) return "Low";
            if (v <= 0.40) return "Medium";
            if (v <= 0.60) return "High";
            if (v <= 0.80) return "Very High";
            return "Extreme";
        }

        // pof 
        if (v <= 0.0025) return "Low";
        if (v <= 0.0075) return "Medium";
        if (v <= 0.015) return "High";
        if (v <= 0.030) return "Very High";
        if (v <= 0.050) return "Extreme";
        return "Extreme";
    }



    /** Build a discrete gradient string from the palette for the bar. */
    function paletteGradient() {
        const PALETTE = getPalette('official');
        const n = PALETTE.length - 1;
        return PALETTE.map((c, i) => {
            const p = Math.round((i / n) * 100);
            return `${c} ${p}%`;
        }).join(", ");
    }


    useEffect(() => {
        console.log("[TooltipControl] props", { indexName, baseTime, forecastTime, mode });
    }, [indexName, baseTime, forecastTime, mode]);

    useEffect(() => { indexRef.current = indexName; }, [indexName]);
    useEffect(() => { modeRef.current = mode; }, [mode]);
    useEffect(() => { baseRef.current = baseTime; }, [baseTime]);
    useEffect(() => { forecastRef.current = forecastTime; }, [forecastTime]);

    useEffect(() => {
        const onTooltipClear = () => {
            // turn off the control if it was active
            enabledRef.current = false;
            containerRef.current?.classList.remove("active");

            // remove click handler & reset cursor
            if (onMapClickRef.current) map.off("click", onMapClickRef.current);
            (map.getContainer() as HTMLElement).style.cursor = "";

            // stop any pending fetch and close popup
            abortRef.current?.abort();
            map.closePopup();
            popupRef.current = null;
            lastClickLatLngRef.current = null;
        };

        window.addEventListener("tooltip-clear", onTooltipClear);
        return () => window.removeEventListener("tooltip-clear", onTooltipClear);
    }, [map]);

    useEffect(() => {
        const control = L.Control.extend({
            onAdd: function () {
                const container = L.DomUtil.create("div", "leaflet-bar leaflet-control leaflet-tooltip-button");
                L.DomEvent.disableClickPropagation(container);
                L.DomEvent.disableScrollPropagation(container);

                container.title = "Get information about a point";
                container.innerHTML = ReactDOMServer.renderToString(
                    <div className="tooltip-control-content">
                        <IconMapPin size={18} />
                    </div>
                );
                containerRef.current = container;

                // Factor out a renderer so we can reuse it from click + updates
                const renderPopup = (popup: L.Popup, data: any) => {
                    const v = typeof data.value === "number" ? data.value : null;
                    const t = v == null ? 0 : normalize(indexRef.current!, v); // 0..1
                    const pct = Math.round(t * 100);
                    const bg = v == null ? "#f3f4f6" : colorFromPalette(t);
                    const fg = textOn(bg);
                    const lbl = labelFor(indexRef.current!, v);
                    const grad = paletteGradient();

                    const html = `
                                <div class="fire-tip">
                                    <div class="tip-header">
                                    <div class="tip-title">
                                        <span class="flame" aria-hidden="true">🔥</span>
                                        <span class="index">${data.index.toUpperCase()}</span>
                                        <span class="param">· FIRE RISK</span>
                                    </div>
                                    <div class="chip" style="--chip-bg:${bg};--chip-fg:${fg}" title="${v ?? "N/A"}">
                                        ${lbl}
                                        <span class="chip-value">${v == null ? "N/A" : v.toFixed(3)}</span>
                                    </div>
                                    </div>

                                    <div class="risk-bar" style="--risk-gradient: linear-gradient(90deg, ${grad});" aria-label="Risk ${pct}%">
                                    <span style="width:${pct}%"></span>
                                    </div>

                                    <div class="tip-grid">
                                    <div class="label">Base</div>
                                    <div class="value">${formatDate(data.time.base_time, "UTC")}</div>

                                    <div class="label">Forecast</div>
                                    <div class="value">${formatDate(data.time.forecast_time, "UTC")}</div>

                                    <div class="label">Lat/Lon</div>
                                    <div class="value mono">
                                            ${Math.abs(data.point.lat).toFixed(2)}${data.point.lat >= 0 ? 'N°' : 'S°'},
                                            ${Math.abs(data.point.lon).toFixed(2)}${data.point.lon >= 0 ? 'E°' : 'W°'}
                                    </div>

                                    <!-- <div class="label">EPSG:3857</div>
                                    <div class="value mono">${data.point.input_epsg3857.y.toFixed(2)}, ${data.point.input_epsg3857.x.toFixed(2)}</div> -->
                                    </div>
                                </div>
                                `;
                    popup.setContent(html);
                };

                const onMapClick = async (e: L.LeafletMouseEvent) => {
                    const currIndex = indexRef.current!;
                    const currMode = modeRef.current!;
                    const currBase = baseRef.current!;
                    const currForecast = forecastRef.current!;
                    const projected = L.CRS.EPSG3857.project(e.latlng);

                    abortRef.current?.abort();
                    const ac = new AbortController();
                    abortRef.current = ac;

                    // OPEN + remember popup & last latlng
                    const popup = L.popup({ className: "fire-tooltip" })
                        .setLatLng(e.latlng)
                        .setContent("Loading…")
                        .openOn(map);

                    popupRef.current = popup;
                    lastClickLatLngRef.current = e.latlng;

                    try {
                        const data = await getTooltipValue(
                            currIndex,
                            currMode,
                            currBase,
                            currForecast,
                            { x: projected.x, y: projected.y },
                            ac.signal
                        );
                        renderPopup(popup, data);
                    } catch (err: any) {
                        if (ac.signal.aborted) return;
                        const msg = err?.message || "Failed to load";
                        popup.setContent(`⚠️ ${msg}`);
                    }
                };

                onMapClickRef.current = onMapClick;

                container.onclick = () => {
                    enabledRef.current = !enabledRef.current;
                    if (enabledRef.current) {
                        container.classList.add("active");
                        if (onMapClickRef.current) map.on("click", onMapClickRef.current);
                        (map.getContainer() as HTMLElement).style.cursor = "crosshair";
                        console.log("Tooltips activated");
                    } else {
                        container.classList.remove("active");
                        if (onMapClickRef.current) map.off("click", onMapClickRef.current);
                        map.closePopup();
                        popupRef.current = null;
                        lastClickLatLngRef.current = null;
                        abortRef.current?.abort();
                        (map.getContainer() as HTMLElement).style.cursor = "";
                        console.log("Tooltips deactivated");
                    }
                };

                return container;
            },
        });

        const tooltipControl = new (control as any)({ position: "topleft" });
        map.addControl(tooltipControl);

        // Track popup closure to clear refs
        const handlePopupClose = () => {
            popupRef.current = null;
            lastClickLatLngRef.current = null;
        };
        map.on("popupclose", handlePopupClose);

        return () => {
            if (enabledRef.current && onMapClickRef.current) {
                map.off("click", onMapClickRef.current);
            }
            map.off("popupclose", handlePopupClose);
            abortRef.current?.abort();
            map.closePopup();
            popupRef.current = null;
            lastClickLatLngRef.current = null;
            map.removeControl(tooltipControl);
        };
    }, [map]);

    // 🔄 NEW: when inputs change, refresh the open popup (if any)
    useEffect(() => {
        const popup = popupRef.current;
        const latlng = lastClickLatLngRef.current;
        if (!popup || !latlng) return; // nothing open

        // If you only want to close, replace the whole block with: map.closePopup();
        (async () => {
            abortRef.current?.abort();
            const ac = new AbortController();
            abortRef.current = ac;

            popup.setContent("Loading…");

            try {
                const currIndex = indexRef.current!;
                const currMode = modeRef.current!;
                const currBase = baseRef.current!;
                const currForecast = forecastRef.current!;

                const projected = L.CRS.EPSG3857.project(latlng);
                const data = await getTooltipValue(
                    currIndex,
                    currMode,
                    currBase,
                    currForecast,
                    { x: projected.x, y: projected.y },
                    ac.signal
                );

                // Reuse the same renderer from above
                // (copy it here if you didn’t lift it)
                const v = typeof data.value === "number" ? data.value : null;
                const t = v == null ? 0 : normalize(currIndex, v);
                const pct = Math.round(t * 100);
                const bg = v == null ? "#f3f4f6" : colorFromPalette(t);
                const fg = textOn(bg);
                const lbl = labelFor(currIndex, v);
                const grad = paletteGradient();

                const html = `
                            <div class="fire-tip">
                            <div class="tip-header">
                                <div class="tip-title">
                                <span class="flame" aria-hidden="true">🔥</span>
                                <span class="index">${data.index.toUpperCase()}</span>
                                <span class="param">· RISK</span>
                                </div>
                                <div class="chip" style="--chip-bg:${bg};--chip-fg:${fg}" title="${v ?? "N/A"}">
                                ${lbl}
                                <span class="chip-value">${v == null ? "N/A" : v.toFixed(3)}</span>
                                </div>
                            </div>
                            <div class="risk-bar" style="--risk-gradient: linear-gradient(90deg, ${grad});" aria-label="Risk ${pct}%">
                                <span style="width:${pct}%"></span>
                            </div>
                            <div class="tip-grid">
                                <div class="label">Base</div>
                                <div class="value">${formatDate(data.time.base_time, "UTC")}</div>

                                <div class="label">Forecast</div>
                                <div class="value">${formatDate(data.time.forecast_time, "UTC")}</div>

                                <div class="label">Lan/Lon</div>
                                <div class="value mono">
                                        ${Math.abs(data.point.lat).toFixed(2)}${data.point.lat >= 0 ? 'N°' : 'S°'},
                                        ${Math.abs(data.point.lon).toFixed(2)}${data.point.lon >= 0 ? 'E°' : 'W°'}
                                </div>

                                /* <div class="label">EPSG:3857</div>
                                <div class="value mono">${data.point.input_epsg3857.x.toFixed(2)}, ${data.point.input_epsg3857.y.toFixed(2)}</div> */
                            </div>
                            </div>
                        `;
                popup.setContent(html);
            } catch (err: any) {
                if (ac.signal.aborted) return;
                popup.setContent(`⚠️ ${err?.message || "Failed to load"}`);
            }
        })();
    }, [indexName, mode, baseTime, forecastTime, map]);

    return null;
};

export default TooltipControl;
