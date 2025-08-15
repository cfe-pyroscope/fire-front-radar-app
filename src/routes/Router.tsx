// src/routes/Router.tsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Layout from '../layouts/Layout';
import Home from '../pages/Home';
import ChartTest from '../pages/ChartTest';

const Router: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Routes with the Sidenav */}
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
        </Route>

        {/* Route without the Sidenav */}
        <Route path="/chart-test" element={<ChartTest />} />
      </Routes>
    </BrowserRouter>
  );
};

export default Router;
