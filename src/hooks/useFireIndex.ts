import { useEffect, useState } from "react";
import type { IndexName, Mode, ForecastStep } from "../api/fireIndexApi";
import { getAvailableDates, getLatestDate, getForecastSteps, ApiError } from "../api/fireIndexApi";

export function useAvailableDates(indexName: IndexName) {
    const [availableDates, setAvailableDates] = useState<Date[] | null>(null);

    useEffect(() => {
        const ac = new AbortController();
        (async () => {
            try {
                const dates = await getAvailableDates(indexName, ac.signal);
                setAvailableDates(dates);
                console.log("[useAvailableDates] OK", {
                    indexName,
                    count: dates.length,
                    first: dates[0],
                    last: dates[dates.length - 1],
                });
            } catch (err) {
                if (ac.signal.aborted) return;
                console.error("Failed to fetch available dates:", err);
                setAvailableDates(null);
            }
        })();
        return () => ac.abort();
    }, [indexName]);

    return availableDates;
}

export function useLatestDate(indexName: IndexName) {
    const [latest, setLatest] = useState<Date | null>(null);

    useEffect(() => {
        const ac = new AbortController();
        (async () => {
            try {
                const date = await getLatestDate(indexName, ac.signal);
                setLatest(date);
                if (date) console.log("[useLatestDate] OK", { indexName, utcNoon: date.toISOString() });
            } catch (err) {
                if (ac.signal.aborted) return;
                console.error("Failed to fetch latest date:", err);
                setLatest(null);
            }
        })();
        return () => ac.abort();
    }, [indexName]);

    return latest;
}

export function useForecastSteps(
    indexName: IndexName,
    mode: Mode,
    selectedDate: Date | null
) {
    const [state, setState] = useState<{
        steps: ForecastStep[];
        baseTime: string | null;
        selectedForecastTime: string | null;
        error: string | null;
        loading: boolean;
    }>({ steps: [], baseTime: null, selectedForecastTime: null, error: null, loading: false });

    useEffect(() => {
        if (!selectedDate) return;
        const ac = new AbortController();

        (async () => {
            setState((s) => ({ ...s, loading: true, error: null }));
            try {
                const { steps, baseTime, initialForecastTime } = await getForecastSteps(
                    indexName,
                    mode,
                    selectedDate,
                    ac.signal
                );

                setState({
                    steps,
                    baseTime,
                    selectedForecastTime: initialForecastTime,
                    error: null,
                    loading: false,
                });
            } catch (err: any) {
                if (ac.signal.aborted) return;
                const msg =
                    err instanceof ApiError
                        ? err.message
                        : err?.message || "Failed to load data for this date";
                console.error("[useForeCastSteps] error", msg);
                setState((s) => ({ ...s, loading: false, error: msg }));
            }
        })();

        return () => ac.abort();
    }, [indexName, mode, selectedDate]);

    return state;
}
