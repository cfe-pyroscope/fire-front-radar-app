import { Box, Slider, Text } from '@mantine/core';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { DatePicker } from '@mantine/dates';
import { ImageOverlay, FeatureGroup, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { useState, useEffect, useRef } from 'react';
import { fetchFOPITEST } from '../api/client';
import dayjs from '../utils/dayjs';
import 'leaflet-draw';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

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
    const mapRef = useRef<L.Map | null>(null);
    const [mapSize, setMapSize] = useState<{ x: number; y: number } | null>(null);
    const drawnItemsRef = useRef<L.FeatureGroup | null>(null);

    function getBaseMidnightUTC(date: Date | null): string | null {
        if (!date) return null;

        const year = date.getUTCFullYear();
        const month = date.getUTCMonth();
        const day = date.getUTCDate();

        const midnightUTC = new Date(Date.UTC(year, month, day, 0, 0, 0));
        return midnightUTC.toISOString();
    }

    useEffect(() => {
        const interval = setInterval(() => {
            if (mapRef.current && mapRef.current.getSize().x > 0) {
                mapRef.current.invalidateSize();
                clearInterval(interval);
            }
        }, 100);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const checkSize = () => {
            if (mapRef.current) {
                const size = mapRef.current.getSize();
                setMapSize({ x: size.x, y: size.y });

                if (size.x > 0 && size.y > 0) {
                    console.log("✅ Valid map's dimensions:", size);
                } else {
                    console.warn("❌ Mappa widimensions 0, I try again...");
                    setTimeout(checkSize, 200);
                }
            }
        };

        setTimeout(checkSize, 200);
    }, []);

    // Upload bounds just 1 time
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
            // Force map to be ready
            if (!map || map.getSize().x === 0) {
                console.warn('🔄 Map not ready, retrying...');
                return;
            }

            // Crea il FeatureGroup per gestire i layer disegnati
            const drawnItems = new L.FeatureGroup();
            drawnItemsRef.current = drawnItems;
            map.addLayer(drawnItems);

            // Configura il controllo di disegno con opzioni più stabili
            const drawControl = new L.Control.Draw({
                draw: {
                    polygon: false,
                    polyline: false,
                    circle: false,
                    marker: false,
                    circlemarker: false,
                    rectangle: {
                        shapeOptions: {
                            color: '#ff0000',
                            weight: 3,
                            fillOpacity: 0.2,
                            fillColor: '#ff0000'
                        },
                        showArea: false, // Disabilita il calcolo dell'area per evitare l'errore
                        metric: false,   // Disabilita le metriche
                        repeatMode: false
                    }
                },
                edit: {
                    featureGroup: drawnItems,
                    remove: true
                }
            });

            map.addControl(drawControl);

            // Variabile per tracciare l'ultimo layer creato
            let lastCreatedLayer: L.Rectangle | null = null;

            // Gestisci l'evento di creazione - approccio principale
            const onDrawCreated = (event: L.DrawEvents.Created) => {
                console.log('🔧 Draw created event:', event);

                try {
                    const layer = event.layer as L.Rectangle;

                    if (event.layerType === 'rectangle') {
                        // Rimuovi layer precedenti
                        drawnItems.clearLayers();

                        // Aggiungi il nuovo layer
                        drawnItems.addLayer(layer);
                        lastCreatedLayer = layer;

                        // Ottieni i bounds immediatamente
                        const bounds = layer.getBounds();

                        console.log("🎯 Rectangle created - SW:", bounds.getSouthWest());
                        console.log("🎯 Rectangle created - NE:", bounds.getNorthEast());

                        const width = Math.abs(bounds.getEast() - bounds.getWest());
                        const height = Math.abs(bounds.getNorth() - bounds.getSouth());

                        console.log("📏 New area dimensions:", { width, height });

                        // Verifica che l'area sia ragionevole
                        if (width < 0.001 || height < 0.001) {
                            console.warn("🚫 Too small area. Layer removed.");
                            drawnItems.removeLayer(layer);
                            return;
                        }

                        // Chiama il callback
                        onRectangleDrawn(bounds);
                    }
                } catch (error) {
                    console.error("❌ Error handling 'draw created':", error);
                }
            };

            // Backup con timeout per catturare eventuali bounds mancanti
            const onDrawStop = (event: any) => {
                console.log('🛑 Drawing stopped:', event);

                // Timeout di sicurezza per catturare il layer se non è stato gestito da onDrawCreated
                setTimeout(() => {
                    if (!lastCreatedLayer) {
                        console.log("🔍 Search layer manually...");
                        drawnItems.eachLayer((layer: any) => {
                            if (layer instanceof L.Rectangle && layer !== lastCreatedLayer) {
                                console.log("🎯 Layer found manually:", layer);
                                const bounds = layer.getBounds();
                                console.log("🎯 Manual layer's ounds:", bounds);
                                lastCreatedLayer = layer;
                                onRectangleDrawn(bounds);
                            }
                        });
                    }
                }, 100);
            };

            // Gestisci l'editing
            const onDrawEdited = (event: L.DrawEvents.Edited) => {
                console.log('✏️ Rectangle edited:', event);
                const layers = event.layers;
                layers.eachLayer((layer) => {
                    if (layer instanceof L.Rectangle) {
                        const bounds = layer.getBounds();
                        console.log("✏️ Edited bounds:", bounds);
                        onRectangleDrawn(bounds);
                    }
                });
            };

            // Gestisci la cancellazione
            const onDrawDeleted = (event: L.DrawEvents.Deleted) => {
                console.log('🗑️ Rectangle deleted:', event);
                lastCreatedLayer = null;
                setSelectedBounds(null);
                setImageUrl(null);
            };

            // Reset quando si inizia un nuovo drawing
            const onDrawStart = (event: any) => {
                console.log('🖊️ Drawing started:', event);
                lastCreatedLayer = null;
            };

            // Aggiungi i listener con gestione degli errori
            try {
                map.on(L.Draw.Event.CREATED, onDrawCreated);
                map.on(L.Draw.Event.DRAWSTART, onDrawStart);
                map.on(L.Draw.Event.DRAWSTOP, onDrawStop);
                map.on(L.Draw.Event.EDITED, onDrawEdited);
                map.on(L.Draw.Event.DELETED, onDrawDeleted);
            } catch (error) {
                console.error("❌ Errore nell'aggiunta dei listener:", error);
            }

            // Forza l'invalidazione della size della mappa
            setTimeout(() => {
                map.invalidateSize();
                console.log('🔄 Map size invalidated after DrawControl setup');
            }, 200);

            // Cleanup
            return () => {
                try {
                    map.off(L.Draw.Event.CREATED, onDrawCreated);
                    map.off(L.Draw.Event.DRAWSTART, onDrawStart);
                    map.off(L.Draw.Event.DRAWSTOP, onDrawStop);
                    map.off(L.Draw.Event.EDITED, onDrawEdited);
                    map.off(L.Draw.Event.DELETED, onDrawDeleted);
                    map.removeControl(drawControl);
                    map.removeLayer(drawnItems);
                    drawnItemsRef.current = null;
                } catch (error) {
                    console.error("❌ Errore nel cleanup:", error);
                }
            };
        }, [map, onRectangleDrawn]);

        return null;
    }

    // Update image and marker
    useEffect(() => {
        if (!selectedBounds || !baseDate) return;

        const sw = selectedBounds.getSouthWest();
        const ne = selectedBounds.getNorthEast();

        // Assicurati che i valori siano corretti
        const lat_min = Math.min(sw.lat, ne.lat);
        const lat_max = Math.max(sw.lat, ne.lat);
        const lon_min = Math.min(sw.lng, ne.lng);
        const lon_max = Math.max(sw.lng, ne.lng);

        console.log("🎯 Bounds finali per API:", {
            lat_min, lat_max, lon_min, lon_max,
            width: lon_max - lon_min,
            height: lat_max - lat_min
        });

        // Verifica che l'area sia valida
        if (Math.abs(lat_max - lat_min) < 0.01 || Math.abs(lon_max - lon_min) < 0.01) {
            console.warn("🚫 Bounding box troppo piccolo, seleziona un'area più ampia");
            return;
        }

        const bbox = [lat_min, lon_min, lat_max, lon_max];
        const baseISO = getBaseMidnightUTC(baseDate);
        if (!baseISO) return;

        // Aggiorna l'URL dell'immagine
        const newImageUrl = `http://127.0.0.1:8090/heatmap/image?base=${baseISO}&lead=${leadHours}&bbox=${bbox.join(',')}`;
        console.log("🖼️ URL immagine generato:", newImageUrl);
        setImageUrl(newImageUrl);

        // Aggiorna i bounds per l'ImageOverlay
        setBounds([
            [lat_min, lon_min],
            [lat_max, lon_max]
        ]);

        // Fetch dei dati FOPI
        fetchFOPI(baseISO, leadHours)
            .then((data) => {
                if (data?.location?.length === 2) {
                    setMarkerData({
                        lat: data.location[0],
                        lon: data.location[1],
                        valid_time: data.valid_time,
                    });
                } else {
                    console.warn('❌ Dati non validi ricevuti da fetchFOPI:', data);
                    setMarkerData(null);
                }
            })
            .catch((err) => {
                console.error('Error fetching FOPI data:', err);
                setMarkerData(null);
            });

    }, [selectedBounds, baseDate, leadHours]);

    useEffect(() => {
        if (mapRef.current) {
            console.log('📏 useEffect: Mappa size:', mapRef.current.getSize());
        }
    }, [mapRef.current]);

    return (
        <div style={{ height: '93vh', width: '100vw', position: 'relative' }}>
            {/* Sidebar fissa a destra */}
            <div
                style={{
                    position: 'absolute',
                    top: 20,
                    right: 20,
                    width: '100%',
                    maxWidth: 300,
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    padding: '1rem',
                    borderRadius: '8px',
                    zIndex: 1000,
                    pointerEvents: 'auto',
                }}
            >
                <DatePicker
                    label="Base time"
                    value={baseDate}
                    onChange={setBaseDate}
                    minDate={new Date(Date.UTC(2024, 11, 1))}
                    maxDate={new Date(Date.UTC(2024, 11, 1))}
                    nextIcon={<IconChevronRight size={16} />}
                    previousIcon={<IconChevronLeft size={16} />}
                    style={{ marginBottom: '1rem' }}
                />

                <Text style={{ marginTop: '1rem' }}>Lead time (hours): {leadHours}</Text>
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
                    style={{ marginBottom: '1rem' }}
                />

                {/* Informazioni debug sull'area selezionata */}
                {selectedBounds && (
                    <div style={{
                        marginTop: '2rem',
                        padding: '0.5rem',
                        backgroundColor: 'rgba(0, 255, 0, 0.1)',
                        borderRadius: '4px',
                        fontSize: '12px'
                    }}>
                        <Text size="xs" weight="bold">Selected area:</Text>
                        <Text size="xs">
                            SW: {selectedBounds.getSouthWest().lat.toFixed(6)}, {selectedBounds.getSouthWest().lng.toFixed(6)}
                        </Text>
                        <Text size="xs">
                            NE: {selectedBounds.getNorthEast().lat.toFixed(6)}, {selectedBounds.getNorthEast().lng.toFixed(6)}
                        </Text>
                        <Text size="xs">
                            Width: {Math.abs(selectedBounds.getEast() - selectedBounds.getWest()).toFixed(6)}°
                        </Text>
                        <Text size="xs">
                            Height: {Math.abs(selectedBounds.getNorth() - selectedBounds.getSouth()).toFixed(6)}°
                        </Text>
                        <Text size="xs">
                            Center: {selectedBounds.getCenter().lat.toFixed(4)}, {selectedBounds.getCenter().lng.toFixed(4)}
                        </Text>

                        {/* Indicatore se l'area sembra corretta */}
                        {(Math.abs(selectedBounds.getEast() - selectedBounds.getWest()) >= 1.0 &&
                            Math.abs(selectedBounds.getNorth() - selectedBounds.getSouth()) >= 1.0) && (
                                <Text size="xs" color="green" weight="bold">
                                    ✅ Area selected correctly
                                </Text>
                            )}

                        {(Math.abs(selectedBounds.getEast() - selectedBounds.getWest()) < 1.0 ||
                            Math.abs(selectedBounds.getNorth() - selectedBounds.getSouth()) < 1.0) && (
                                <Text size="xs" color="orange" weight="bold">
                                    ⚠️ Area potentially small
                                </Text>
                            )}
                    </div>
                )}

                {/* Pulsante per reset/debug */}
                <div style={{ marginTop: '1rem' }}>
                    <button
                        onClick={() => {
                            setSelectedBounds(null);
                            setImageUrl(null);
                            if (drawnItemsRef.current) {
                                drawnItemsRef.current.clearLayers();
                            }
                            console.log('🧹 Reset completato');
                        }}
                        style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#ff6b6b',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            marginTop: '1rem'
                        }}
                    >
                        Reset Selection
                    </button>
                </div>
            </div>

            {mapSize && (
                <div
                    style={{
                        position: 'absolute',
                        top: 10,
                        left: 10,
                        zIndex: 2000,
                        background: '#fff',
                        padding: '4px 8px',
                        border: '1px solid #ccc',
                        borderRadius: 4,
                    }}
                >
                    🗺️ Map size: {mapSize.x} × {mapSize.y}
                </div>
            )}

            <MapContainer
                center={[28, 2]} // Centrato su Nord Africa per i tuoi test  
                zoom={4} // Zoom più alto per vedere meglio l'area
                style={{ height: '100%', width: '100%', zIndex: 0 }}
                whenCreated={(mapInstance) => {
                    mapRef.current = mapInstance;
                    console.log('📏 whenCreated: size immediata:', mapInstance.getSize());

                    // Forza multiple invalidazioni per assicurarsi che la mappa sia pronta
                    const forceReady = () => {
                        mapInstance.invalidateSize();
                        console.log('📏 after invalidateSize:', mapInstance.getSize());

                        // Assicurati che la proiezione sia corretta
                        const bounds = mapInstance.getBounds();
                        console.log('🌍 Initial map bounds:', bounds.toBBoxString());
                    };

                    setTimeout(forceReady, 100);
                    setTimeout(forceReady, 300);
                    setTimeout(forceReady, 500);
                }}
                // Aggiungi eventi per monitorare zoom e pan
                whenReady={() => {
                    console.log('🎯 Map is ready!');
                }}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="&copy; OpenStreetMap contributors"
                />

                {imageUrl && bounds && (
                    <ImageOverlay url={imageUrl} bounds={bounds} opacity={0.6} />
                )}

                {markerData && (
                    <Marker
                        position={[markerData.lat, markerData.lon]}
                        icon={defaultIcon}
                    >
                        <Popup>
                            <div>
                                <strong>FOPI Data</strong><br />
                                Lat: {markerData.lat}<br />
                                Lon: {markerData.lon}<br />
                                Valid Time: {markerData.valid_time}
                            </div>
                        </Popup>
                    </Marker>
                )}

                <DrawControl
                    onRectangleDrawn={(bounds) => {
                        console.log('🎯 Bounds selezionati per callback:', bounds.toBBoxString());
                        setSelectedBounds(bounds);
                    }}
                />
            </MapContainer>
        </div>
    );
}