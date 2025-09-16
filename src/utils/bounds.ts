/** Formats a bounding box (EPSG:4326) as a readable SW → NE coordinate string. */
export function formatBoundingBox(
    geo?: [number, number, number, number] | null,
    bbox3857?: string | null,
    digits = 2
): string {
    const dms = (v: number, pos: string, neg: string) =>
        `${Math.abs(v).toFixed(digits)}°${v >= 0 ? pos : neg}`;

    if (Array.isArray(geo) && geo.length === 4) {
        const [minLon, minLat, maxLon, maxLat] = geo;
        return `(SW → NE) ${dms(minLat, " N", " S")}, ${dms(minLon, " E", " W")} → ${dms(
            maxLat,
            " N",
            " S"
        )}, ${dms(maxLon, " E", " W")}`;
    }

    if (bbox3857) return ""; // Not supported yet

    return "—";
}
