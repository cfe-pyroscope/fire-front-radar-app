export function formatDate(iso: string, tz: string = "UTC") {
    const d = new Date(iso);

    const dateParts = new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: tz,
    }).formatToParts(d);

    const day = dateParts.find(p => p.type === "day")!.value;
    const month = dateParts.find(p => p.type === "month")!.value; // e.g. "Jul"
    const year = dateParts.find(p => p.type === "year")!.value;

    return `${day} ${month}, ${year}`; // "11 Jul, 2025 00:00"
}



/** Returns "11 Jul, 2025" without time (UTC by default) or "—" when empty/invalid. */
export function formatBaseDateLabel(
    current: string | Date | null | undefined,
    locale: string | undefined = undefined,
    timeZone: string = "UTC"
): string {
    if (!current) return "—";
    const d = new Date(current);
    if (isNaN(d.getTime())) return "—";

    return d.toLocaleDateString(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone,
    });
}

/**
 * Combines base's UTC Y-M-D with current's UTC H:M (seconds = 0),
 * then formats like "11 Jul, 2025, 00:00" (UTC by default).
 * Returns "—" when empty/invalid.
 */
export function formatCombinedDateTimeLabel(
    current: string | Date | null | undefined,
    baseISO: string | Date | null | undefined,
    locale: string | undefined = undefined,
    timeZone: string = "UTC"
): string {
    if (!current || !baseISO) return "—";
    const base = new Date(baseISO);
    const c = new Date(current);
    if (isNaN(base.getTime()) || isNaN(c.getTime())) return "—";

    const combinedUTC = new Date(
        Date.UTC(
            base.getUTCFullYear(),
            base.getUTCMonth(),
            base.getUTCDate(),
            //7c.getUTCHours(),
            // c.getUTCMinutes(),
            0,
            0
        )
    );

    return combinedUTC.toLocaleString(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
        //hour: "2-digit",
        //minute: "2-digit",
        hour12: false,
        timeZone,
    });
}

export const toNiceDateShort = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
        month: 'short',
        day: '2-digit',
    });


export const toNiceDateLong = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
    });


export const toIsoUtc = (d: string | Date) => {
    const dd = d instanceof Date ? d : new Date(d);
    // Force to UTC midnight → "YYYY-MM-DDT00:00:00.000Z"
    return new Date(Date.UTC(dd.getFullYear(), dd.getMonth(), dd.getDate())).toISOString();
};


export const toMidnightUTC = (d: Date) =>
    new Date(
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0),
    );

/** Return full ISO with trailing Z, e.g. 2025-07-20T00:00:00Z */
export const toIsoZ = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(
        d.getUTCHours(),
    )}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}Z`;
};

export const formatISO = (d: string | Date): string => {
    const date = d instanceof Date ? d : new Date(d); // ensure we have a Date

    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.00Z`;
};
