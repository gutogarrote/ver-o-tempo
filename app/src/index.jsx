import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { consumeUpdateReload } from './pwa/updateReload';

const preserveUpdate = consumeUpdateReload();
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App preserveUpdate={preserveUpdate} />
  </React.StrictMode>
);
