import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { LogoutConfirmProvider } from './components/LogoutConfirm';
import { AuthProvider } from './context/AuthContext';
import './styles.css';
import './site.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <LogoutConfirmProvider>
          <App />
        </LogoutConfirmProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
