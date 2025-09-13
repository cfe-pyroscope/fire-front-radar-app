import { API_BASE_URL } from '../utils/config';

/** Public types */
export type IndexName = 'pof' | 'fopi';
export type Mode = 'by_date' | 'by_forecast';
export type Extent3857 = [number, number, number, number];

export interface ForecastStep {
    forecast_time: string; // ISO
    base_time: string; // ISO
}

/** Backend shape (only-forecast_time version) */
export interface ForecastTimeResponse {
    base_time?: string; // ISO Z
    forecast_time: string[]; // ISO Z array
}

/** Normalized output */
export interface ForecastStepsNormalized {
    baseTime: string; // ISO Z
    steps: ForecastStep[]; // normalized
    initialForecastTime: string; // ISO
}

export interface HeatmapImageResult {
    blob: Blob;
    extent3857: Extent3857;
    vmin?: number;
    vmax?: number;
}

export interface TimeSeriesPoint {
    time: string; // ISO string
    value: number | null; // series value
}

export interface ForecastTime {
    time: string; // ISO string
    value: number | null; // series value
}

/** Error type */
export class ApiError extends Error {
    status?: number;
    constructor(message: string, status?: number) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

/** Utilities */
const toMidnightUTC = (d: Date) =>
    new Date(
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0),
    );

/** Return full ISO with trailing Z, e.g. 2025-07-20T00:00:00Z */
const toIsoZ = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(
        d.getUTCHours(),
    )}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}Z`;
};

const formatISO = (d: string | Date): string => {
    const date = d instanceof Date ? d : new Date(d); // ensure we have a Date

    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.00Z`;
};

/** Low-level fetch wrapper with better errors + optional AbortSignal */
async function fetchJSON<T>(url: string, signal?: AbortSignal): Promise<T> {
    const res = await fetch(url, { signal });
    const text = await res.text();
    if (!res.ok) {
        throw new ApiError(
            `API ${res.status}: ${text || res.statusText}`,
            res.status,
        );
    }
    try {
        return JSON.parse(text) as T;
    } catch (e) {
        throw new ApiError(`Failed to parse JSON from ${url}: ${String(e)}`);
    }
}

/** ---------- Service functions (named exports) ---------- */

/** Dates list */
export async function getAvailableDates(
    indexName: IndexName,
    signal?: AbortSignal,
): Promise<Date[]> {
    const url = `${API_BASE_URL}/api/${indexName}/available_dates`;
    console.log(url);
    const data = await fetchJSON<{ available_dates: string[] }>(url, signal);
    // normalize to UTC “noon” to avoid TZ shifts when rendering local-only dates
    return data.available_dates.map((d) => {
        const dt = new Date(d);
        return new Date(
            Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate(), 12),
        );
    });
}

/** Latest date */
export async function getLatestDate(
    indexName: IndexName,
    signal?: AbortSignal,
): Promise<Date | null> {
    const url = `${API_BASE_URL}/api/${indexName}/latest_date`;
    const data = await fetchJSON<{ latest_date: string }>(url, signal);
    const parsed = new Date(data.latest_date);
    if (isNaN(parsed.getTime())) return null;
    return new Date(
        Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12),
    );
}

/** Forecast steps (only supports `{ base_time, forecast_time: string[] }`) */
export async function getForecastSteps(
    indexName: IndexName,
    mode: Mode,
    selectedDate: Date,
    signal?: AbortSignal,
): Promise<ForecastStepsNormalized> {
    const baseMidnight = toMidnightUTC(selectedDate);
    const baseIsoZ = toIsoZ(baseMidnight);

    const url =
        mode === 'by_forecast'
            ? `${API_BASE_URL}/api/${indexName}/by_forecast?base_time=${encodeURIComponent(baseIsoZ)}`
            : `${API_BASE_URL}/api/${indexName}/by_date?base_time=${encodeURIComponent(baseIsoZ)}`;

    const raw = await fetchJSON<ForecastTimeResponse>(url, signal);
    console.log('[fireIndexAPI] raw data', raw);

    const times = raw.forecast_time;
    if (!Array.isArray(times) || times.length === 0) {
        throw new ApiError('No forecast steps available for this date.');
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
    mode: Mode,
    baseTimeISO: string,
    forecastTimeISO: string,
    bbox3857Csv: string, // "minX,minY,maxX,maxY" in EPSG:3857
    signal?: AbortSignal,
): Promise<HeatmapImageResult> {
    let base_time_param = baseTimeISO;
    let forecast_time_param = forecastTimeISO;

    // console.log("[foreIndexApi] mode", mode);
    // console.log("[foreIndexApi] base_time_param", base_time_param);
    // console.log("[foreIndexApi] forecast_time_param", forecast_time_param);

    if (mode == 'by_forecast') {
        // Parse into Date objects
        const baseDate = new Date(baseTimeISO);
        const forecastDate = new Date(forecastTimeISO);

        // base_time_param = forecast date with midnight UTC
        base_time_param = formatISO(
            new Date(
                Date.UTC(
                    forecastDate.getUTCFullYear(),
                    forecastDate.getUTCMonth(),
                    forecastDate.getUTCDate(), // midnight
                    0,
                    0,
                    0,
                ),
            ),
        );

        // forecast_time_param = base date with forecast time
        forecast_time_param = formatISO(
            new Date(
                Date.UTC(
                    baseDate.getUTCFullYear(),
                    baseDate.getUTCMonth(),
                    baseDate.getUTCDate(),
                    forecastDate.getUTCHours(),
                    forecastDate.getUTCMinutes(),
                    forecastDate.getUTCSeconds(),
                ),
            ),
        );

        // console.log("[foreIndexApi] mode", mode);
        // console.log("[foreIndexApi] base_time_param", base_time_param);
        // console.log("[foreIndexApi] forecast_time_param", forecast_time_param);
    }

    const url =
        `${API_BASE_URL}/api/${indexName}/heatmap/image` +
        `?base_time=${encodeURIComponent(base_time_param)}` +
        `&forecast_time=${encodeURIComponent(forecast_time_param)}` +
        `&bbox=${encodeURIComponent(bbox3857Csv)}`;

    const res = await fetch(url, { signal });

    // Keep the same error style as elsewhere in fireIndexApi
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new ApiError(
            `API ${res.status}: ${text || res.statusText}`,
            res.status,
        );
    }

    const extentHdr = res.headers.get('x-extent-3857');
    if (!extentHdr) {
        throw new ApiError('Missing x-extent-3857 header');
    }
    const [left, right, bottom, top] = extentHdr.split(',').map(Number);
    const extent3857: Extent3857 = [left, right, bottom, top];

    const vminHdr = res.headers.get('x-scale-min');
    const vmaxHdr = res.headers.get('x-scale-max');
    const vmin = vminHdr != null ? Number(vminHdr) : undefined;
    const vmax = vmaxHdr != null ? Number(vmaxHdr) : undefined;

    const blob = await res.blob();

    return { blob, extent3857, vmin, vmax };
}

// --- Add these types near your other exports ---
export interface TooltipPoint {
    input_epsg3857: { x: number; y: number };
    lon: number;
    lat: number;
    nearest_grid: { lon: number; lat: number };
}

export interface TooltipResponse {
    index: IndexName; // "pof" | "fopi"
    param: string; // e.g., "MODEL_FIRE"
    value: number | null; // fire risk value
    point: TooltipPoint;
    time: { base_time: string; forecast_time: string };
}

// --- Add this function among your service functions ---
export async function getTooltipValue(
    indexName: IndexName,
    mode: Mode,
    baseTimeISO: string,
    forecastTimeISO: string,
    coords3857: { x: number; y: number },
    signal?: AbortSignal,
): Promise<TooltipResponse> {
    let base_time_param = baseTimeISO;
    let forecast_time_param = forecastTimeISO;

    // Keep parity with getHeatmapImage's by_forecast mapping
    if (mode === 'by_forecast') {
        const baseDate = new Date(baseTimeISO);
        const forecastDate = new Date(forecastTimeISO);

        base_time_param = formatISO(
            new Date(
                Date.UTC(
                    forecastDate.getUTCFullYear(),
                    forecastDate.getUTCMonth(),
                    forecastDate.getUTCDate(),
                    0,
                    0,
                    0,
                ),
            ),
        );

        forecast_time_param = formatISO(
            new Date(
                Date.UTC(
                    baseDate.getUTCFullYear(),
                    baseDate.getUTCMonth(),
                    baseDate.getUTCDate(),
                    forecastDate.getUTCHours(),
                    forecastDate.getUTCMinutes(),
                    forecastDate.getUTCSeconds(),
                ),
            ),
        );
    }

    const url =
        `${API_BASE_URL}/api/${indexName}/tooltip` +
        `?base_time=${encodeURIComponent(base_time_param)}` +
        `&forecast_time=${encodeURIComponent(forecast_time_param)}` +
        `&coords=${encodeURIComponent(`${coords3857.x},${coords3857.y}`)}`;

    return fetchJSON<TooltipResponse>(url, signal);
}



export type TimeSeriesByBaseTime = {
    index: 'pof' | 'fopi';
    mode: 'by_base_time';
    stat: ['mean', 'median'] | string[];
    bbox_epsg3857?: string | null;
    bbox_epsg4326?: [number, number, number, number];
    timestamps: string[];
    mean: (number | null)[];
    median: (number | null)[];
};


export async function getTimeSeries(
    indexName: 'pof' | 'fopi',
    bbox?: string | null,
    signal?: AbortSignal,
    startBase?: string | Date | null,
    endBase?: string | Date | null
): Promise<TimeSeriesByBaseTime> {
    let url = `${API_BASE_URL}/api/${indexName}/time_series?format=json`;
    if (bbox) url += `&bbox=${encodeURIComponent(bbox)}`;

    const toIsoUtc = (d: string | Date) => {
        const dd = d instanceof Date ? d : new Date(d);
        // Force to UTC midnight and output 2025-09-01T00:00:00Z
        return new Date(Date.UTC(dd.getFullYear(), dd.getMonth(), dd.getDate())).toISOString();
    };

    if (startBase) url += `&start_base=${encodeURIComponent(toIsoUtc(startBase))}`;
    if (endBase) url += `&end_base=${encodeURIComponent(toIsoUtc(endBase))}`;

    return fetchJSON<TimeSeriesByBaseTime>(url, signal);
}


export async function getForecastHorizon(
    indexName: IndexName,
    bbox?: string | null,
    signal?: AbortSignal,
): Promise<ForecastTime[]> {
    console.log(indexName);
    let url = `${API_BASE_URL}/api/forecast_horizon?format=json`;
    if (bbox) url += `&bbox=${encodeURIComponent(bbox)}`;
    return fetchJSON<ForecastTime[]>(url, signal);
}
