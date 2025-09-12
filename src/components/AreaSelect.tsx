import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import { LatLngBounds } from 'leaflet';
import L from 'leaflet';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';
import '../css/AreaSelect.css';

interface AreaSelectProps {
    onDrawComplete: (bounds: LatLngBounds) => void;
}

const AreaSelect: React.FC<AreaSelectProps> = ({ onDrawComplete }) => {
    const map = useMap();
    const drawnItemsRef = useRef<L.FeatureGroup>(new L.FeatureGroup());

    L.drawLocal.draw.toolbar.buttons.rectangle = "Select a rectangular area";
    L.drawLocal.draw.toolbar.buttons.polygon = "Select a polygonal area";

    // listen for "clear-area-selection" and wipe the drawn area
    useEffect(() => {
        const handler = () => {
            drawnItemsRef.current?.clearLayers();
        };
        window.addEventListener("clear-area-selection", handler);
        return () => window.removeEventListener("clear-area-selection", handler);
    }, []);


    useEffect(() => {
        const drawnItems = drawnItemsRef.current;
        map.addLayer(drawnItems);

        const AreaSelect = new L.Control.Draw({
            position: 'topleft',
            draw: {
                rectangle: {
                    showArea: false,
                    shapeOptions: {
                        color: '#1C7ED6',
                        weight: 2,
                        fillOpacity: 0.2, // filled while drawing
                        // (leave fill=true default)
                    },
                },
                polygon: {
                    showArea: false,
                    shapeOptions: {
                        color: '#1C7ED6',
                        weight: 2,
                        fillOpacity: 0.2, // filled while drawing
                    },
                },
                circle: false,
                polyline: false,
                marker: false,
                circlemarker: false,
            },
            edit: { featureGroup: drawnItems, edit: false, remove: false },
        });

        map.addControl(AreaSelect);

        const onDrawCreated = (e: L.DrawEvents.Created) => {
            const layer = e.layer as L.Rectangle | L.Polygon;

            const drawnItems = drawnItemsRef.current;

            // keep only one area
            drawnItems.clearLayers();

            // add the new one
            drawnItems.addLayer(layer);

            // switch to outline-only AFTER the draw completes
            layer.setStyle({ fill: false, fillOpacity: 0 });

            window.dispatchEvent(new CustomEvent("clear-pin-selection")); // remove existing pin

            // keep the outline above overlays
            if ((layer as any).bringToFront) (layer as any).bringToFront();

            // keep your bounds logic
            const bounds = layer.getBounds();
            map.fitBounds(bounds, { padding: [20, 20] });

            onDrawComplete(bounds);
        };


        const handlerCreated = (e: L.LeafletEvent) =>
            onDrawCreated(e as L.DrawEvents.Created);

        map.on('draw:created', handlerCreated);

        return () => {
            map.off('draw:created', handlerCreated);
            map.removeControl(AreaSelect);
            map.removeLayer(drawnItems);
        };

    }, [map, onDrawComplete]);

    return null;
};

export default AreaSelect;