import React from 'react';
import { Outlet, Link } from 'react-router-dom';

const App: React.FC = () => {
  return (
    <div>
      {/* <nav>
        <Link to="/">Home</Link>
      </nav> */}
      <Outlet />
    </div>
  );
};

export default App;

