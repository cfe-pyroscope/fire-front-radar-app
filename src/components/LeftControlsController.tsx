import React, { useCallback, useEffect, useState } from "react";
import L, { LatLngBounds } from "leaflet";
import { useMap } from "react-leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import { IconMapPin } from "@tabler/icons-react";

import AreaSelect from "./AreaSelect";
import ChartSwiperControl from "./ChartSwiperControl";
import DownloadControl from "./DownloadControl";
import LocationSearch from "./LocationSearch";
import ResetViewControl from "./ResetViewControl";
import TooltipControl from "./TooltipControl";
import PinSelect from "./PinSelect";

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

const PinToggleControl: React.FC<{
    active: boolean;
    onToggle: () => void;
    position?: L.ControlPosition;
}> = ({ active, onToggle, position = "topleft" }) => {
    const map = useMap();

    // keep refs to avoid re-creating on active changes
    const ctrlRef = React.useRef<L.Control | null>(null);
    const btnRef = React.useRef<HTMLAnchorElement | null>(null);

    // create control once
    useEffect(() => {
        if (!map) return;

        const Control = L.Control.extend({
            onAdd() {
                const container = L.DomUtil.create(
                    "div",
                    "leaflet-bar leaflet-control pin-control"
                );

                const btn = L.DomUtil.create(
                    "a",
                    "maptool-pin",
                    container
                ) as HTMLAnchorElement;
                btn.href = "#";
                btn.title = "Drop a pin";
                btnRef.current = btn;

                btn.innerHTML = renderToStaticMarkup(
                    <IconMapPin size={18} stroke={1.75} style={{ verticalAlign: "middle" }} />
                );

                L.DomEvent.disableClickPropagation(container);

                L.DomEvent.on(btn, "click", (e: any) => {
                    L.DomEvent.stop(e);
                    onToggle();
                    return false;
                });

                return container;
            },
        });

        const ctrl = new Control({ position });
        ctrlRef.current = ctrl;
        map.addControl(ctrl);

        return () => {
            map.removeControl(ctrl);
            ctrlRef.current = null;
            btnRef.current = null;
        };
    }, [map, position, onToggle]);


    useEffect(() => {
        const btn = btnRef.current;
        if (!btn) return;
        if (active) {
            btn.classList.add("active");
            btn.title = "Exit pin mode";
        } else {
            btn.classList.remove("active");
            btn.title = "Drop a pin";
        }
    }, [active]);

    return null;
};

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

    const [pinMode, setPinMode] = useState(false);
    const togglePinMode = useCallback(() => setPinMode((v) => !v), []);
    const handleSelectBounds = useCallback(
        (b: LatLngBounds) => {
            onDrawComplete(b);
        },
        [onDrawComplete]
    );

    useEffect(() => {
        const turnOff = () => setPinMode(false);
        window.addEventListener("pin-clear", turnOff);
        return () => window.removeEventListener("pin-clear", turnOff);
    }, []);



    return (
        <>
            <LocationSearch onSelectBounds={onDrawComplete} />
            <AreaSelect onDrawComplete={onDrawComplete} />

            <PinToggleControl active={pinMode} onToggle={togglePinMode} />
            <PinSelect enabled={pinMode} onSelectBounds={handleSelectBounds} />

            <ResetViewControl />

            <DownloadControl />

            {canShowTooltip && (
                <TooltipControl
                    indexName={indexName}
                    baseTime={baseTime as string}
                    forecastTime={forecastTime as string}
                    mode={mode}
                />
            )}

            <ChartSwiperControl onClick={onOpenCharts} disabled={!isAreaSelected} />
        </>
    );
};

export default LeftControlsController;
