import React, { useEffect } from 'react';
import { useMap } from 'react-leaflet';

const MapLabels: React.FC = () => {
    const map = useMap();

    useEffect(() => {
        if (!map) return;

        // Create labels pane if it doesn't exist
        if (!map.getPane('labels')) {
            const labelsPane = map.createPane('labels');
            // Set z-index to 650 (above markers but below popups)
            labelsPane.style.zIndex = '650';
            // Allow clicks to pass through labels
            labelsPane.style.pointerEvents = 'none';
        }
    }, [map]);

    return null;
};

export default MapLabels;