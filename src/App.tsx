import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleProtectedRoute } from "@/components/RoleProtectedRoute";
import { DashboardLayout } from "@/layouts/DashboardLayout";

import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import TicketDetail from "./pages/TicketDetail";
import { NewTicket } from "./pages/NewTicket";
import { Companies } from "./pages/Companies";
import EquipmentModels from "./pages/EquipmentModels";
import RMAs from "./pages/RMAs";
import RMADetail from "./pages/RMADetail";
import { Reports } from "./pages/Reports";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import Requesters from "./pages/Requesters";
import NotFound from "./pages/NotFound";
import AccessDenied from "./pages/AccessDenied";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Requesters />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/reset-password" element={<ResetPassword />} />
            <Route path="/access-denied" element={<AccessDenied />} />
            <Route path="/dashboard" element={
              <RoleProtectedRoute allowedRoles={['support_agent', 'admin']}>
                <DashboardLayout>
                  <Dashboard />
                </DashboardLayout>
              </RoleProtectedRoute>
            } />
            <Route path="/dashboard/tickets/:id" element={
              <RoleProtectedRoute allowedRoles={['support_agent', 'admin']}>
                <DashboardLayout>
                  <TicketDetail />
                </DashboardLayout>
              </RoleProtectedRoute>
            } />
            <Route path="/dashboard/tickets/new" element={
              <RoleProtectedRoute allowedRoles={['support_agent', 'admin']}>
                <DashboardLayout>
                  <NewTicket />
                </DashboardLayout>
              </RoleProtectedRoute>
            } />
            <Route path="/dashboard/companies" element={
              <RoleProtectedRoute allowedRoles={['support_agent', 'admin']}>
                <DashboardLayout>
                  <Companies />
                </DashboardLayout>
              </RoleProtectedRoute>
            } />
            <Route path="/dashboard/equipment-models" element={
              <RoleProtectedRoute allowedRoles={['support_agent', 'admin']}>
                <DashboardLayout>
                  <EquipmentModels />
                </DashboardLayout>
              </RoleProtectedRoute>
            } />
            <Route path="/dashboard/rmas" element={
              <RoleProtectedRoute allowedRoles={['support_agent', 'admin']}>
                <DashboardLayout>
                  <RMAs />
                </DashboardLayout>
              </RoleProtectedRoute>
            } />
            <Route path="/dashboard/rmas/:id" element={
              <RoleProtectedRoute allowedRoles={['support_agent', 'admin']}>
                <DashboardLayout>
                  <RMADetail />
                </DashboardLayout>
              </RoleProtectedRoute>
            } />
            <Route path="/dashboard/reports" element={
              <RoleProtectedRoute allowedRoles={['support_agent', 'admin']}>
                <DashboardLayout>
                  <Reports />
                </DashboardLayout>
              </RoleProtectedRoute>
            } />
            <Route path="/dashboard/settings" element={
              <RoleProtectedRoute allowedRoles={['support_agent', 'admin']}>
                <DashboardLayout>
                  <Settings />
                </DashboardLayout>
              </RoleProtectedRoute>
            } />
            <Route path="/dashboard/profile" element={
              <RoleProtectedRoute allowedRoles={['support_agent', 'admin']}>
                <DashboardLayout>
                  <Profile />
                </DashboardLayout>
              </RoleProtectedRoute>
            } />
            <Route path="/solicitantes" element={<Requesters />} />
            <Route path="/suporte" element={<Requesters />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
