import { Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <main style={{ flexGrow: 1 }}>
        <Outlet />
      </main>
    </div>
  );
}
