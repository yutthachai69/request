// frontend/src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';
import { NotificationProvider } from './context/NotificationContext';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CategoryProvider } from './context/CategoryContext';
import { StatusProvider } from './context/StatusContext';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { th } from 'date-fns/locale';
import { AppNotificationProvider } from './context/AppNotificationContext.jsx';
import { SocketProvider } from './context/SocketContext.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <NotificationProvider>
        <Router basename={import.meta.env.PROD ? "/requestonline" : ""}>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={th}>
            <AuthProvider>
              {/* 💡 START: แก้ไขลำดับการห่อหุ้ม */}
              <AppNotificationProvider>
                <SocketProvider>
                  <CategoryProvider>
                    <StatusProvider>
                      <CssBaseline />
                      <App />
                    </StatusProvider>
                  </CategoryProvider>
                </SocketProvider>
              </AppNotificationProvider>
              {/* 💡 END: แก้ไขลำดับการห่อหุ้ม */}
            </AuthProvider>
          </LocalizationProvider>
        </Router>
      </NotificationProvider>
    </ThemeProvider>
  </React.StrictMode>,
);