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
                const container = L.DomUtil.create('div', 'leaflet-reset-button disabled');
                container.title = 'Reset view';
                container.innerHTML = ReactDOMServer.renderToString(<IconTarget size={18} />);
                containerRef.current = container;

                container.onclick = () => {
                    if (container.classList.contains('disabled')) {
                        console.log("🚫 Button is disabled");
                        return;
                    }
                    console.log("🎯 Resetting view");
                    map.setView(INITIAL_MAP_CENTER, INITIAL_MAP_ZOOM);
                    // After reset, disable the button since we're back at initial position
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
                console.log("🔓 User interacted with map - enabling reset button");
                if (containerRef.current) {
                    containerRef.current.classList.remove('disabled');
                }
            }
        };

        // Enable button on any user interaction
        map.on('movestart', enableButton);  // User starts dragging
        map.on('zoomstart', enableButton);  // User starts zooming

        console.log("Reset button starts disabled");

        return () => {
            map.removeControl(resetControl);
            map.off('movestart', enableButton);
            map.off('zoomstart', enableButton);
        };
    }, [map]);

    return null;
};

export default ResetViewControl;