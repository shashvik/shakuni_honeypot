
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider, ProtectedRoute } from "@/context/AuthContext";
import { DeploymentLogsProvider } from "@/context/DeploymentLogsContext";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import DeployDeception from "./pages/DeployDeception";
import ViewAssets from "./pages/ViewAssets";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Register from "./pages/Register";
import CloudAlertsPage from "./pages/CloudAlertsPage"; // Import the new page
import GenericAlertsPage from "./pages/GenericAlertsPage"; // Import the Generic Alerts page
import CustomDeceptions from "./pages/CustomDeceptions"; // Import the Custom Deceptions page

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <DeploymentLogsProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/deploy" element={<DeployDeception />} />
                <Route path="/cloud-alerts" element={<CloudAlertsPage />} /> {/* Add the new route */}
                <Route path="/generic-alerts" element={<GenericAlertsPage />} /> {/* Add the Generic Alerts route */}
                <Route path="/assets" element={<ViewAssets />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/custom-deceptions" element={<CustomDeceptions />} /> {/* Add the Custom Deceptions route */}
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          </TooltipProvider>
        </DeploymentLogsProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
