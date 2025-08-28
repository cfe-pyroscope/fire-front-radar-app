import { Drawer, Box, Paper, Stack, ActionIcon, rem } from "@mantine/core";
import { Carousel } from "@mantine/carousel";
import { IconX } from "@tabler/icons-react";
import "@mantine/carousel/styles.css";

type Props = {
    opened: boolean;
    onClose: () => void;
    size?: number | string;
};

export default function SideChartSwiper({ opened, onClose, size = 380 }: Props) {
    const slides = Array.from({ length: 5 }, (_, i) => i + 1);

    return (
        <Drawer
            opened={opened}
            onClose={onClose}
            position="left"
            size={size}
            withCloseButton={false}
            padding="sm"
            overlayProps={{ opacity: 0 }} // transparent overlay
            styles={{
                content: {
                    backgroundColor: "transparent", // transparent drawer background
                    boxShadow: "none",
                    padding: 0,
                },
                body: {
                    height: "100%",
                    padding: 12,
                },
            }}
            zIndex={500}
        >
            {/* Close */}
            <Box pos="absolute" top={8} right={8} style={{ zIndex: 1 }}>
                <ActionIcon variant="light" aria-label="Close charts" onClick={onClose}>
                    <IconX size={16} />
                </ActionIcon>
            </Box>

            {/* Vertical swiper */}
            <Carousel
                orientation="vertical"
                height="100%"
                slideGap="md"
                withIndicators
                styles={{
                    viewport: { height: "100%", background: "transparent" },
                    container: { height: "100%" },
                    indicator: { width: rem(6), height: rem(6) },
                }}
            >
                {slides.map((n) => (
                    <Carousel.Slide key={n}>
                        {/* White slide content */}
                        <Paper shadow="md" p="md" radius="md" withBorder style={{ background: "white", minHeight: 260 }}>
                            <Stack gap="xs">
                                <strong>Chart {n}</strong>
                                {/* drop your chart here */}
                                <Box style={{ height: 200 }} />
                            </Stack>
                        </Paper>
                    </Carousel.Slide>
                ))}
            </Carousel>
        </Drawer>
    );
}
