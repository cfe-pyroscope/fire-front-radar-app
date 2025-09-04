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

