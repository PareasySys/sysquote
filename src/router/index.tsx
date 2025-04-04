
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import LoginPage from "@/pages/LoginPage";
import HomePage from "@/pages/HomePage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import NotFoundPage from "@/pages/NotFoundPage";
import PrivateRoute from "./PrivateRoute";

const Router = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/home" element={
        <PrivateRoute>
          <HomePage />
        </PrivateRoute>
      } />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  </BrowserRouter>
);

export default Router;
