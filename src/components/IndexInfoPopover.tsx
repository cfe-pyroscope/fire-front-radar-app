// src/components/IndexInfoPopover.tsx
import React, { useState } from "react";
import { Popover, Text, ActionIcon } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";

const IndexInfoPopover: React.FC = () => {
    const [opened, setOpened] = useState(false);

    return (
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
                    <strong>POF</strong>: Probability of Fire — statistical likelihood of fire based on data.<br />
                    <strong>FOPI</strong>: Fire Occurrence Prediction Index — predicts fire risk based on conditions.
                </Text>
            </Popover.Dropdown>
        </Popover>
    );
};

export default IndexInfoPopover;
