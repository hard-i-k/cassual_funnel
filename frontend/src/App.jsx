import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import SessionsPage from './pages/SessionsPage';
import SessionDetailPage from './pages/SessionDetailPage';
import HeatmapPage from './pages/HeatmapPage';

import './styles/App.css';
import './styles/Sidebar.css';
import './styles/Sessions.css';
import './styles/Timeline.css';
import './styles/Heatmap.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/sessions" replace />} />
          <Route path="sessions" element={<SessionsPage />} />
          <Route path="sessions/:sessionId" element={<SessionDetailPage />} />
          <Route path="heatmap" element={<HeatmapPage />} />
          <Route path="*" element={<Navigate to="/sessions" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
