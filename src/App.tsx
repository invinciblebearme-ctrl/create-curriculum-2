import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LibraryPage } from '@/pages/LibraryPage';
import { AdminPage } from '@/pages/AdminPage';
import { ViewerPage } from '@/pages/ViewerPage';

export const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<LibraryPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/read/:id" element={<ViewerPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
