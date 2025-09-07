import React, { useEffect, useRef, useCallback } from "react";
import L, { LatLngBounds } from "leaflet";
import { useMap, useMapEvent } from "react-leaflet";
import markerUrl from "leaflet/dist/images/marker-icon.png";

type Props = {
    enabled: boolean;
    onSelectBounds: (bounds: LatLngBounds) => void;
    deltaDeg?: number;
};

const PinSelect: React.FC<Props> = ({ enabled, onSelectBounds, deltaDeg = 0.01 }) => { // ~0.05 ≈ 5–6 km at mid-latitudes
    const map = useMap();

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

    const placeMarker = useCallback(
        (latlng: L.LatLng) => {
            const group = groupRef.current;
            if (!group) return;

            // Ensure only one marker exists
            group.clearLayers();
            L.marker(latlng, { icon: new L.Icon.Default() }).addTo(group);

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

    // Click-to-place when in pin mode
    useMapEvent("click", (e) => {
        if (!enabled) return;
        if (!e.latlng) return;
        placeMarker(e.latlng);
    });

    return null;
};

export default PinSelect;
