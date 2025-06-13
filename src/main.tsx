import React from 'react';
import ReactDOM from 'react-dom/client';
import Router from './routes/Router';

import '@fontsource/lato/400.css'; // normale
import '@fontsource/lato/700.css'; // bold
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';


ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <MantineProvider
      withGlobalStyles
      withNormalizeCSS
      theme={{
        fontFamily: 'Lato, sans-serif',
      }}
    >
      <Router />
    </MantineProvider>
  </React.StrictMode>
);
