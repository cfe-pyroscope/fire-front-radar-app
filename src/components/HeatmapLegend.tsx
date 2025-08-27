import React from "react";
import "../css/HeatmapLegend.css";

interface Props {
    vmin: number;
    vmax: number;
    index?: string;
}

const HeatmapLegend: React.FC<Props> = ({ vmin, vmax, index = "" }) => {
    const colors = ["#00000000", "#fff7ec", "#fee8c8", "#fdd49e", "#fdbb84",
        "#fc8d59", "#ef6548", "#d7301f", "#b30000", "#7f0000"];

    // Format numbers based on their magnitude and index type
    const formatValue = (value: number): string => {
        if (value === 0) return "0";

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
    };

    const displayVmin = formatValue(vmin);
    const displayVmax = formatValue(vmax);

    // Calculate intermediate values for better legend
    const getIntermediateLabels = (): JSX.Element[] => {
        const labels: JSX.Element[] = [];

        // Always show min and max
        labels.push(<span key="min">{displayVmin}</span>);

        // Add intermediate values based on index type
        if (index.toLowerCase() === 'pof') {
            // For POF, always show the critical 0.05 threshold
            const criticalThreshold = 0.05;

            // Calculate position of 0.05 threshold on the scale
            const position = ((criticalThreshold - vmin) / (vmax - vmin)) * 100;

            // Only show the threshold if it's within a reasonable display range
            if (position >= 10 && position <= 90) {
                labels.push(
                    <span
                        key="critical"
                        className="critical-threshold"
                        style={{
                            position: 'absolute',
                            left: `${position}%`,
                            transform: 'translateX(-50%)',
                            color: '#d7301f',
                            fontWeight: 'bold'
                        }}
                    >
                        {formatValue(criticalThreshold)}
                    </span>
                );
            }

            // Add middle value between min and max (not involving 0.05)
            const midValue = (vmin + vmax) / 2;
            labels.push(
                <span
                    key="mid"
                    className="mid-value"
                    style={{
                        position: 'absolute',
                        left: '50%',
                        transform: 'translateX(-50%)'
                    }}
                >
                    {formatValue(midValue)}
                </span>
            );
        } else {
            // Default: just show middle value
            const midValue = (vmin + vmax) / 2;
            labels.push(
                <span
                    key="mid"
                    style={{
                        position: 'absolute',
                        left: '50%',
                        transform: 'translateX(-50%)'
                    }}
                >
                    {formatValue(midValue)}
                </span>
            );
        }

        labels.push(<span key="max">{displayVmax}</span>);

        return labels;
    };

    const getLegendDescription = (): string => {
        switch (index.toLowerCase()) {
            case 'pof':
                return '≥ 0.05 severe fire risk';
            case 'fopi':
                return 'Increased fire risk';
            default:
                return 'Risk levels from low to high';
        }
    };

    return (
        <div className="colorbar-legend">
            <div className="legend-header">
                <div className="legend-description">{getLegendDescription()}</div>
            </div>

            <div className="colorbar">
                {colors.slice(1).map((color, i) => ( // Skip transparent color
                    <div
                        key={i}
                        className="color-segment"
                        style={{ backgroundColor: color }}
                    />
                ))}
            </div>

            <div className="labels" style={{ position: 'relative' }}>
                {getIntermediateLabels()}
            </div>

            {/* Show scaling info for POF */}
            {/*             {index.toLowerCase() === 'pof' && (
                <div className="scaling-info">
                    <small>
                        Percentile-based scaling for enhanced contrast
                    </small>
                </div>
            )} */}
        </div>
    );
};

export default HeatmapLegend;