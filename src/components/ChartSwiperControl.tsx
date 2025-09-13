import { IconChartBar } from "@tabler/icons-react";
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

    const computedTitle = disabled
        ? "Select an area on the map to view charts"
        : title;

    return (
        <div
            className={`chart-swiper-button ${disabled ? "is-disabled" : ""} ${className}`}
            title={computedTitle}
            aria-label={computedTitle}
            aria-disabled={disabled}
            role="button"
            tabIndex={disabled ? -1 : 0}
            onClick={disabled ? undefined : onClick}
            onKeyDown={
                disabled
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
