import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import DashboardLayout from "./components/DashboardLayout";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Dashboard from "./pages/Dashboard";
import DriversPage from "./pages/Drivers";
import RoutesPage from "./pages/Routes";
import DailyLogsPage from "./pages/DailyLogs";
import PenaltiesPage from "./pages/Penalties";
import PayStubsPage from "./pages/PayStubs";
import ReportsPage from "./pages/Reports";
import Form1099Page from "./pages/Form1099";
import MyActivityPage from "./pages/MyActivity";
import MyPayStubsPage from "./pages/MyPayStubs";
import LoginPage from "./pages/Login";
import MyPhotosPage from "./pages/MyPhotos";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route>
        <DashboardLayout>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/drivers" component={DriversPage} />
            <Route path="/routes" component={RoutesPage} />
            <Route path="/daily-logs" component={DailyLogsPage} />
            <Route path="/penalties" component={PenaltiesPage} />
            <Route path="/pay-stubs" component={PayStubsPage} />
            <Route path="/reports" component={ReportsPage} />
            <Route path="/1099" component={Form1099Page} />
            <Route path="/my-activity" component={MyActivityPage} />
            <Route path="/my-pay-stubs" component={MyPayStubsPage} />
            <Route path="/my-photos" component={MyPhotosPage} />
            <Route path="/404" component={NotFound} />
            <Route component={NotFound} />
          </Switch>
        </DashboardLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
