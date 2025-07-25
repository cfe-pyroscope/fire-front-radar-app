import { useState } from 'react';
import {
  IconCalendarStats,
  IconDeviceDesktopAnalytics,
  IconFingerprint,
  IconGauge,
  IconHome2,
  IconLogout,
  IconSettings,
  IconSwitchHorizontal,
  IconUser,
} from '@tabler/icons-react';
import { Center, Stack, Tooltip, UnstyledButton } from '@mantine/core';
import classes from '../css/NavbarMinimal.module.css';
import '../css/Sidenav.css';
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
      >
        <div style={{ display: 'flex', alignItems: 'center', padding: '8px' }}>
          <Icon size={20} stroke={1.5} />
          {sidenavIsOpen && <p style={{ marginLeft: '1rem' }}>{label}</p>}
        </div>
      </UnstyledButton>
    </Tooltip>
  );
}

const mockdata = [
  { icon: IconHome2, label: 'Home' },
  { icon: IconGauge, label: 'Dashboard' },
  { icon: IconDeviceDesktopAnalytics, label: 'Analytics' },
  { icon: IconCalendarStats, label: 'Releases' },
  { icon: IconUser, label: 'Account' },
  { icon: IconFingerprint, label: 'Security' },
  { icon: IconSettings, label: 'Settings' },
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
      <div className="navbar_cnt"
        style={{
          width: sidenavIsOpen ? '340px' : '70px',
          backgroundColor: sidenavIsOpen ? '#fff' : 'transparent',
          top: sidenavIsOpen ? '0' : '10px',
        }}
      >
        <div className="navbar_inner_cnt"
          style={{
            boxShadow: sidenavIsOpen ? 'none' : '0 2px 6px rgba(0, 0, 0, 0.2)',
            width: sidenavIsOpen ? '100%' : '45px',
          }}
        >
          <nav className={classes.navbar}
            style={{
              paddingTop: sidenavIsOpen ? '20px' : '10px',
            }}>
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
      </div></>
  );
};
