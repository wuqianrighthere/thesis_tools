/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ModelEntry from './pages/ModelEntry';
import VariablesLab from './pages/VariablesLab';
import ModelList from './pages/ModelList';
import NewIdeas from './pages/NewIdeas';
import Admin from './pages/Admin';
import ActionLogs from './pages/ActionLogs';
import UsefulLinks from './pages/UsefulLinks';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="entry" element={<ModelEntry />} />
            <Route path="lab" element={<VariablesLab />} />
            <Route path="ideas" element={<NewIdeas />} />
            <Route path="models" element={<ModelList />} />
            <Route path="logs" element={<ActionLogs />} />
            <Route path="links" element={<UsefulLinks />} />
            <Route path="admin" element={<Admin />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}
