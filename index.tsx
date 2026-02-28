
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { logService } from './services/logger';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

logService.setupGlobalErrorHandling();

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
