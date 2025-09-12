import React, { useEffect, useRef, useCallback } from "react";
import L, { LatLngBounds } from "leaflet";
import { useMap, useMapEvent } from "react-leaflet";
import markerUrl from "leaflet/dist/images/marker-icon.png";
import markerShadowUrl from "leaflet/dist/images/marker-shadow.png";

type Props = {
    enabled: boolean;
    onSelectBounds: (bounds: LatLngBounds) => void;
    deltaDeg?: number;
};

const PinSelect: React.FC<Props> = ({ enabled, onSelectBounds, deltaDeg = 0.01 }) => { // ~0.05 ≈ 5–6 km at mid-latitudes
    const map = useMap();

    const pinIcon = L.icon({
        iconUrl: markerUrl,
        shadowUrl: markerShadowUrl,
        iconSize: [25, 41],        // <— prevents squeeze
        iconAnchor: [12, 41],      // tip of the pin
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
    });

    // Persistent group to host the (single) marker
    const groupRef = useRef<L.LayerGroup | null>(null);

    // Create & attach the layer group once; remove on unmount
    useEffect(() => {
        if (!map) return;
        if (!groupRef.current) {
            groupRef.current = L.layerGroup().addTo(map);
        }
        return () => {
            if (groupRef.current) {
                groupRef.current.removeFrom(map);
                groupRef.current = null;
            }
        };
    }, [map]);

    // remove the current pin when an area is selected elsewhere
    useEffect(() => {
        const handler = () => {
            groupRef.current?.clearLayers(); // removes any existing marker(s)
        };
        window.addEventListener("clear-pin-selection", handler);
        window.addEventListener("pin-clear", handler);

        return () => {
            window.removeEventListener("clear-pin-selection", handler);
            window.removeEventListener("pin-clear", handler);
        };
    }, []);

    const placeMarker = useCallback(
        (latlng: L.LatLng) => {
            const group = groupRef.current;
            if (!group) return;

            // Ensure only one marker exists
            group.clearLayers();
            L.marker(latlng, { icon: pinIcon }).addTo(group);

            window.dispatchEvent(new CustomEvent("clear-area-selection"));  // remove previously selected areas

            // Compute a small bbox around the point
            const d = deltaDeg;
            const bounds = L.latLngBounds(
                L.latLng(latlng.lat - d, latlng.lng - d),
                L.latLng(latlng.lat + d, latlng.lng + d)
            );

            // Subtle feedback
            if (map) map.flyTo(latlng, Math.max(map.getZoom(), 7), { duration: 0.5 });

            onSelectBounds(bounds);
        },
        [deltaDeg, map, onSelectBounds]
    );

    // Modifier-click "center drop" event from LeftControlsController
    useEffect(() => {
        const handler = () => {
            if (!map) return;
            placeMarker(map.getCenter());
        };

        window.addEventListener("pin-center-drop", handler as EventListener);
        return () => window.removeEventListener("pin-center-drop", handler as EventListener);
    }, [map, placeMarker]);

    // Marker-shaped cursor while in pin mode (and pause map dragging)
    useEffect(() => {
        if (!map) return;

        const container = map.getContainer();
        const prevCursor = container.style.cursor;
        const wasDragging = map.dragging.enabled();

        if (enabled) {
            map.dragging.disable();
            // hotspot near the marker tip (icon ≈ 25x41)
            container.style.cursor = `url(${markerUrl}) 12 40, pointer`;
        }

        return () => {
            container.style.cursor = prevCursor;
            if (wasDragging) map.dragging.enable();
        };
    }, [map, enabled]);

    // When the tool is toggled OFF, remove any existing pin
    useEffect(() => {
        if (!enabled) {
            groupRef.current?.clearLayers();
        }
    }, [enabled]);

    // Click-to-place when in pin mode
    useMapEvent("click", (e) => {
        if (!enabled) return;
        if (!e.latlng) return;
        placeMarker(e.latlng);
    });

    return null;
};

export default PinSelect;
