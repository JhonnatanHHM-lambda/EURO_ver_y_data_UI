import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { UserProvider } from './context/UserContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { SedeProvider } from './context/SedeContext.jsx';
import './index.scss';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ThemeProvider>
            <UserProvider>
                <SedeProvider>
                    <App />
                </SedeProvider>
            </UserProvider>
        </ThemeProvider>
    </React.StrictMode>
);
