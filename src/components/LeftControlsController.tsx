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
    isAreaSelected,
}) => {
    const canShowTooltip = Boolean(baseTime && forecastTime);

    const [areaSelectedLocal, setAreaSelectedLocal] = useState(!!isAreaSelected);
    const [clearedByReset, setClearedByReset] = useState(false);

    const handleSelectBounds = useCallback(
        (b: LatLngBounds) => {
            onDrawComplete(b);
            setAreaSelectedLocal(true);
            setClearedByReset(false);
            // tell Reset button a user-initiated selection occurred
            window.dispatchEvent(new CustomEvent('ffr:reset:enable'));
        },
        [onDrawComplete]
    );

    function ResetEnableBridge() {
        React.useEffect(() => {
            const enable = () => {
                // piggyback the mechanism you already use to enable Reset
                window.dispatchEvent(new CustomEvent('ffr:reset:enable'));
            };
            window.addEventListener('ffr:charts:opened', enable);
            window.addEventListener('ffr:charts:closed', enable);
            return () => {
                window.removeEventListener('ffr:charts:opened', enable);
                window.removeEventListener('ffr:charts:closed', enable);
            };
        }, []);
        return null;
    }

    useEffect(() => {
        const onClearArea = () => setAreaSelectedLocal(false);
        window.addEventListener("clear-area-selection", onClearArea);
        return () => window.removeEventListener("clear-area-selection", onClearArea);
    }, []);

    useEffect(() => {
        const markCleared = () => setClearedByReset(true);
        window.addEventListener("ffr:charts:disable", markCleared);
        return () => window.removeEventListener("ffr:charts:disable", markCleared);
    }, []);

    useEffect(() => {
        const disableCharts = () => setAreaSelectedLocal(false);
        window.addEventListener("ffr:charts:disable", disableCharts);
        return () => window.removeEventListener("ffr:charts:disable", disableCharts);
    }, []);

    useEffect(() => {
        const unmark = () => setClearedByReset(false);
        window.addEventListener('ffr:reset:enable', unmark);
        window.addEventListener('ffr:charts:opened', unmark);
        window.addEventListener('ffr:charts:closed', unmark);
        return () => {
            window.removeEventListener('ffr:reset:enable', unmark);
            window.removeEventListener('ffr:charts:opened', unmark);
            window.removeEventListener('ffr:charts:closed', unmark);
        };
    }, []);

    useEffect(() => {
        if (typeof isAreaSelected === 'boolean') {
            setAreaSelectedLocal(isAreaSelected);
        }
    }, [isAreaSelected]);

    const baseSelected =
        typeof isAreaSelected === 'boolean' ? isAreaSelected : areaSelectedLocal;

    // If reset was pressed, force-disable charts regardless of prop/local
    const areaSelected = baseSelected && !clearedByReset;

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

            <ResetEnableBridge />
            <ResetViewControl />

            <ChartSwiperControl onClick={onOpenCharts} disabled={!areaSelected} />

            <DownloadControl />

        </>
    );
};

export default LeftControlsController;