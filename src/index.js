import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App.jsx';

// Silence harmless Recharts ResponsiveContainer initial layout calculation warning
const origError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('width(-1) and height(-1) of chart should be greater than 0')) {
    return;
  }
  origError(...args);
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App /></React.StrictMode>);
