import { IconChartBar } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import "../css/ChartSwiperControl.css";

type Props = {
    title?: string;
    className?: string;
    onClick?: () => void;
    disabled?: boolean;
};

export default function ChartSwiperControl({
    title = "View charts for the selected area",
    className = "",
    onClick,
    disabled = false,
}: Props) {

    // Disable via reset (chart-clear), re-enable when parent says it's allowed
    const [forceDisabled, setForceDisabled] = useState(false);

    useEffect(() => {
        const handleClear = () => setForceDisabled(true);
        window.addEventListener("chart-clear", handleClear);
        return () => window.removeEventListener("chart-clear", handleClear);
    }, []);

    // When parent says "not disabled" (i.e., an area is selected), lift our forced disable
    useEffect(() => {
        if (!disabled) setForceDisabled(false);
    }, [disabled]);

    const isDisabled = disabled || forceDisabled;

    const computedTitle = isDisabled
        ? "Select an area on the map to view charts"
        : title;

    return (
        <div
            className={`chart-swiper-button ${isDisabled ? "is-disabled" : ""} ${className}`}
            title={computedTitle}
            aria-label={computedTitle}
            aria-disabled={isDisabled}
            role="button"
            tabIndex={isDisabled ? -1 : 0}
            onClick={isDisabled ? undefined : onClick}
            onKeyDown={
                isDisabled
                    ? undefined
                    : (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onClick?.();
                        }
                    }
            }
        >
            <span className="chart-swiper-content">
                <IconChartBar size={18} style={{ marginTop: 6, marginLeft: 2 }} />
            </span>
        </div>
    );
}
