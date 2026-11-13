import { initializeTablePreferences } from './shared/lib/tablePreferences';
import { initSidebarTheme } from './shared/lib/sidebarTheme';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App.jsx';
import './shared/styles/tokens.css';
import './shared/styles/global.css';
import './shared/styles/layout.css';

initializeTablePreferences();
initSidebarTheme();
try {
  document.documentElement.style.zoom = '';
  localStorage.removeItem('skillhub_zoom_level');
} catch (e) {}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

