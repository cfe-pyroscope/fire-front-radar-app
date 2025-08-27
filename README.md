# React + TypeScript + Vite

Interactive dashboard using React, TypeScript, and Leaflet to visualize global fire probability data on a map.

The frontend communicates with a FastAPI backend, which serves data extracted from daily netCDF files—one file for the Fire Occurrence Prediction Index (FOPI) and another for the Probability of Fire (POF) index.

The POF index provides daily fire probability forecasts for the next 10 days (i.e., one forecast per day, spanning 10 days ahead).

The FOPI index offers higher temporal resolution, providing 3-hourly forecasts (eight time steps per day) for the next 10 days.

Users can interactively explore and analyze both indices, choosing between date-based and forecast-initialization-based views, and seamlessly visualize the evolving probability of fire events worldwide.

## 📁 Frontend structure

src/  
├── api/  
│   ├── client.ts                     # HTTP client setup (e.g. fetch wrapper or axios instance)
│   ├── fireIndexApi.ts               # API service functions for fetching fire index data and normalizing responses             
│  
├── assets/                           # images   
│  
├── components/  
│   ├── ByModeInfoPopover.tsx         # Info tooltip explaining the "by date"/"by forecast" toggle  
│   ├── ByModeToggle.tsx              # Mantine SegmentedControl to toggle between "by date" and "by forecast" modes  
│   ├── ColorBarLegend.tsx            # Dynamic color legend based on selected area     
│   ├── ControlsController.tsx        # Contains IndexToggle, ByModeToggle, DatePicker, ForecastSelect, ForecastSlider, ColorBarLegend 
│   ├── DatePicker.tsx                # Mantine DatePickerInput; allows user to pick a date or forecast initialization time  
│   ├── DownloadButton.tsx            # Download button; allows user to download the heatmap image   
│   ├── DrawControl.tsx               # Drawing tools; allow user to select an area on the map  
│   ├── ForecastSelect.tsx            # Mantine Select; lets user pick a forecast valid time (in "by date" mode)    
│   ├── ForecastSlider.tsx            # Mantine Slider; lets user slide between forecast steps (in "by forecast" mode), shows start/end dates below slider  
│   ├── HeatmapController.tsx         # Fetches metadata & forecast steps; renders select/slider based on mode and passes props to HeatmapOverlay    
│   ├── HeatmapOverlay.tsx            # Renders Leaflet ImageOverlay for fire data from NetCDF backend
│   ├── IndexInfoPopover.tsx          # Info tooltip containing explanations about "fopi" and "pof" indexes    
│   ├── IndexToggle.tsx               # Mantine SegmentedControl to toggle between "fopi" and "pof" indexes     
│   ├── Loader.tsx                    # Mantine Loader while data and heatmap are loaded   
│   ├── LocationSearch.tsx            # Leaflet search input by location  
│   ├── LogoContainer.tsx             # App and ECMWF logos   
│   ├── MapLabels.tsx                 # To have map labels over the heatmap image   
│   └── ResetViewControl.tsx          # Reset the map at the initial zoom and position   
│  
├── hooks/  
│   └── useFireIndex.ts               # Custom React hooks that wrap fireIndexApi calls and manage request state     
│
├── layouts/  
│   └── Layout.tsx                      
│    
├── pages/  
│   └── Home.tsx                      # Main map dashboard; combines map, toggles, date picker, forecast controller, etc.   
│  
├── routes/  
│   └── Router.tsx                    # React Router setup; maps routes to components/pages  
│  
├── utils/  
│   └── config.ts                     # Base API URL and environment config  
│   
├── main.tsx                          # Entry point; ReactDOM render, wraps app with MantineProvider and Router  


