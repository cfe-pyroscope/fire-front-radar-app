import { useState } from 'react';
import {
  IconHome2,
  IconCalendar,
  IconCheckupList,
  IconHome,
  IconCar,
  IconAlertSquareRounded
} from '@tabler/icons-react';
import { Center, Stack, Tooltip, UnstyledButton } from '@mantine/core';
import classes from '../css/NavbarMinimal.module.css';
import '../css/Navbar.css';
import { BadgeCard } from './BadgeCard';

interface NavbarLinkProps {
  icon: typeof IconHome2;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

function NavbarLink({
  icon: Icon,
  label,
  active,
  onClick,
  sidenavIsOpen,
}: NavbarLinkProps) {
  return (
    <Tooltip label={label} position="right" transitionProps={{ duration: 0 }}>
      <UnstyledButton
        onClick={onClick}
        className={sidenavIsOpen ? classes.link2 : classes.link}
        data-active={active || undefined}
        style={{paddingLeft: '10px'}}
      >
        <div style={{ display: 'flex', alignItems: 'center', width: 'auto' }}>
          <Icon size={20} stroke={1.5} />
          {sidenavIsOpen && <p style={{ marginLeft: '1rem' }}>{label}</p>}
        </div>
      </UnstyledButton>
    </Tooltip>
  );
}

const mockdata = [
  { icon: IconCheckupList, label: 'Assess fire risk for preparedness' },
  { icon: IconCalendar, label: "What's my fire risk today?" },
  { icon: IconHome, label: 'Track fire risk over my property' },
  { icon: IconCar, label: 'Plan a safe trip' },
    { icon: IconAlertSquareRounded, label: 'Alert extreme risk' },

];

const mockdata2 = [
  {
    image:
      'https://images.unsplash.com/photo-1437719417032-8595fd9e9dc6?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=600&q=80',
    title: 'Assess fire risk',
    description:
      "Assessing fire risk for preparedness <br></br> What's my fire risk today? <br></br>",
    badges: [
      { emoji: '☀️', label: 'Sunny weather' },
      { emoji: '🦓', label: 'Onsite zoo' },
    ],
  },
];

export const Sidenav = () => {
  const [sidenavIsOpen, setSidenavOpen] = useState<boolean>(false);
  const [active, setActive] = useState(2);

  const toggleSidenav = () => setSidenavOpen(!sidenavIsOpen);

  const links = mockdata.map((link, index) => (
    // <BadgeCard mockdata={data} />

    <NavbarLink
      {...link}
      key={link.label}
      active={index === active}
      onClick={() => setActive(index)}
      sidenavIsOpen={sidenavIsOpen}
    />
  ));

  return (
    <>
      <div
        style={{
          width: sidenavIsOpen ? '340px' : '120px',
          transition: 'width 0.4s ease',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          backgroundColor: '#f8f9fa',
          borderRight: '1px solid #ccc',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',

          alignItems: 'center',
          height: '100vh',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ width: '100%', height: '80vh' }}>
          <nav className={classes.navbar}>
            <button
              onClick={toggleSidenav}
              style={{ textAlign: 'center' }}
              title={
                sidenavIsOpen
                  ? 'Minimise navigation bar'
                  : 'Maximise navigation bar'
              }
              className={
                sidenavIsOpen ? 'noStyleButton ms-5' : 'noStyleButton ms-3'
              }
            >
              <i
                className={
                  sidenavIsOpen
                    ? 'fa-solid fa-chevron-left'
                    : 'fa-solid fa-chevron-right'
                }
              ></i>
            </button>

            <div className={classes.navbarMain}>
              <Stack justify="center" gap={0}>
                {links}
              </Stack>
            </div>

            {/* <Stack
            justify="center"
            gap={0}
            style={{ position: 'fixed', bottom: '0' }}
          >
            <NavbarLink icon={IconSwitchHorizontal} label="Change account" />
            <NavbarLink icon={IconLogout} label="Logout" />
          </Stack> */}
          </nav>
        </div>
        <div
          style={{
            height: '15vh',
            width: '100%',
            wordWrap: 'break-word',
            whiteSpace: 'normal',
          }}
        >
          {/* <p>
            Marina I thought we could put some of the permanent map
            functionality here? Equally it might be better on the map, we can
            play around with the space.{' '}
          </p> */}
        </div>
      </div>
    </>
  );
};
