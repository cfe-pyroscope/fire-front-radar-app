import { Drawer, Box, Paper, Stack, ActionIcon } from "@mantine/core";
import { Carousel } from "@mantine/carousel";
import { IconX } from "@tabler/icons-react";
import ChartTimeSeries from "../components/ChartTimeSeries";

import "@mantine/carousel/styles.css";
import "../css/SideChartSwiper.css";

type Props = {
    opened: boolean;
    onClose: () => void;
    size?: number | string;
    indexName?: 'pof' | 'fopi';
    bbox?: string | null; // EPSG:3857 "minX,minY,maxX,maxY" or null
};


export default function SideChartSwiper({
    opened,
    onClose,
    size,
    indexName,
    bbox
}: Props) {
    const slides = Array.from({ length: 5 }, (_, i) => i + 1);

    return (
        <Drawer
            opened={opened}
            onClose={onClose}
            position="left"
            // Size driven by CSS var; prop must still be present to avoid Mantine defaults.
            size={size ?? "var(--drawer-size)"}
            withCloseButton={false}
            padding="sm"
            overlayProps={{ opacity: 0 }}
            className="sideChartSwiper"
            styles={{
                content: { backgroundColor: "transparent", boxShadow: "none", padding: 0 },
                body: { overflow: "hidden" }, // height handled in CSS
            }}
            zIndex={500}
        >
            {/* Close */}
            <Box className="sideChartSwiper__close">
                <ActionIcon variant="light" aria-label="Close charts" onClick={onClose}>
                    <IconX size={20} />
                </ActionIcon>
            </Box>

            {/* Vertical carousel */}
            <Carousel
                orientation="vertical"
                className="sideChartSwiper__carousel"
                withIndicators
                slideGap="md"
                emblaOptions={{ align: 'start' }}
                height="100%"                  // fills Drawer body
                slideSize="var(--slide-size)"  // height of each slide
            >
                {slides.map((n) => (
                    <Carousel.Slide key={n}>
                        <Paper className="sideChartSwiper__card" withBorder>
                            <Stack className="sideChartSwiper__stack" gap="xs">
                                {n === 1 ? (
                                    <ChartTimeSeries
                                        index={indexName}
                                        bbox={bbox}
                                    />
                                ) : (
                                    <>
                                        <strong>Chart {n}</strong>
                                        <Box className="sideChartSwiper__filler" />
                                    </>
                                )}
                            </Stack>
                        </Paper>
                    </Carousel.Slide>
                ))}
            </Carousel>
        </Drawer>
    );
}
