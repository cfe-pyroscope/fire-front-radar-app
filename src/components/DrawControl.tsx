import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import { LatLngBounds } from 'leaflet';
import L from 'leaflet';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';

interface DrawControlProps {
    onDrawComplete: (bounds: LatLngBounds) => void;
}

const DrawControl: React.FC<DrawControlProps> = ({ onDrawComplete }) => {
    const map = useMap();
    const drawnItemsRef = useRef<L.FeatureGroup>(new L.FeatureGroup());

    useEffect(() => {
        const drawnItems = drawnItemsRef.current;
        map.addLayer(drawnItems);

        const drawControl = new L.Control.Draw({
            position: 'topleft',
            draw: {
                rectangle: {
                    showArea: false,
                    shapeOptions: {
                        color: '#96C1FC',
                        weight: 2,
                        fillOpacity: 0.2,
                    },
                },
                polygon: true,
                circle: false,
                polyline: false,
                marker: false,
                circlemarker: false,
            },
            edit: {
                featureGroup: drawnItems,
                edit: false,
                remove: true,
            },
        });

        map.addControl(drawControl);

        const onDrawCreated = (e: L.DrawEvents.Created) => {
            const layer = e.layer;

            if (e.layerType === 'rectangle' && layer instanceof L.Rectangle) {
                const bounds = layer.getBounds();
                console.log('🟩 Rectangle bounds:', bounds.toBBoxString());
                map.fitBounds(bounds, { padding: [20, 20] });
                onDrawComplete(bounds);
            } else if (e.layerType === 'polygon' && layer instanceof L.Polygon) {
                const bounds = layer.getBounds();
                console.log('🔷 Polygon bounds:', bounds.toBBoxString());
                map.fitBounds(bounds, { padding: [20, 20] });
                onDrawComplete(bounds);
            } else {
                console.warn('⚠️ Unknown layer type:', e.layerType);
            }

            drawnItems.addLayer(layer);
        };

        map.on(L.Draw.Event.CREATED, onDrawCreated);

        return () => {
            map.off(L.Draw.Event.CREATED, onDrawCreated);
            map.removeControl(drawControl);
            map.removeLayer(drawnItems);
        };
    }, [map, onDrawComplete]);

    return null;
};

export default DrawControl;
