import { Outlet } from 'react-router-dom';
import { Sidenav } from '../components/Sidenav';

export default function Layout() {
  return (
    <>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidenav />

        <main style={{ flexGrow: 1, }}>
          <Outlet />
        </main>
      </div>
    </>
  );
}
