import React, { useCallback, useEffect, useState } from "react";
import { LatLngBounds } from "leaflet";

import AreaSelect from "./AreaSelect";
import ChartSwiperControl from "./ChartSwiperControl";
import DownloadControl from "./DownloadControl";
import LocationSearch from "./LocationSearch";
import ResetViewControl from "./ResetViewControl";
import TooltipControl from "./TooltipControl";

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


const LeftControlsController: React.FC<Props> = ({
    onDrawComplete,
    indexName,
    mode,
    baseTime,
    forecastTime,
    onOpenCharts,
}) => {
    const canShowTooltip = Boolean(baseTime && forecastTime);

    const [areaSelectedLocal, setAreaSelectedLocal] = useState(false);

    const handleSelectBounds = useCallback(
        (b: LatLngBounds) => {
            onDrawComplete(b);
            setAreaSelectedLocal(true);
            // tell Reset button a user-initiated selection occurred
            window.dispatchEvent(new CustomEvent('ffr:reset:enable'));
        },
        [onDrawComplete]
    );


    useEffect(() => {
        const onClearArea = () => setAreaSelectedLocal(false);
        window.addEventListener("clear-area-selection", onClearArea);
        return () => window.removeEventListener("clear-area-selection", onClearArea);
    }, []);


    return (
        <>
            <LocationSearch onSelectBounds={handleSelectBounds} />


            {canShowTooltip && (
                <TooltipControl
                    indexName={indexName}
                    baseTime={baseTime as string}
                    forecastTime={forecastTime as string}
                    mode={mode}
                />
            )}

            <AreaSelect onDrawComplete={handleSelectBounds} />

            <ResetViewControl />

            <ChartSwiperControl onClick={onOpenCharts} disabled={!areaSelectedLocal} />

            <DownloadControl />

        </>
    );
};

export default LeftControlsController;