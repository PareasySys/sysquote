
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import HomePage from "@/pages/HomePage";
import ProfileSettingsPage from "@/pages/ProfileSettingsPage";
import SettingsPage from "@/pages/SettingsPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import NotFoundPage from "@/pages/NotFoundPage";
import PrivateRoute from "./PrivateRoute";
import PageTransition from "@/components/ui/page-transition";

const Router = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<PageTransition><LoginPage /></PageTransition>} />
      <Route path="/signup" element={<PageTransition><SignupPage /></PageTransition>} />
      <Route path="/forgot-password" element={<PageTransition><ForgotPasswordPage /></PageTransition>} />
      <Route path="/home" element={
        <PrivateRoute>
          <PageTransition>
            <HomePage />
          </PageTransition>
        </PrivateRoute>
      } />
      <Route path="/profile" element={
        <PrivateRoute>
          <PageTransition>
            <ProfileSettingsPage />
          </PageTransition>
        </PrivateRoute>
      } />
      <Route path="/settings" element={
        <PrivateRoute>
          <PageTransition>
            <SettingsPage />
          </PageTransition>
        </PrivateRoute>
      } />
      <Route path="*" element={<PageTransition><NotFoundPage /></PageTransition>} />
    </Routes>
  </BrowserRouter>
);

export default Router;
