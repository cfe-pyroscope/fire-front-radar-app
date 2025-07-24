import React from "react";
import { SegmentedControl } from "@mantine/core";
import ByModeInfoPopover from "./ByModeInfoPopover";
import "../css/ByModeToggle.css";

type Mode = "by_date" | "by_forecast";

interface ByModeToggleProps {
    mode: Mode;
    onToggle: (mode: Mode) => void;
}

const ByModeToggle: React.FC<ByModeToggleProps> = ({ mode, onToggle }) => (
    <div className="bymode-toggle-container">
        <div className="bymode-info-button">
            <ByModeInfoPopover />
        </div>
        <SegmentedControl
            value={mode}
            onChange={onToggle}
            data={[
                { label: "By Date", value: "by_date" },
                { label: "By Forecast", value: "by_forecast" },
            ]}
            transitionDuration={500}
            transitionTimingFunction="linear"
        />
    </div>
);

export default ByModeToggle;
