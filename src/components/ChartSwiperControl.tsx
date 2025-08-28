import { IconChartBar } from "@tabler/icons-react";
import "../css/ChartSwiperControl.css";

type Props = {
    title?: string;
    className?: string;
    onClick?: () => void;
};

export default function ChartSwiperControl({
    title = "View charts for the selected area",
    className = "",
    onClick,
}: Props) {
    return (
        <div
            className={`chart-swiper-button ${className}`}
            title={title}
            aria-label={title}
            onClick={onClick}
        >
            <span className="chart-swiper-content">
                <IconChartBar size={18} style={{ marginTop: 6, marginLeft: 2 }} />
            </span>
        </div>
    );
}
