import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

/*import Layout from '../layouts/Layout';  */
import App from '../App';
import Home from '../pages/Home';

const Router: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route index element={<Home />} />
        {/*         <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
        </Route> */}
      </Routes>
    </BrowserRouter>
  );
};

export default Router;
