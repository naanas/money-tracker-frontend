import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { ThemeProvider } from './contexts/ThemeContext.jsx';
// [BARU] Impor DataProvider
import { DataProvider } from './contexts/DataContext.jsx';

// Impor CSS default untuk react-datepicker
import 'react-datepicker/dist/react-datepicker.css';


ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          {/* [BARU] Bungkus App dengan DataProvider */}
          <DataProvider>
            <App />
          </DataProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);