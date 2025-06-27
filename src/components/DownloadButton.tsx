import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import '../css/DownloadButton.css';
import { IconDownload } from '@tabler/icons-react';
import ReactDOMServer from 'react-dom/server';
import domtoimage from 'dom-to-image';

const DownloadButton = () => {
    const map = useMap();

    useEffect(() => {
        const control = L.Control.extend({
            onAdd: function () {
                const container = L.DomUtil.create('div', 'leaflet-download-button');
                container.title = 'Download heatmap image';

                container.innerHTML = ReactDOMServer.renderToString(<IconDownload size={18} />);

                container.onclick = async () => {
                    const mapEl = document.querySelector('.leaflet-container') as HTMLElement;
                    if (!mapEl) return;

                    const controls = mapEl.querySelectorAll('.leaflet-control-container, .leaflet-draw');
                    controls.forEach((el) => (el as HTMLElement).style.visibility = 'hidden');

                    try {
                        const dataUrl = await domtoimage.toPng(mapEl);
                        const link = document.createElement('a');
                        link.href = dataUrl;
                        link.download = 'heatmap_map.png';
                        link.click();
                    } catch (err) {
                        console.error('Download failed:', err);
                    } finally {
                        controls.forEach((el) => (el as HTMLElement).style.visibility = 'visible');
                    }
                };

                return container;
            },
        });

        const downloadControl = new control({ position: 'topleft' });
        map.addControl(downloadControl);

        return () => {
            map.removeControl(downloadControl);
        };
    }, [map]);

    return null;
};

export default DownloadButton;
