import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import SignalementPage from './components/SignalementPage.tsx';
import './index.css';

const path = window.location.pathname;
const isServiceFait = path.startsWith('/service-fait');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isServiceFait ? <App /> : <SignalementPage />}
  </StrictMode>,
);
