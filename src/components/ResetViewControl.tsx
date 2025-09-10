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
    const userHasInteractedRef = useRef(false);

    useEffect(() => {
        const control = L.Control.extend({
            onAdd: function () {
                const container = L.DomUtil.create(
                    'div',
                    'leaflet-bar leaflet-control leaflet-reset-button disabled'
                );
                container.title = 'Reset view';
                container.innerHTML = ReactDOMServer.renderToString(<IconTarget size={18} />);
                containerRef.current = container;

                container.onclick = () => {
                    if (container.classList.contains('disabled')) return;

                    // Reset view
                    map.setView(INITIAL_MAP_CENTER, INITIAL_MAP_ZOOM);

                    // Tell PinSelect to clear its (single) marker
                    window.dispatchEvent(new CustomEvent('pin-clear'));

                    // Disable button again (we're back to initial)
                    container.classList.add('disabled');
                    userHasInteractedRef.current = false;
                };

                return container;
            },
        });

        const resetControl = new control({ position: 'topleft' });
        map.addControl(resetControl);

        const enableButton = () => {
            if (!userHasInteractedRef.current) {
                userHasInteractedRef.current = true;
                containerRef.current?.classList.remove('disabled');
            }
        };

        map.on('movestart', enableButton);
        map.on('zoomstart', enableButton);

        return () => {
            map.removeControl(resetControl);
            map.off('movestart', enableButton);
            map.off('zoomstart', enableButton);
        };
    }, [map]);

    return null;
};

export default ResetViewControl;
