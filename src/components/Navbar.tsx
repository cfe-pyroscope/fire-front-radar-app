import FFRLogoPng from '../assets/FFRlogo.png';
import { NavLink } from 'react-router-dom';
import '../css/Navbar.css'

const pages = [
  { path: '/', title: 'Home' },
  { path: 'info', title: 'Info' },
  { path: 'fopi', title: 'FOPI Map' },
];

export default function Navbar() {
  return (
    <nav className="navbar navbar-dark" style={{ height: '7vh'}}>
      <div className="container-fluid d-flex align-items-center">
        <a
          className="navbar-brand d-flex align-items-center"
          href="#"
          style={{ fontSize: '40px', fontFamily: 'Monserrat, sans-serif' }}
        >
          <img
            src={FFRLogoPng}
            alt=""
            width="55"
            height="55"
            className="d-inline-block align-text-top me-3"
          ></img>
          Fire Front Radar
        </a>

        <div className="d-flex justify-content-end align-items-center">
          {pages.map((page, idx) => (
            <NavLink
              key={idx}
              className={({ isActive }) =>
                isActive
                  ? 'nav-link fw-bold navActive mx-3 fs-5'
                  : 'nav-link fw-bold mx-3 fs-5'
              }
              to={page.path}
            >
              {page.title}
            </NavLink>

          ))}
        </div>
      </div>
    </nav>
  );
}
