import { API_BASE_URL } from '../utils/config';
import { toIsoUtc, toMidnightUTC, toIsoZ, formatISO } from '../utils/date';

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


export type ForecastHorizonResponse = {
    base_date: string | null;
    bbox_epsg3857?: string | null;
    bbox_epsg4326?: [number, number, number, number] | null; // tuple in lon/lat
    pof_forecast: number[];
    fopi_forecast: number[];
    axes_pof: [number, number];
    axes_fopi: [number, number];
};


export async function getForecastHorizon(
    bbox?: string | null,
    signal?: AbortSignal,
): Promise<ForecastHorizonResponse> {
    let url = `${API_BASE_URL}/api/forecast_horizon?format=json`;
    if (bbox) url += `&bbox=${encodeURIComponent(bbox)}`;
    return fetchJSON<ForecastHorizonResponse>(url, signal);
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


    if (startBase) url += `&start_base=${encodeURIComponent(toIsoUtc(startBase))}`;
    if (endBase) url += `&end_base=${encodeURIComponent(toIsoUtc(endBase))}`;

    return fetchJSON<TimeSeriesByBaseTime>(url, signal);
}



export type ExpectedFiresByDate = {
    index: 'pof' | 'fopi';
    mode: 'by_date';
    stat: string[]; // ["sum"]
    bbox_epsg3857?: string | null;
    bbox_epsg4326?: [number, number, number, number] | null; // [lat_min, lon_min, lat_max, lon_max]
    dates: string[]; // "YYYY-MM-DD"
    expected_sum: number[]; // sum of probabilities per UTC day
    cumulative_expected: number[]; // running sum (helper for diagnostics/plots)
    notes?: string;
};

export async function getExpectedFiresByDate(
    indexName: 'pof' | 'fopi',
    bbox?: string | null,
    signal?: AbortSignal,
    startBase?: string | Date | null,
    endBase?: string | Date | null
): Promise<ExpectedFiresByDate> {
    let url = `${API_BASE_URL}/api/${indexName}/expected_fires?format=json`;
    if (bbox) url += `&bbox=${encodeURIComponent(bbox)}`;
    if (startBase) url += `&start_base=${encodeURIComponent(toIsoUtc(startBase))}`;
    if (endBase) url += `&end_base=${encodeURIComponent(toIsoUtc(endBase))}`;
    console.info("[Exceedance] GET", url);
    return fetchJSON<ExpectedFiresByDate>(url, signal);
}



export type ExceedanceFrequency = {
    index: 'pof' | 'fopi';
    mode: 'exceedance_frequency';
    bbox_epsg3857?: string | null;
    bbox_epsg4326?: [number, number, number, number] | null; // [lat_min, lon_min, lat_max, lon_max]

    thresholds: number[];

    overall: {
        thresholds: number[];   // same as top-level thresholds
        fraction: number[];     // pooled CCDF across all runs/cells
        count: number[];        // pooled count of cells >= t
        total: number;          // pooled total valid cells
    };

    by_date: {
        dates: string[];        // YYYY-MM-DD
        fraction: number[][];   // shape: [n_dates][n_thresholds]
        count: number[][];      // shape: [n_dates][n_thresholds]
        total: number[];        // per-date total valid cells
    };

    notes?: string;
};


export async function getExceedanceFrequency(
    indexName: 'pof' | 'fopi',
    opts?: {
        bbox?: string | null;
        startBase?: string | Date | null;
        endBase?: string | Date | null;
        thresholds?: number[] | null; // optional custom thresholds
        signal?: AbortSignal;
    }
): Promise<ExceedanceFrequency> {
    const { bbox, startBase, endBase, thresholds, signal } = opts ?? {};

    let url = `${API_BASE_URL}/api/${indexName}/exceedance_frequency?format=json`;
    if (bbox) url += `&bbox=${encodeURIComponent(bbox)}`;
    if (startBase) url += `&start_base=${encodeURIComponent(toIsoUtc(startBase))}`;
    if (endBase) url += `&end_base=${encodeURIComponent(toIsoUtc(endBase))}`;
    if (thresholds && thresholds.length) {
        url += `&thresholds=${encodeURIComponent(thresholds.join(','))}`;
    }

    return fetchJSON<ExceedanceFrequency>(url, signal);
}


export type DifferenceMapResponse = {
    index: "pof" | "fopi";
    mode: "difference_map";
    bbox_epsg3857?: string | null;
    bbox_epsg4326?: [number, number, number, number] | null;
    base_time_start: string; // ISO8601
    base_time_end: string;   // ISO8601
    lats: number[];
    lons: number[];
    delta: (number | null)[][];
};

export async function getDifferenceMap(
    indexName: "pof" | "fopi",
    baseTimeStart: string | Date,
    baseTimeEnd: string | Date,
    bbox: string,
    signal?: AbortSignal
): Promise<DifferenceMapResponse> {
    const url = new URL(`${API_BASE_URL}/api/${indexName}/difference_map`);
    url.searchParams.set("format", "json");
    url.searchParams.set("bbox", bbox);
    url.searchParams.set("base_time_start", toIsoUtc(baseTimeStart));
    url.searchParams.set("base_time_end", toIsoUtc(baseTimeEnd));

    console.log("[getDifferenceMap] API query:", url.toString());
    return fetchJSON<DifferenceMapResponse>(url.toString(), signal);
}


