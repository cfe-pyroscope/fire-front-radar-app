import React, { useEffect } from "react";
import { GeoSearchControl, OpenStreetMapProvider } from "leaflet-geosearch";
import { useMap } from "react-leaflet";
import * as L from "leaflet";
import { LatLngBounds } from "leaflet";
import { Icon } from "leaflet";
import "leaflet-geosearch/dist/geosearch.css";
import '../css/LocationSearch.css';

type Props = {
    /** Called when a location is chosen, with a LatLngBounds you can reuse like an Area selection */
    onSelectBounds?: (bounds: LatLngBounds) => void;
};

const LocationSearch: React.FC<Props> = ({ onSelectBounds }) => {
    const map = useMap();

    useEffect(() => {
        const provider = new OpenStreetMapProvider();

        const searchControl = new (GeoSearchControl as any)({
            provider,
            style: "button",
            showMarker: true,
            showPopup: false,
            marker: {
                icon: new Icon.Default(),
                draggable: false,
            },
            maxMarkers: 1,
            retainZoomLevel: false,
            animateZoom: true,
            autoClose: true,
            searchLabel: "Enter location",
            keepResult: false,
        });

        map.addControl(searchControl);

        // 🔗 When a result is selected, emit a small bbox so charts can use it
        const handleShowLocation = (e: any) => {
            try {
                // e.location has { x: lng, y: lat } in leaflet-geosearch
                const lat = e?.location?.y ?? e?.location?.lat;
                const lng = e?.location?.x ?? e?.location?.lng;
                if (typeof lat !== "number" || typeof lng !== "number") return;

                // Build a small square around the point.
                // ~0.05° ≈ 5–6 km depending on latitude; adjust if you prefer.
                const delta = 0.05;
                const bounds = L.latLngBounds(
                    L.latLng(lat - delta, lng - delta),
                    L.latLng(lat + delta, lng + delta)
                );

                window.dispatchEvent(new CustomEvent("clear-pin-selection")); // remove existing pin
                window.dispatchEvent(new CustomEvent("clear-area-selection"));  // remove previously selected areas

                onSelectBounds?.(bounds);
            } catch {
                // swallow — this is a non-critical UX enhancement
            }
        };

        // Listen to the control's event
        map.on("geosearch/showlocation", handleShowLocation);

        return () => {
            map.off("geosearch/showlocation", handleShowLocation);
            map.removeControl(searchControl);
        };
    }, [map, onSelectBounds]);

    return null;
};

export default LocationSearch;
