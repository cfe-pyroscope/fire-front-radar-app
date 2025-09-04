import React from "react";
import { LatLngBounds } from "leaflet";

import LocationSearch from "./LocationSearch";
import ResetViewControl from "./ResetViewControl";
import AreaSelect from "./AreaSelect";
import DownloadControl from "./DownloadControl";
import TooltipControl from "./TooltipControl";
import ChartSwiperControl from "./ChartSwiperControl";


import "../css/LeftControlsController.css";

interface Props {
    onDrawComplete: (bounds: LatLngBounds) => void;
    indexName: "pof" | "fopi";
    mode: "by_date" | "by_forecast";
    baseTime: string | null;
    forecastTime: string | null;
    onOpenCharts?: () => void;
    isAreaSelected?: boolean;
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
    onOpenCharts,
    isAreaSelected = false,
}) => {
    const canShowTooltip = Boolean(baseTime && forecastTime);

    return (
        <>
            <LocationSearch />
            <ResetViewControl />
            <AreaSelect onDrawComplete={onDrawComplete} />
            <DownloadControl />
            {canShowTooltip && (
                <TooltipControl
                    indexName={indexName}
                    baseTime={baseTime as string}
                    forecastTime={forecastTime as string}
                    mode={mode}
                />
            )}
            <ChartSwiperControl
                onClick={onOpenCharts}
                disabled={!isAreaSelected}
            />
        </>
    );
};

export default LeftControlsController;
