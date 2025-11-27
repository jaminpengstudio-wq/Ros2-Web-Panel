import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import reportWebVitals from './reportWebVitals';
import './bootstrap/sandstone_bootstrap.min.css';
import './styles/index.css';
import './styles/header.css';
import './styles/connection.css';
import './styles/panel.css';
import './styles/rosControlPanel.css';
import './styles/map.css';
import './styles/camera.css';
import './styles/robotState.css';
import './styles/imuAttitudeIndicator.css';
import './styles/powerState.css';
import './styles/safetyStop.css';
import './styles/emergency.css';
import './styles/loadingScreen.css';
import './styles/toast.css';

// =======================
// 直接和機器本地端 server 進行數據傳輸和控制: 
//   -單機模式
//   -透過 cloudflare tunnel 對外通道連線機器本地端 server 和 websocket 數據傳輸
// =======================


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();
