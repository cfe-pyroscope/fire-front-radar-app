import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import '../css/ResetViewControl.css';
import { IconTarget } from '@tabler/icons-react';
import ReactDOMServer from 'react-dom/server';
import { INITIAL_MAP_CENTER, INITIAL_MAP_ZOOM } from '../api/config';

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

            const latDiff = Math.abs(currentCenter.lat - initLat);
            const lngDiff = Math.abs(currentCenter.lng - initLng);
            const zoomDiff = Math.abs(currentZoom - INITIAL_MAP_ZOOM);

            console.log("🔍 Checking reset condition:");
            console.log("Zoom:", currentZoom, "Diff:", zoomDiff);
            console.log("Lat:", currentCenter.lat, "LatDiff:", latDiff);
            console.log("Lng:", currentCenter.lng, "LngDiff:", lngDiff);

            const changed = latDiff > 1e-4 || lngDiff > 1e-4 || zoomDiff > 1e-4;

            console.log("🔁 Changed?", changed);
            containerRef.current.style.opacity = changed ? '1' : '0.4';
            containerRef.current.style.pointerEvents = changed ? 'auto' : 'none';
        };


        // Wait a tick to ensure the control is mounted
        setTimeout(updateButtonState, 0);

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
