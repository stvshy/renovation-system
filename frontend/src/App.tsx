import React from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Projects from "./pages/Projects";
import ProjectDetails from "./pages/ProjectDetails";
import ClientForm from "./pages/ClientForm";
import RoomForm from "./pages/RoomForm";
import ServiceForm from "./pages/ServiceForm";
import OfferSummary from "./pages/OfferSummary";
import Calendar from "./pages/Calendar";
import Inventory from "./pages/Inventory";
import Clients from "./pages/Clients";
import ClientDetails from "./pages/ClientDetails";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Register from "./pages/Register";
import { AuthProvider, useAuth } from "./context/AuthContext";

const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background-light dark:bg-background-dark text-slate-900 dark:text-white">Ładowanie...</div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const PublicRoute = ({ children }: { children?: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background-light dark:bg-background-dark text-slate-900 dark:text-white">Ładowanie...</div>
    );
  }

  if (user) {
    return <Navigate to="/projects" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          {/* Public Routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            }
          />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/projects" replace />} />
            <Route path="projects" element={<Projects />} />
            <Route path="projects/:id" element={<ProjectDetails />} />
            <Route path="projects/new/client" element={<ClientForm />} />
            <Route path="projects/new/room" element={<RoomForm />} />
            <Route path="projects/new/services" element={<ServiceForm />} />
            <Route path="projects/new/offer" element={<OfferSummary />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="clients" element={<Clients />} />
            <Route path="clients/:id" element={<ClientDetails />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
};

export default App;