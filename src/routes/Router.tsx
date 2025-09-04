import { Routes, Route } from 'react-router-dom';
import Layout from '../layouts/Layout';
import Home from '../pages/Home';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Routes with the Sidenav */}
      <Route element={<Layout />}>
        {/* <Route path="/" element={<Home />} /> */}
      </Route>

      {/* Route without the Sidenav */}
      <Route path="/" element={<Home />} />
      {/* <Route path="/chart-test" element={<ChartTest />} /> */}
    </Routes>
  );
}
