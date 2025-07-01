import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import '../css/ResetViewControl.css';
import { IconTarget } from '@tabler/icons-react';
import ReactDOMServer from 'react-dom/server';
import { INITIAL_MAP_CENTER, INITIAL_MAP_ZOOM } from '../utils/config';

const ResetViewControl = () => {
    const map = useMap();
    const containerRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        const control = L.Control.extend({
            onAdd: function () {
                const container = L.DomUtil.create('div', 'leaflet-reset-button');
                container.title = 'Reset view';
                container.innerHTML = ReactDOMServer.renderToString(<IconTarget size={18} />);
                containerRef.current = container;

                container.onclick = () => {
                    if (container.style.pointerEvents === 'none') return;
                    map.setView(INITIAL_MAP_CENTER, INITIAL_MAP_ZOOM);
                };

                return container;
            },
        });

        const resetControl = new control({ position: 'topleft' });
        map.addControl(resetControl);

        const updateButtonState = () => {
            if (!containerRef.current) return;

            const currentZoom = map.getZoom();
            const currentCenter = map.getCenter();
            const [initLat, initLng] = INITIAL_MAP_CENTER;

            // Use more reasonable thresholds for comparison
            const latDiff = Math.abs(currentCenter.lat - initLat);
            const lngDiff = Math.abs(currentCenter.lng - initLng);
            const zoomDiff = Math.abs(currentZoom - INITIAL_MAP_ZOOM);

            // Adjust thresholds based on practical differences
            // For coordinates: ~0.001 degrees ≈ ~100m at equator
            // For zoom: 0.1 is a reasonable threshold
            const COORD_THRESHOLD = 0.001;
            const ZOOM_THRESHOLD = 0.1;

            console.log("🔍 Checking reset condition:");
            console.log("Current - Zoom:", currentZoom, "Lat:", currentCenter.lat.toFixed(6), "Lng:", currentCenter.lng.toFixed(6));
            console.log("Initial - Zoom:", INITIAL_MAP_ZOOM, "Lat:", initLat, "Lng:", initLng);
            console.log("Differences - Zoom:", zoomDiff.toFixed(3), "Lat:", latDiff.toFixed(6), "Lng:", lngDiff.toFixed(6));

            const hasChanged = latDiff > COORD_THRESHOLD || lngDiff > COORD_THRESHOLD || zoomDiff > ZOOM_THRESHOLD;

            console.log("🔁 Map has changed from initial position?", hasChanged);

            // Update button appearance based on whether map has moved
            if (hasChanged) {
                containerRef.current.style.opacity = '1';
                containerRef.current.style.pointerEvents = 'auto';
                containerRef.current.style.cursor = 'pointer';
                containerRef.current.classList.remove('disabled');
            } else {
                containerRef.current.style.opacity = '0.4';
                containerRef.current.style.pointerEvents = 'none';
                containerRef.current.style.cursor = 'default';
                containerRef.current.classList.add('disabled');
            }
        };

        // Initial state check - wait for map to be fully initialized
        const initialCheck = () => {
            // Double-check that map is ready
            if (map.getZoom() !== undefined && map.getCenter() !== undefined) {
                updateButtonState();
            } else {
                // If map isn't ready, try again shortly
                setTimeout(initialCheck, 50);
            }
        };

        // Wait a bit for the control to be mounted and map to be ready
        setTimeout(initialCheck, 100);

        // Listen for map events
        map.on('moveend', updateButtonState);
        map.on('zoomend', updateButtonState);

        return () => {
            map.removeControl(resetControl);
            map.off('moveend', updateButtonState);
            map.off('zoomend', updateButtonState);
        };
    }, [map]);

    return null;
};

export default ResetViewControl;