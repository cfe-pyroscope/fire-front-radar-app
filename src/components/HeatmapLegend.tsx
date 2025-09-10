import React from "react";
import "../css/HeatmapLegend.css";
import type { IndexType } from "../utils/legend";

import {
    computeLegendLabels,
    formatLegendValue,
    getLegendDescription,
    getPalette,
} from "../utils/legend";

interface Props {
    vmin: number;
    vmax: number;
    index?: IndexType;
    paletteName?: 'official' | 'eecharts';
}

const HeatmapLegend: React.FC<Props> = ({ vmin, vmax, index = "", paletteName = 'ecmwf' }) => {
    const colors = getPalette(paletteName); // already skips transparent

    const displayVmin = formatLegendValue(vmin, index);
    const displayVmax = formatLegendValue(vmax, index);
    const labels = computeLegendLabels(vmin, vmax, index);

    return (
        <div className="colorbar-legend">
            <div className="legend-header">
                <div className="legend-description">{getLegendDescription(index)}</div>
            </div>

            <div className="colorbar">
                {colors.map((color, i) => (
                    <div key={i} className="color-segment" style={{ backgroundColor: color }} />
                ))}
            </div>

            <div className="labels" style={{ position: "relative" }}>
                {/* Anchor min/max at the edges */}
                <span>{displayVmin}</span>

                {/* Render any positioned labels (mid, critical, etc.) */}
                {labels
                    .filter(l => l.role !== 'min' && l.role !== 'max')
                    .map(l => (
                        <span
                            key={l.key}
                            className={l.role === 'critical' ? 'critical-threshold' : l.role === 'mid' ? 'mid-value' : undefined}
                            style={{
                                position: 'absolute',
                                left: `${l.positionPct ?? 0}%`,
                                transform: 'translateX(-50%)',
                                fontWeight: l.emphasis ? 'bold' as const : undefined,
                            }}
                        >
                            {formatLegendValue(l.value, index)}
                        </span>
                    ))}

                <span>{displayVmax}</span>
            </div>
        </div>
    );
};

export default HeatmapLegend;