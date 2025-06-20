import React from "react";
import { Switch } from "@mantine/core";
import "../css/IndexToggle.css";

interface IndexToggleProps {
    currentIndex: "fopi" | "pof";
    onToggle: (newIndex: "fopi" | "pof") => void;
}

const IndexToggle: React.FC<IndexToggleProps> = ({ currentIndex, onToggle }) => {
    const isFopi = currentIndex === "fopi";

    const handleChange = () => {
        const newIndex = isFopi ? "pof" : "fopi";
        onToggle(newIndex);
    };

    return (
        <div className="index-toggle-container">
            <Switch
                checked={isFopi}
                onChange={handleChange}
                size="md"
                color="orange"
                label={isFopi ? "FOPI" : "POF"}
            />
        </div>
    );
};

export default IndexToggle;
