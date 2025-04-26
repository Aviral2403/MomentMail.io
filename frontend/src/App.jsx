/* eslint-disable react/prop-types */
import "./App.css";
import HomePage from "./Pages/HomePage/HomePage";
import Login from "./Pages/Login/Login";
import { Route, Routes, useLocation } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import Navbar from "./Components/Navbar/Navbar";
import Templates from "./Pages/Templates/Templates";
import TemplatePreview from "./Pages/TemplatePreview/TemplatePreview";
import TemplateEditor from "./Pages/TemplateEditor/TemplateEditor";
import RecipientSelector from "./Pages/RecipientSelector/RecipientSelector";
import EmailPreview from "./Pages/EmailPreview/EmailPreview";
import Chatbot from "./Pages/Chatbot/Chatbot";
import { useEffect } from "react";
import Footer from "./Components/Footer/Footer";
import PrivacyPolicy from "./Pages/PrivacyPolicy/PrivacyPolicy";
import Terms from "./Pages/Terms/Terms";

// Scroll to top component with smooth scrolling
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth",
    });
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

const Layout = ({ children }) => {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  );
};

function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route
          path="/login"
          element={
            <GoogleOAuthWrapper>
              <Login />
            </GoogleOAuthWrapper>
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
            <GoogleOAuthWrapper>
              <TemplateEditor />
            </GoogleOAuthWrapper>
          }
        />
        <Route
          path="/templates/:slug/recipients"
          element={
            <GoogleOAuthWrapper>
              <RecipientSelector />
            </GoogleOAuthWrapper>
          }
        />
        <Route
          path="/templates/:slug/preview"
          element={
            <GoogleOAuthWrapper>
              <EmailPreview />
            </GoogleOAuthWrapper>
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
      </Routes>
    </>
  );
}

export default App;
