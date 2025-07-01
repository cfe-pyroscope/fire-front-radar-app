# React + TypeScript + Vite

## 📁 Frontend structure

src/  
├── api/  
│   ├── client.ts               # HTTP client setup (e.g. fetch wrapper or axios instance)      
│  
├── assets/                     # images   
|  
├── components/  
│   ├── ColorBarLegend.tsx      # Dynamic color legend based on selected area   
│   ├── DatePickerComponent.tsx # Mantine DatePickerInput; allows user to pick a date, updates app state  
│   ├── DrawControl.tsx         # Drawing tools; allow user to select an area on the map  
│   ├── DownloadButton.tsx      # Download button; allows user to download the heatmap image  
│   ├── ForecastSelect.tsx      # Mantine ForecastSelect; allows user to pick a forecast relate to a date    
│   ├── HeatmapController.tsx   # Fetches metadata & forecast steps; passes props to HeatmapOverlay    
│   ├── HeatmapOverlay.tsx      # Renders Leaflet ImageOverlay for fire data from NetCDF backend   
│   └── IndexToggle.tsx         # Mantine SegmentedControl to toggle between "fopi" and "pof" indexes   
│   └── Loader.tsx              # Mantine Loader while data and heatmap are loaded   
│   └── Logo.tsx                # App and ECMWF logos   
│   └── MapLabels.tsx           # To have map labels over the heatmap image   
│  
├── pages/  
│   └── Home.tsx                # Main map dashboard; combines map, toggle, date picker, and controller  
│  
├── routes/  
│   └── Router.tsx              # React Router setup; maps routes to components/pages  
│  
├── utils/  
│   └── config.ts               # Base API URL and environment config  
│   
├── App.tsx                     # Root component, wraps app layout; could be minimal if Router is main handler  
├── main.tsx                    # Entry point; ReactDOM render, wraps app with MantineProvider and Router  




This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```


