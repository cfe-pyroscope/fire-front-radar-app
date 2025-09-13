import HeatmapOverlay from "./HeatmapOverlay";


interface HeatmapControllerProps {
    indexName: "fopi" | "pof";
    baseTime: string;                      // ISO base time currently selected
    selectedForecastTime: string;          // ISO forecast_time currently selected
    mode: "by_date" | "by_forecast";
    onHeatmapLoadingChange?: (loading: boolean) => void;
    onScaleChange?: (scale: { vmin: number; vmax: number }) => void;
}


const HeatmapController: React.FC<HeatmapControllerProps> = ({
    indexName,
    baseTime,
    selectedForecastTime,
    mode,
    onHeatmapLoadingChange,
    onScaleChange,
}) => {

    return (
        <HeatmapOverlay
            key={`${indexName}-${baseTime}-${selectedForecastTime}`}
            indexName={indexName}
            base={baseTime}
            forecastTime={selectedForecastTime}
            mode={mode}
            onLoadingChange={onHeatmapLoadingChange}
            onScaleChange={(scale) => {
                if (scale) onScaleChange?.(scale); // ignore null
            }}
        />
    );
};

export default HeatmapController;
