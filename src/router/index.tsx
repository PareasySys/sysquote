
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import HomePage from "@/pages/HomePage";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import NotFoundPage from "@/pages/NotFoundPage";
import ProfileSettingsPage from "@/pages/ProfileSettingsPage";
import SettingsPage from "@/pages/SettingsPage";
import QuoteConfigPage from "@/pages/QuoteConfigPage";
import PrivateRoute from "./PrivateRoute";

const Router = () => {
  const router = createBrowserRouter([
    {
      path: "/",
      element: <LoginPage />
    },
    {
      path: "/signup",
      element: <SignupPage />
    },
    {
      path: "/forgot-password",
      element: <ForgotPasswordPage />
    },
    {
      path: "/home",
      element: <PrivateRoute component={<HomePage />} />
    },
    {
      path: "/profile",
      element: <PrivateRoute component={<ProfileSettingsPage />} />
    },
    {
      path: "/settings",
      element: <PrivateRoute component={<SettingsPage />} />
    },
    {
      path: "/quote/:quoteId/config",
      element: <PrivateRoute component={<QuoteConfigPage />} />
    },
    {
      path: "*",
      element: <NotFoundPage />
    }
  ]);

  return <RouterProvider router={router} />;
};

export default Router;
