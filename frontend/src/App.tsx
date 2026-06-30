import { Routes, Route, Link } from "react-router-dom";
import LandingPage from "./pages/index";
import AuthLayout from "./pages/auth";
import LoginPage from "./pages/auth.login";
import RegisterPage from "./pages/auth.register";
import DashboardLayout from "./pages/dashboard";
import Overview from "./pages/dashboard.index";
import WeatherPanel from "./pages/dashboard.weather";
import SoilPanel from "./pages/dashboard.soil";
import SatellitePanel from "./pages/dashboard.satellite";
import CropsPanel from "./pages/dashboard.crops";
import DiseasePanel from "./pages/dashboard.disease";
import MarketPanel from "./pages/dashboard.market";
import AssistantPanel from "./pages/dashboard.assistant";
import ProfilePanel from "./pages/dashboard.profile";
import SettingsPanel from "./pages/dashboard.settings";

function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <Link to="/" className="mt-6 inline-block rounded-full gradient-primary px-5 py-2 text-sm font-medium text-primary-foreground">
          Go home
        </Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthLayout />}>
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
      </Route>
      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<Overview />} />
        <Route path="weather" element={<WeatherPanel />} />
        <Route path="soil" element={<SoilPanel />} />
        <Route path="satellite" element={<SatellitePanel />} />
        <Route path="crops" element={<CropsPanel />} />
        <Route path="disease" element={<DiseasePanel />} />
        <Route path="market" element={<MarketPanel />} />
        <Route path="assistant" element={<AssistantPanel />} />
        <Route path="profile" element={<ProfilePanel />} />
        <Route path="settings" element={<SettingsPanel />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
