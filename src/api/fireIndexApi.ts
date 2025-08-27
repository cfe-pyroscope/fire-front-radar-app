import { API_BASE_URL } from "../utils/config";

/** Public types */
export type IndexName = "pof" | "fopi";
export type Mode = "by_date" | "by_forecast";
export type Extent3857 = [number, number, number, number];

export interface ForecastStep {
    forecast_time: string; // ISO
    base_time: string;     // ISO
}

/** Backend shape (only-forecast_time version) */
export interface ForecastTimeResponse {
    base_time?: string;      // ISO Z
    forecast_time: string[]; // ISO Z array
}

/** Normalized output */
export interface ForecastStepsNormalized {
    baseTime: string;              // ISO Z
    steps: ForecastStep[];         // normalized
    initialForecastTime: string;   // ISO
}

export interface HeatmapImageResult {
    blob: Blob;
    extent3857: Extent3857;
    vmin?: number;
    vmax?: number;
}

/** Error type */
export class ApiError extends Error {
    status?: number;
    constructor(message: string, status?: number) {
        super(message);
        this.name = "ApiError";
        this.status = status;
    }
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

/** Low-level fetch wrapper with better errors + optional AbortSignal */
async function fetchJSON<T>(url: string, signal?: AbortSignal): Promise<T> {
    const res = await fetch(url, { signal });
    const text = await res.text();
    if (!res.ok) {
        throw new ApiError(`API ${res.status}: ${text || res.statusText}`, res.status);
    }
    try {
        return JSON.parse(text) as T;
    } catch (e) {
        throw new ApiError(`Failed to parse JSON from ${url}: ${String(e)}`);
    }
}

/** ---------- Service functions (named exports) ---------- */

/** Dates list */
export async function getAvailableDates(indexName: IndexName, signal?: AbortSignal): Promise<Date[]> {
    const url = `${API_BASE_URL}/api/${indexName}/available_dates`;
    const data = await fetchJSON<{ available_dates: string[] }>(url, signal);
    // normalize to UTC “noon” to avoid TZ shifts when rendering local-only dates
    return data.available_dates.map((d) => {
        const dt = new Date(d);
        return new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate(), 12));
    });
}

/** Latest date */
export async function getLatestDate(indexName: IndexName, signal?: AbortSignal): Promise<Date | null> {
    const url = `${API_BASE_URL}/api/${indexName}/latest_date`;
    const data = await fetchJSON<{ latest_date: string }>(url, signal);
    const parsed = new Date(data.latest_date);
    if (isNaN(parsed.getTime())) return null;
    return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12));
}

/** Forecast steps (only supports `{ base_time, forecast_time: string[] }`) */
export async function getForecastSteps(
    indexName: IndexName,
    mode: Mode,
    selectedDate: Date,
    signal?: AbortSignal
): Promise<ForecastStepsNormalized> {
    const baseMidnight = toMidnightUTC(selectedDate);
    const baseIsoZ = toIsoZ(baseMidnight);

    const url =
        mode === "by_forecast"
            ? `${API_BASE_URL}/api/${indexName}/by_forecast?base_time=${encodeURIComponent(baseIsoZ)}`
            : `${API_BASE_URL}/api/${indexName}/by_date?base_time=${encodeURIComponent(baseIsoZ)}`;

    const raw = await fetchJSON<ForecastTimeResponse>(url, signal);
    console.log("[fireIndexAPI] raw data", raw);

    const times = raw.forecast_time;
    if (!Array.isArray(times) || times.length === 0) {
        throw new ApiError("No forecast steps available for this date.");
    }

    const baseTime = raw.base_time ?? baseIsoZ;

    const steps: ForecastStep[] = times.map((ft) => ({
        base_time: baseTime,
        forecast_time: ft,
    }));

    return {
        baseTime,
        steps,
        initialForecastTime: times[0],
    };
}


export async function getHeatmapImage(
    indexName: IndexName,
    baseTimeISO: string,
    forecastTimeISO: string,
    bbox3857Csv: string,              // "minX,minY,maxX,maxY" in EPSG:3857
    signal?: AbortSignal
): Promise<HeatmapImageResult> {
    const url =
        `${API_BASE_URL}/api/${indexName}/heatmap/image` +
        `?base_time=${encodeURIComponent(baseTimeISO)}` +
        `&forecast_time=${encodeURIComponent(forecastTimeISO)}` +
        `&bbox=${encodeURIComponent(bbox3857Csv)}`;

    const res = await fetch(url, { signal });

    // Keep the same error style as elsewhere in fireIndexApi
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new ApiError(`API ${res.status}: ${text || res.statusText}`, res.status);
    }

    const extentHdr = res.headers.get("x-extent-3857");
    if (!extentHdr) {
        throw new ApiError("Missing x-extent-3857 header");
    }
    const [left, right, bottom, top] = extentHdr.split(",").map(Number);
    const extent3857: Extent3857 = [left, right, bottom, top];

    const vminHdr = res.headers.get("x-scale-min");
    const vmaxHdr = res.headers.get("x-scale-max");
    const vmin = vminHdr != null ? Number(vminHdr) : undefined;
    const vmax = vmaxHdr != null ? Number(vmaxHdr) : undefined;

    const blob = await res.blob();

    return { blob, extent3857, vmin, vmax };
}