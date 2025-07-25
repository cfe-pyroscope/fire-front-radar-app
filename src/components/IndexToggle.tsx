import React from "react";
import { SegmentedControl } from "@mantine/core";
import "../css/IndexToggle.css";
import IndexInfoPopover from "./IndexInfoPopover";

interface IndexToggleProps {
    currentIndex: "fopi" | "pof";
    onToggle: (newIndex: "fopi" | "pof") => void;
}

const IndexToggle: React.FC<IndexToggleProps> = ({ currentIndex, onToggle }) => {
    return (
        <div className="index-toggle-container">
            <div className="index-info-button">
                <IndexInfoPopover />
            </div>

            <SegmentedControl
                value={currentIndex}
                onChange={(value: "fopi" | "pof") => onToggle(value)}
                data={[
                    { label: "POF", value: "pof" },
                    { label: "FOPI", value: "fopi" },
                ]}
                transitionDuration={500}
                transitionTimingFunction="linear"
            />
        </div>
    );
};

export default IndexToggle;
