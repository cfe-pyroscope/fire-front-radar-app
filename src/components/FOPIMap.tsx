import { Box, Slider, Text } from '@mantine/core';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { DatePicker } from '@mantine/dates';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import { useState, useEffect } from 'react';
import { fetchFOPI } from '../api/client';
import dayjs from '../utils/dayjs';

import L from 'leaflet';

// Icona di default per il marker
const defaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});

export default function FOPIMap() {
    const [baseDate, setBaseDate] = useState<Date | null>(new Date());
    const [leadHours, setLeadHours] = useState<number>(0);
    const [markerData, setMarkerData] = useState<{ lat: number; lon: number } | null>(null);

    function getValidTime(base: Date | null, leadHours: number): string | null {
        if (!base) return null;
        const valid = dayjs(base).add(leadHours, 'hour').utc();
        return valid.toISOString();
    }

    useEffect(() => {
        const validTime = getValidTime(baseDate, leadHours);
        if (!baseDate || !validTime) return;

        const baseISO = dayjs(baseDate).utc().toISOString();

        fetchFOPI(baseISO, leadHours)
            .then((data) => {
                console.log('Received FOPI data:', data);
                if (data.location) {
                    setMarkerData({ lat: data.location[0], lon: data.location[1] });
                }
            })
            .catch((err) => {
                console.error('Error fetching FOPI data:', err);
                setMarkerData(null);
            });
    }, [baseDate, leadHours]);

    return (
        <Box p="md">
            <DatePicker
                label="Base time"
                value={baseDate}
                onChange={setBaseDate}
                nextIcon={<IconChevronRight size={16} />}
                previousIcon={<IconChevronLeft size={16} />}
            />

            <Text mt="md">Lead time (hours): {leadHours}</Text>
            <Slider
                min={0}
                max={72}
                step={3}
                value={leadHours}
                onChange={setLeadHours}
                marks={[
                    { value: 0, label: '0h' },
                    { value: 24, label: '24h' },
                    { value: 48, label: '48h' },
                    { value: 72, label: '72h' },
                ]}
            />

            <Box mt="xl" style={{ height: 500 }}>
                <MapContainer center={[0, 0]} zoom={2} style={{ height: '100%' }}>
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution="&copy; OpenStreetMap contributors"
                    />
                    {markerData && (
                        <Marker
                            position={[markerData.lat, markerData.lon]}
                            icon={defaultIcon}
                        />
                    )}
                </MapContainer>
            </Box>
        </Box>
    );
}
