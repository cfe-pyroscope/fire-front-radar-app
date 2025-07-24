import React, { useState, useRef, useEffect } from "react";
import { Popover, Text, ActionIcon } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import '../css/ByModeInfoPopover.css';

const ByModeInfoPopover: React.FC = () => {
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
        return () => document.removeEventListener("mousedown", handleClickOutside);
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
                        aria-label="Toggle mode explanation"
                        color="#495057"
                    >
                        <IconInfoCircle size={18} />
                    </ActionIcon>
                </Popover.Target>
                <Popover.Dropdown>
                    <Text size="xs">
                        <strong>By Date:</strong> Select a valid date and view forecast steps relative to that day.<br /><br />
                        <strong>By Forecast:</strong> Select a forecast initialization time, then scroll through all predicted times for that forecast.
                    </Text>
                </Popover.Dropdown>
            </Popover>
        </div>
    );
};

export default ByModeInfoPopover;
