import React, { useState, useEffect, useRef } from "react";
import { Popover, Text, ActionIcon } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import '../css/IndexInfoPopover.css';

const IndexInfoPopover: React.FC = () => {
    const [opened, setOpened] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                popoverRef.current &&
                !popoverRef.current.contains(event.target as Node)
            ) {
                setOpened(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    return (
        <div ref={popoverRef}>
            <Popover
                opened={opened}
                onClose={() => setOpened(false)}
                withArrow
                position="bottom-end"
                shadow="md"
                width={260}
            >
                <Popover.Target>
                    <ActionIcon
                        variant="subtle"
                        onClick={() => setOpened((o) => !o)}
                        aria-label="Index explanation"
                        color="#495057"
                    >
                        <IconInfoCircle size={18} />
                    </ActionIcon>
                </Popover.Target>
                <Popover.Dropdown>
                    <Text size="xs">
                        <strong>POF</strong>: Probability of Fire — The likelihood that at least one active fire will be detected within a 9 km grid, based on 17 variables (including weather, soil, vegetation, etc.). Expressed as a value between 0 and 1, representing the observed probability as determined by a machine learning model.<br /><br /><strong>FOPI</strong>: Fire Occurrence Prediction Index — The probability of fire ignition, based on the availability of fuel (biomass) and weather conditions. Expressed as a value between 0 and 1, interpreted as the likelihood of ignition under similar past conditions.
                    </Text>
                </Popover.Dropdown>
            </Popover>
        </div>
    );
};

export default IndexInfoPopover;
