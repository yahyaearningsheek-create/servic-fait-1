import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App.tsx';
import SignalementPage from './components/SignalementPage.tsx';
import OfficeLinkLayout from './features/officelink/components/OfficeLinkLayout.tsx';
import DashboardPage from './pages/DashboardPage.tsx';
import ChatPage from './pages/ChatPage.tsx';
import FilesPage from './pages/FilesPage.tsx';
import AdminPage from './pages/AdminPage.tsx';
import StudioIAPage from './pages/StudioIAPage.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Page d'accueil publique : Signalement d'Urgence IT */}
        <Route path="/" element={<SignalementPage />} />

        {/* Portail Collaboratif OfficeLink (Intranet LAN) */}
        <Route path="/officelink" element={<OfficeLinkLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="registre-it" element={<App embedded />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="files" element={<FilesPage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="studio-ia" element={<StudioIAPage />} />
        </Route>

        {/* Redirections pour la compatibilité et les anciens favoris */}
        <Route path="/signalement" element={<Navigate to="/" replace />} />
        <Route path="/service-fait" element={<Navigate to="/officelink/registre-it" replace />} />
        <Route path="/registre-it" element={<Navigate to="/officelink/registre-it" replace />} />
        <Route path="/intranet" element={<Navigate to="/officelink" replace />} />
        <Route path="/intranet/*" element={<Navigate to="/officelink" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
