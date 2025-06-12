import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import App from '../App';
import Home from '../pages/Home';
import Info from '../pages/Info';
import Map from '../pages/Map';
import FOPIMap from '../components/FOPIMap';

const Router: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<Home />} />
          <Route path="info" element={<Info />} />
          <Route path="map" element={<Map />} />
          <Route path="fopi" element={<FOPIMap />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default Router;
