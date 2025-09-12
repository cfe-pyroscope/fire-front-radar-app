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
                L.DomEvent.disableClickPropagation(container);
                L.DomEvent.disableScrollPropagation(container);
                container.title = 'Reset view';
                container.innerHTML = ReactDOMServer.renderToString(<IconTarget size={18} />);
                containerRef.current = container;

                container.onclick = () => {
                    if (container.classList.contains('disabled')) return;

                    map.stop();

                    window.dispatchEvent(new CustomEvent('pin-clear'));
                    window.dispatchEvent(new CustomEvent('clear-area-selection'));
                    window.dispatchEvent(new CustomEvent('tooltip-clear'));

                    map.setView(INITIAL_MAP_CENTER, INITIAL_MAP_ZOOM);

                    container.classList.add('disabled');
                    userHasInteractedRef.current = false;

                };

                return container;
            },
        });

        const resetControl = new control({ position: 'topleft' });
        map.addControl(resetControl);


        const dispatchDisableChartsBtn = () => {
            window.dispatchEvent(new CustomEvent("ffr:charts:disable"));
        };

        containerRef.current?.addEventListener("click", dispatchDisableChartsBtn);

        // re-enable the charts button on user interaction with the map
        const dispatchEnableChartsBtn = () => {
            window.dispatchEvent(new CustomEvent("ffr:charts:enable"));
        };
        map.on("movestart", dispatchEnableChartsBtn);
        map.on("zoomstart", dispatchEnableChartsBtn);


        const syncWithCurrentView = () => {
            const el = containerRef.current;
            if (!el) return;

            const atInitialZoom = map.getZoom() === INITIAL_MAP_ZOOM;
            const atInitialCenter =
                map.getCenter().distanceTo(L.latLng(INITIAL_MAP_CENTER)) < 1; // ~1m tolerance

            const atInitial = atInitialZoom && atInitialCenter;

            el.classList.toggle("disabled", atInitial);
            userHasInteractedRef.current = !atInitial;
        };

        syncWithCurrentView();

        map.on("moveend", syncWithCurrentView);
        map.on("zoomend", syncWithCurrentView);


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
