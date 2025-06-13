import { Box, Slider, Text } from '@mantine/core';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { DatePicker } from '@mantine/dates';
import {
    ImageOverlay,
    FeatureGroup,
    MapContainer,
    Marker,
    Popup,
    TileLayer,
    useMap
} from 'react-leaflet';
import { useState, useEffect } from 'react';
import { fetchFOPI } from '../api/client';
import dayjs from '../utils/dayjs';
import 'leaflet-draw';  // Importa solo una volta nel progetto
import L from 'leaflet';


// Icona di default per il marker
const defaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});

export default function FOPIMap() {
    const [baseDate, setBaseDate] = useState<Date | null>(
        new Date(Date.UTC(2024, 11, 1)) // 1 dicembre 2024 (mesi da 0 a 11)
    );

    const [leadHours, setLeadHours] = useState<number>(0);
    const [markerData, setMarkerData] = useState<{
        lat: number;
        lon: number;
        valid_time: string;
    } | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [bounds, setBounds] = useState<[[number, number], [number, number]] | null>(null);
    const [selectedBounds, setSelectedBounds] = useState<L.LatLngBounds | null>(null);


    function getBaseMidnightUTC(date: Date | null): string | null {
        if (!date) return null;

        const year = date.getUTCFullYear();
        const month = date.getUTCMonth();
        const day = date.getUTCDate();

        const midnightUTC = new Date(Date.UTC(year, month, day, 0, 0, 0));
        return midnightUTC.toISOString();
    }

    function CenterMap({ lat, lon }: { lat: number; lon: number }) {
        const map = useMap();
        useEffect(() => {
            map.setView([lat, lon], 6);
        }, [lat, lon, map]);
        return null;
    }

    // Uplaod bounds just 1 time
    useEffect(() => {
        if (bounds) return;
        fetch('http://127.0.0.1:8090/bounds')
            .then((res) => res.json())
            .then((data) => {
                const b: [[number, number], [number, number]] = [
                    [data.lat_min, data.lon_min],
                    [data.lat_max, data.lon_max]
                ];
                setBounds(b);
            })
            .catch((err) => console.error('Error fetching bounds:', err));
    }, [bounds]);

    function DrawControl({ onRectangleDrawn }: { onRectangleDrawn: (bounds: L.LatLngBounds) => void }) {
        const map = useMap();

        useEffect(() => {
            const drawnItems = new L.FeatureGroup();
            map.addLayer(drawnItems);

            const drawControl = new L.Control.Draw({
                draw: {
                    polygon: false,
                    polyline: false,
                    circle: false,
                    marker: false,
                    circlemarker: false,
                    rectangle: true
                },
                edit: {
                    featureGroup: drawnItems
                }
            });

            map.addControl(drawControl);

            map.on(L.Draw.Event.CREATED, function (event: any) {
                const layer = event.layer;
                if (event.layerType === 'rectangle') {
                    drawnItems.clearLayers(); // solo uno per volta
                    drawnItems.addLayer(layer);
                    const bounds = layer.getBounds();
                    console.log("🔵 Grezzi bounds.getSouthWest():", bounds.getSouthWest());
                    console.log("🟢 Grezzi bounds.getNorthEast():", bounds.getNorthEast());
                    map.fitBounds(bounds); // centra sulla selezione
                    onRectangleDrawn(bounds);
                }
            });



            return () => {
                map.removeControl(drawControl);
            };
        }, [map, onRectangleDrawn]);

        return null;
    }

    useEffect(() => {
        if (!selectedBounds || !baseDate) return;

        const sw = selectedBounds.getSouthWest();
        const ne = selectedBounds.getNorthEast();

        console.log("🧭 sw:", sw);
        console.log("🧭 ne:", ne);

        const lat_min = Math.min(sw.lat, ne.lat);
        const lat_max = Math.max(sw.lat, ne.lat);
        const lon_min = Math.min(sw.lng, ne.lng);
        const lon_max = Math.max(sw.lng, ne.lng);

        if ((lat_max - lat_min) < 0.05 || (lon_max - lon_min) < 0.05) {
            console.warn("🚫 Bounding box troppo piccolo, seleziona un'area più ampia");
            return;
        }

        const bbox = [lat_min, lon_min, lat_max, lon_max];
        const baseISO = getBaseMidnightUTC(baseDate);
        if (!baseISO) return;

        const url = `http://127.0.0.1:8090/heatmap/image?base=${baseISO}&lead=${leadHours}&bbox=${bbox.join(',')}`;

        console.log("✅ Heatmap URL:", url);
        console.log("✅ Normalized bounds:", [[lat_min, lon_min], [lat_max, lon_max]]);

        setImageUrl(url);
        setBounds([
            [lat_min, lon_min],
            [lat_max, lon_max],
        ]);
    }, [selectedBounds, baseDate, leadHours]);




    // Update image and marker
    useEffect(() => {
        if (!selectedBounds || !baseDate) return;

        const sw = selectedBounds.getSouthWest();
        const ne = selectedBounds.getNorthEast();

        const lat_min = Math.min(sw.lat, ne.lat);
        const lat_max = Math.max(sw.lat, ne.lat);
        const lon_min = Math.min(sw.lng, ne.lng);
        const lon_max = Math.max(sw.lng, ne.lng);

        // Proteggi da rettangoli troppo piccoli
        if (Math.abs(lat_max - lat_min) < 0.01 || Math.abs(lon_max - lon_min) < 0.01) {
            console.warn("🚫 Bounding box troppo piccolo, seleziona un'area più ampia");
            return;
        }

        const bbox = [lat_min, lon_min, lat_max, lon_max];


        const baseISO = getBaseMidnightUTC(baseDate);
        if (!baseISO) return;


        setImageUrl(`http://127.0.0.1:8090/heatmap/image?base=${baseISO}&lead=${leadHours}&bbox=${bbox.join(',')}`);
        setBounds([
            [lat_min, lon_min],
            [lat_max, lon_max]
        ]);


        fetchFOPI(baseISO, leadHours)
            .then((data) => {
                if (data.location) {
                    setMarkerData({
                        lat: data.location[0],
                        lon: data.location[1],
                        valid_time: data.valid_time,
                    });
                }
            })
            .catch((err) => {
                console.error('Error fetching FOPI data:', err);
                setMarkerData(null);
            });

    }, [selectedBounds, baseDate, leadHours]);


    return (
        <Box p="md">
            <DatePicker
                label="Base time"
                value={baseDate}
                onChange={setBaseDate}
                minDate={new Date(Date.UTC(2024, 11, 1))} // dicembre = 11
                maxDate={new Date(Date.UTC(2024, 11, 1))}
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
                <MapContainer center={[28, 6]} zoom={5} style={{ height: '100%' }}>
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution="&copy; OpenStreetMap contributors"
                    />
                    {imageUrl && bounds && (
                        <ImageOverlay url={imageUrl} bounds={bounds} opacity={0.6} />
                    )}
                    {/*                     {markerData && (
                        <>
                            <Marker
                                position={[markerData.lat, markerData.lon]}
                                icon={defaultIcon}
                            >
                                <Popup>
                                    <Text size="sm">
                                        Valid time:<br />
                                        {markerData.valid_time}
                                    </Text>
                                </Popup>
                            </Marker>
                            {markerData && selectedBounds === null && (
                                <CenterMap lat={markerData.lat} lon={markerData.lon} />
                            )}
                        </>
                    )} */}
                    <DrawControl onRectangleDrawn={(bounds) => {
                        console.log('Bounds selezionati:', bounds.toBBoxString());
                        setSelectedBounds(bounds);
                    }} />
                </MapContainer>
            </Box>
        </Box>
    );
}
