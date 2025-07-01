export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8090";
export const INITIAL_MAP_CENTER: [number, number] = [32, 2];
export const INITIAL_MAP_ZOOM = 2.5;
export const INITIAL_MAP_BOUNDS: [[number, number], [number, number]] = [
    [-85, -180],
    [85, 180],
];
