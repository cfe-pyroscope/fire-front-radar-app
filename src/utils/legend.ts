export type IndexType = 'pof' | 'fopi' | (string & {});

// Label roles to style differently in the UI 
export type LegendLabelRole = 'min' | 'max' | 'mid' | 'critical';

export interface LegendLabel {
    key: string;
    value: number;
    // Percent from 0–100 across the scale (left-to-right). Omitted for min/max.
    positionPct?: number;
    role: LegendLabelRole;
    // Whether to visually emphasize (e.g., bold/red) 
    emphasis?: boolean;
}

/**
 * Number formatting extracted from component.
 * Keeps index-aware behavior but stays UI-agnostic.
 */
export function formatLegendValue(value: number, index: IndexType): string {
    if (value === 0) return '0';

    // For POF (small values), use more decimal places
    if (index.toLowerCase() === 'pof' && value < 0.1) {
        return value.toFixed(3);
    }

    // For FOPI or larger values, use 2 decimal places
    if (value < 0.01) {
        return value.toFixed(3);
    } else if (value < 1) {
        return value.toFixed(2);
    } else {
        return value.toFixed(1);
    }
}

// Returns a description string for the legend, based on index type.
export function getLegendDescription(index: IndexType): string {
    switch (index.toLowerCase()) {
        case 'pof':
            return '≥ 0.05 extreme fire risk';
        case 'fopi':
            return '≥ 0.8 extreme fire risk';
        default:
            return 'Risk levels from low to extreme';
    }
}

// eturns a critical threshold (if any) for the given index.
export function getCriticalThreshold(index: IndexType): number | null {
    switch (index.toLowerCase()) {
        case 'pof':
            return 0.05;
        // Add more index-specific thresholds as needed
        default:
            return null;
    }
}


// Compute intermediate labels (data only) for a continuous legend.

export function computeLegendLabels(
    vmin: number,
    vmax: number,
    index: IndexType
): LegendLabel[] {
    const labels: LegendLabel[] = [];

    // Always include min/max (positions left=0%, right=100% if you want to use them)
    labels.push({ key: 'min', value: vmin, role: 'min', positionPct: 0 });
    labels.push({ key: 'max', value: vmax, role: 'max', positionPct: 100 });

    // Midpoint
    const midValue = (vmin + vmax) / 2;
    labels.push({ key: 'mid', value: midValue, role: 'mid', positionPct: 50 });

    // Index-specific critical thresholds (e.g., POF = 0.05) if inside range
    const critical = getCriticalThreshold(index);
    if (
        critical !== null &&
        vmax !== vmin // avoid divide-by-zero
    ) {
        const positionPct = ((critical - vmin) / (vmax - vmin)) * 100;
        // Only show if reasonably within display range (10%–90%)
        if (positionPct >= 10 && positionPct <= 90) {
            labels.push({
                key: 'critical',
                value: critical,
                role: 'critical',
                positionPct,
                emphasis: true,
            });
        }
    }

    return labels;
}


export type PaletteName = 'official' | 'official_5' | 'eecharts';

const PALETTES: Record<PaletteName, string[]> = {
    official: [
        '#00000000',
        '#fff7ec',
        '#fee8c8',
        '#fdd49e',
        '#fdbb84',
        '#fc8d59',
        '#ef6548',
        '#d7301f',
        '#b30000',
        '#7f0000',
    ],
    official_5: [
        '#fff7ec',
        '#fdbb84',
        '#ef6548',
        '#d7301f',
        '#7f0000',
    ],
    eecharts: [
        '#00000000',
        '#E3E8DA',
        '#C2DBC0',
        '#FFBF00',
        '#CC9A03',
        '#C45B2C',
        '#AD3822',
        '#951517',
        '#3A072C',
        '#0F0A0A',
    ],
};

export function getPalette(name: PaletteName = 'official', { includeTransparent = true } = {}): string[] {
    const raw = PALETTES[name] ?? PALETTES.official;
    return includeTransparent ? raw.slice() : raw.slice(1); // default: skip transparent color
}
