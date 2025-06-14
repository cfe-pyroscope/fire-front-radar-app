import React from 'react';
import { Outlet, Link } from 'react-router-dom';

const App: React.FC = () => {
  return (
    <div>
      <nav>
        <Link to="/">Home</Link> | <Link to="/info">Info</Link> | <Link to="/fopi">Map Fopi test</Link>
      </nav>
      <hr />
      <Outlet />
    </div>
  );
};

export default App;
