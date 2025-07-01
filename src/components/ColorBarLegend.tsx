import React from "react";
import "../css/ColorBarLegend.css";

interface Props {
    vmin: number;
    vmax: number;
}

const ColorBarLegend: React.FC<Props> = ({ vmin, vmax }) => {
    const colors = ["#00000000", "#fff7ec", "#fee8c8", "#fdd49e", "#fdbb84",
        "#fc8d59", "#ef6548", "#d7301f", "#b30000", "#7f0000"]

    const displayVmin = vmin.toFixed(2) === "0.00" ? "0" : vmin.toFixed(2);
    const displayVmax = vmax.toFixed(2);

    return (
        <div className="colorbar-legend">
            <div className="colorbar">
                {colors.map((color, i) => (
                    <div
                        key={i}
                        className="color-segment"
                        style={{ backgroundColor: color }}
                    />
                ))}
            </div>
            <div className="labels">
                <span>{displayVmin}</span>
                <span>{displayVmax}</span>
            </div>
        </div>
    );
};

export default ColorBarLegend;
