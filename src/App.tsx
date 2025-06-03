import React from 'react';
import { Outlet, Link } from 'react-router-dom';

const App: React.FC = () => {
  return (
    <div>
      <nav>
        <Link to="/">Home</Link> | <Link to="/info">Info</Link> | <Link to="/map">Map</Link>
      </nav>
      <hr />
      <Outlet />
    </div>
  );
};

export default App;
