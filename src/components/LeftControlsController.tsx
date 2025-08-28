// src/components/LeftControlsController.tsx
import React from "react";
import { LatLngBounds } from "leaflet";

import LocationSearch from "./LocationSearch";
import ResetViewControl from "./ResetViewControl";
import DrawControl from "./DrawControl";
import DownloadControl from "./DownloadControl";
import TooltipControl from "./TooltipControl";
import "../css/LeftControlsController.css";

interface Props {
    onDrawComplete: (bounds: LatLngBounds) => void;
    indexName: "pof" | "fopi";
    mode: "by_date" | "by_forecast";
    baseTime: string | null;
    forecastTime: string | null;
}

/**
 * Groups the "left/top-left" Leaflet controls...
 */
const LeftControlsController: React.FC<Props> = ({
    onDrawComplete,
    indexName,
    mode,
    baseTime,
    forecastTime,
}) => {
    const canShowTooltip = Boolean(baseTime && forecastTime);

    return (
        <>
            <LocationSearch />
            <ResetViewControl />
            <DrawControl onDrawComplete={onDrawComplete} />
            <DownloadControl />
            {canShowTooltip && (
                <TooltipControl
                    indexName={indexName}
                    baseTime={baseTime as string}
                    forecastTime={forecastTime as string}
                    mode={mode}
                />
            )}
        </>
    );
};

export default LeftControlsController;
