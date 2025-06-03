import React, { useEffect, useRef, useState } from 'react';
import '../css/Map.css';
declare const L: any;

const Map: React.FC = () => {
  const mapRef = useRef<any>(null);
  const [searchLocationQuery, setSearchLocationQuery] = useState('');

  useEffect(() => {
    if (!mapRef.current) {
      mapRef.current = L.map('map', { zoomControl: false }).setView(
        [51.505, -0.09],
        3,
      );

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(mapRef.current);

      L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    console.log(searchLocationQuery);
  }, [searchLocationQuery]);

  return (
    <div style={{ position: 'relative', height: '100vh', width: '100%' }}>
      <div className="map-absolute-div">
        <div id="map" className="map-div">
          <div className="map-search-location-div">
            <input
              type="text"
              className="form-control"
              placeholder={'Search location'}
              value={searchLocationQuery}
              onChange={(e) => setSearchLocationQuery(e.target.value)}
              style={{
                padding: '4px 8px',
                width: '300px',
              }}
            ></input>
          </div>

          <div className="map-project-logo-div">
            <h2 style={{ fontFamily: 'Montserrat' }}>
              <i className="fa-solid fa-fire me-3"></i>
              Fire Front Radar
            </h2>

            
          </div>
        </div>
      </div>
    </div>
  );
};

export default Map;
