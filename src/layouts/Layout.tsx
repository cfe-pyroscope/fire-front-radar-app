import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function Layout() {
  return (
    <>
      <Navbar />
      <main style={{maxHeight: '94vh' , overflow: 'hidden'}}>
        <Outlet />
      </main>
    </>
  );
}
