/* eslint-disable react/prop-types */
import { Suspense, useEffect, useLayoutEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./Components/Navbar/Navbar";
import Footer from "./Components/Footer/Footer";
import HomePage from "./Pages/HomePage/HomePage";
import Login from "./Pages/Login/Login";
import Templates from "./Pages/Templates/Templates";
import TemplatePreview from "./Pages/TemplatePreview/TemplatePreview";
import TemplateEditor from "./Pages/TemplateEditor/TemplateEditor";
import RecipientSelector from "./Pages/RecipientSelector/RecipientSelector";
import EmailPreview from "./Pages/EmailPreview/EmailPreview";
import Chatbot from "./Pages/Chatbot/Chatbot";
import PrivacyPolicy from "./Pages/PrivacyPolicy/PrivacyPolicy";
import Terms from "./Pages/Terms/Terms";
import ScheduleDateTime from "./Pages/ScheduleDateTime/ScheduleDateTime";
import Dashboard from "./Pages/Dashboard/Dashboard";
import { GoogleOAuthProvider } from "@react-oauth/google";
import LoadingSkeleton from "./Components/LoadingSkeleton/LoadingSkeleton";
import useTokenRefresh from "./Hooks/useTokenRefresh";
import TemplatesList from "./Pages/TemplatesList/TemplatesList";
import TemplateBuilder from "./Pages/TemplateBuilder/TemplateBuilder";
import Demo from "./Pages/Demo/Demo";
import ProtectedRoute from "./Components/ProtectedRoute/ProtectedRoute";
import LeadGeneration from "./Pages/LeadGeneration/LeadGeneration";

// Scroll to top component with multiple approaches
const ScrollToTop = () => {
  const { pathname } = useLocation();

  // Primary scroll method - immediate execution before paint
  useLayoutEffect(() => {
    // Force immediate scroll to top
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);

  // Secondary scroll method - handles any delayed content loading
  useEffect(() => {
    // Multiple approaches to ensure scroll happens
    const scrollToTop = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    // Immediate scroll
    scrollToTop();

    // Delayed scroll for any async content
    const timer1 = setTimeout(scrollToTop, 0);
    const timer2 = setTimeout(scrollToTop, 100);

    // Additional scroll after potential content load
    const timer3 = setTimeout(scrollToTop, 300);

    // Cleanup
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [pathname]);

  return null;
};

// Create a wrapper component for Google OAuth protected routes
const GoogleOAuthWrapper = ({ children }) => {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      {children}
    </GoogleOAuthProvider>
  );
};

// Layout component with Navbar and Footer
const Layout = ({ children }) => {
  return (
    <>
      <Navbar />
      <Suspense fallback={<LoadingSkeleton type="default" />}>
        {children}
      </Suspense>
      <Footer />
    </>
  );
};

const App = () => {
  useTokenRefresh();
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route
          path="/login"
          element={
            <Suspense fallback={<LoadingSkeleton type="default" />}>
              <GoogleOAuthWrapper>
                <Login />
              </GoogleOAuthWrapper>
            </Suspense>
          }
        />
        <Route
          path="/"
          element={
            <Layout>
              <HomePage />
            </Layout>
          }
        />
        <Route
          path="/templates"
          element={
            <Layout>
              <GoogleOAuthWrapper>
                <Templates />
              </GoogleOAuthWrapper>
            </Layout>
          }
        />
        <Route
          path="/templates/:templateSlug"
          element={
            <Layout>
              <TemplatePreview />
            </Layout>
          }
        />
        <Route
          path="/templates/:slug/edit"
          element={
            <Layout>
              <GoogleOAuthWrapper>
                <ProtectedRoute>
                  <TemplateEditor />
                </ProtectedRoute>
              </GoogleOAuthWrapper>
            </Layout>
          }
        />
        <Route
          path="/templates/:slug/recipients"
          element={
            <Layout>
              <GoogleOAuthWrapper>
                <ProtectedRoute>
                  <RecipientSelector />
                </ProtectedRoute>
              </GoogleOAuthWrapper>
            </Layout>
          }
        />
        <Route
          path="/templates/:slug/preview"
          element={
            <Layout>
              <GoogleOAuthWrapper>
                <ProtectedRoute>
                  <EmailPreview />
                </ProtectedRoute>
              </GoogleOAuthWrapper>
            </Layout>
          }
        />
        <Route
          path="/templates/:slug/schedule"
          element={
            <Layout>
              <GoogleOAuthWrapper>
                <ProtectedRoute>
                  <ScheduleDateTime />
                </ProtectedRoute>
              </GoogleOAuthWrapper>
            </Layout>
          }
        />
        <Route
          path="/dashboard"
          element={
            <Layout>
              <GoogleOAuthWrapper>
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              </GoogleOAuthWrapper>
            </Layout>
          }
        />
        <Route
          path="/ask-ai"
          element={
            <Layout>
              <Chatbot />
            </Layout>
          }
        />
        <Route
          path="/privacy"
          element={
            <Layout>
              <PrivacyPolicy />
            </Layout>
          }
        />
        <Route
          path="/terms"
          element={
            <Layout>
              <Terms />
            </Layout>
          }
        />
        <Route
          path="/my-templates"
          element={
            <Layout>
              <GoogleOAuthWrapper>
                <ProtectedRoute>
                  <TemplatesList />
                </ProtectedRoute>
              </GoogleOAuthWrapper>
            </Layout>
          }
        />
        <Route
          path="/templates/create/new"
          element={
            <Layout>
              <GoogleOAuthWrapper>
                <ProtectedRoute>
                  <TemplateBuilder />
                </ProtectedRoute>
              </GoogleOAuthWrapper>
            </Layout>
          }
        />
        <Route
          path="/my-templates/:templateId/edit"
          element={
            <Layout>
              <GoogleOAuthWrapper>
                <ProtectedRoute>
                  <TemplateBuilder />
                </ProtectedRoute>
              </GoogleOAuthWrapper>
            </Layout>
          }
        />

        <Route
          path="/lead-generation"
          element={
            <Layout>
              <GoogleOAuthWrapper>
                <ProtectedRoute>
                  <LeadGeneration />
                </ProtectedRoute>
              </GoogleOAuthWrapper>
            </Layout>
          }
        />
        <Route
          path="/help/demo"
          element={
            <Layout>
              <Demo />
            </Layout>
          }
        />
      </Routes>
    </>
  );
};

export default App;
