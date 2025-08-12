import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
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
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Dashboard />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/dashboard/tickets/:id" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <TicketDetail />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/dashboard/tickets/new" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <NewTicket />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/dashboard/companies" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Companies />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/dashboard/equipment-models" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <EquipmentModels />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/dashboard/rmas" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <RMAs />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/dashboard/rmas/:id" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <RMADetail />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/dashboard/reports" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Reports />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/dashboard/settings" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Settings />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/dashboard/profile" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Profile />
                </DashboardLayout>
              </ProtectedRoute>
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
