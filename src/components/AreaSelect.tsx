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

    useEffect(() => {
        const drawnItems = drawnItemsRef.current;
        map.addLayer(drawnItems);

        const AreaSelect = new L.Control.Draw({
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
                remove: false,
            },
        });

        map.addControl(AreaSelect);

        const onDrawCreated = (e: L.DrawEvents.Created) => {
            const layer = e.layer;

            // Clear any existing drawn items before adding the new one
            drawnItems.clearLayers();

            if (e.layerType === 'rectangle' && layer instanceof L.Rectangle) {
                const bounds = layer.getBounds();
                // console.log('Rectangle bounds:', bounds.toBBoxString());

                // Add the layer temporarily to show the selection
                drawnItems.addLayer(layer);

                // Fit bounds and then clear the selection after zoom completes
                map.fitBounds(bounds, { padding: [20, 20] });

                // Clear the drawn item after a short delay to let the zoom complete
                setTimeout(() => {
                    drawnItems.clearLayers();
                }, 500);

                onDrawComplete(bounds);
            } else if (e.layerType === 'polygon' && layer instanceof L.Polygon) {
                const bounds = layer.getBounds();
                // console.log('Polygon bounds:', bounds.toBBoxString());

                // Add the layer temporarily to show the selection
                drawnItems.addLayer(layer);

                // Fit bounds and then clear the selection after zoom completes
                map.fitBounds(bounds, { padding: [20, 20] });

                // Clear the drawn item after a short delay to let the zoom complete
                setTimeout(() => {
                    drawnItems.clearLayers();
                }, 500);

                onDrawComplete(bounds);
            } else {
                console.warn('⚠️ Unknown layer type:', e.layerType);
            }
        };

        // Clear drawn items when map is clicked (outside of drawing mode)
        const onMapClick = () => {
            if (!map.pm || !map.pm.globalDrawModeEnabled()) {
                drawnItems.clearLayers();
            }
        };

        map.on(L.Draw.Event.CREATED, onDrawCreated);
        // clear selection on map click
        // map.on('click', onMapClick);

        return () => {
            map.off(L.Draw.Event.CREATED, onDrawCreated);
            // map.off('click', onMapClick); // add the click listener
            map.removeControl(AreaSelect);
            map.removeLayer(drawnItems);
        };
    }, [map, onDrawComplete]);

    return null;
};

export default AreaSelect;