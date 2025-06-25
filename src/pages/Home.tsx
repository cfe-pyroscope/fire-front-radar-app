import React, { useState } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import { CRS } from "leaflet";
import 'leaflet/dist/leaflet.css';
import '../css/Home.css';
import IndexToggle from '../components/IndexToggle';
import DatePickerComponent from '../components/DatePickerComponent';
import HeatmapController from '../components/HeatmapController';

const Home: React.FC = () => {
    const [indexName, setIndexName] = useState<'pof' | 'fopi'>('pof');
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());

    console.log('Home component render - selectedDate:', selectedDate, 'isValid:', selectedDate instanceof Date && !isNaN(selectedDate.getTime()));

    return (
        <div className="map-container">
            <IndexToggle currentIndex={indexName} onToggle={setIndexName} />
            <DatePickerComponent
                value={selectedDate}
                onChange={(date) => {
                    const isValid = date instanceof Date && !isNaN(date.getTime());
                    console.log('DatePicker onChange - received:', date, 'isValid:', isValid);

                    if (isValid) {
                        setSelectedDate(date);
                        console.log('Successfully set new date:', date);
                    }
                }}
            />

            <MapContainer
                center={[28, 2]}
                zoom={2.5}
                minZoom={2.5}
                scrollWheelZoom={true}
                crs={CRS.EPSG3857}
                maxBounds={[[-85, -180], [85, 180]]}
                maxBoundsViscosity={1.0}
                worldCopyJump={false}
                style={{ height: '100%', width: '100%', zIndex: 0 }}
            >
                <TileLayer
                    attribution='&copy; OpenStreetMap contributors &copy; CARTO'
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    noWrap={true}
                />

                {selectedDate && (
                    <HeatmapController indexName={indexName} selectedDate={selectedDate} />
                )}
            </MapContainer>
        </div>
    );
};

export default Home;