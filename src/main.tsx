// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';

import '@mantine/core/styles.css';
import '@fontsource/lato/400.css';
import '@fontsource/lato/700.css';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

import AppRoutes from './routes/Router';

if (import.meta.env.DEV) {
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    const msg = args[0];
    if (typeof msg === 'string' && msg.includes('Unexpected return value from a callback ref')) {
      return;
    }
    originalConsoleError(...(args as Parameters<typeof originalConsoleError>));
  };
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <MantineProvider
      theme={{ fontFamily: 'Lato, sans-serif' }}
      defaultColorScheme="light"
    >
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </MantineProvider>
  </React.StrictMode>
);
