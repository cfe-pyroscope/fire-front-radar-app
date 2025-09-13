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

    // ResetViewControl.tsx
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

                    window.dispatchEvent(new CustomEvent('clear-area-selection'));
                    window.dispatchEvent(new CustomEvent('tooltip-clear'));
                    window.dispatchEvent(new CustomEvent('chart-clear'));

                    map.setView(INITIAL_MAP_CENTER, INITIAL_MAP_ZOOM);

                    // after resetting, go back to disabled state until next interaction
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

        // --- Enable logic ---
        const enableButton = () => {
            if (!userHasInteractedRef.current) {
                userHasInteractedRef.current = true;
                containerRef.current?.classList.remove('disabled');
            }
        };

        // 1) User moves/zooms the map
        map.on('movestart', enableButton);
        map.on('zoomstart', enableButton);

        // 2) Custom events for selections
        const onExternalEnable = () => enableButton();
        window.addEventListener('ffr:reset:enable', onExternalEnable);

        // 3) (Optional) If your tooltip control emits one of these, we’ll catch it
        window.addEventListener('tooltip-show', onExternalEnable);
        window.addEventListener('tooltip:selected', onExternalEnable);

        return () => {
            map.removeControl(resetControl);
            map.off('movestart', enableButton);
            map.off('zoomstart', enableButton);
            window.removeEventListener('ffr:reset:enable', onExternalEnable);
            window.removeEventListener('tooltip-show', onExternalEnable);
            window.removeEventListener('tooltip:selected', onExternalEnable);
            containerRef.current?.removeEventListener("click", dispatchDisableChartsBtn);
        };
    }, [map]);

    return null;
};

export default ResetViewControl;
