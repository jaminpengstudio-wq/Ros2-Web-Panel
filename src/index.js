import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import reportWebVitals from './reportWebVitals';
import './bootstrap/sandstone_bootstrap.min.css';
import './styles/index.css';
import './styles/header.css';
import './styles/panel.css';
import './styles/rosControlPanel.css';
import './styles/map.css';
import './styles/webrtcCamera.css';
import './styles/robotState.css';
import './styles/imuAttitudeIndicator.css';
import './styles/powerState.css';
import './styles/safetyStop.css';
import './styles/emergency.css';
import './styles/loadingScreen.css';
import './styles/toast.css';


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();
