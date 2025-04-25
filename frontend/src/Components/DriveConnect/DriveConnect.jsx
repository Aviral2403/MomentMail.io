import { useGoogleLogin } from "@react-oauth/google";
import { useState, useEffect } from "react";
import { connectGoogleDrive } from "../../api";
import "./DriveConnect.css";
import LoginPrompt from "../LoginPrompt/LoginPrompt";

const DriveConnect = () => {
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  // Check drive connection status on component mount
  useEffect(() => {
    const userInfo = JSON.parse(localStorage.getItem("user-info") || "{}");
    console.log("Initial user info:", userInfo);
    
    if (userInfo.driveAccess && userInfo.driveToken) {
      // Verify token is still valid
      const tokenData = JSON.parse(atob(userInfo.driveToken.split('.')[1]));
      const isTokenValid = tokenData.exp * 1000 > Date.now();
      
      console.log("Token validation:", {
        isValid: isTokenValid,
        expirationTime: new Date(tokenData.exp * 1000).toLocaleString(),
        currentTime: new Date().toLocaleString()
      });
      
      setIsDriveConnected(isTokenValid);
      
      // If token is invalid, clear drive access data
      if (!isTokenValid) {
        const updatedUserInfo = { ...userInfo };
        delete updatedUserInfo.driveAccess;
        delete updatedUserInfo.driveToken;
        localStorage.setItem("user-info", JSON.stringify(updatedUserInfo));
        console.log("Cleared invalid token data. Updated user info:", updatedUserInfo);
      }
    }
  }, []);

  const handleDriveResponse = async (authResult) => {
    setError(null);
    setIsLoading(true);
    console.log("Received auth result:", { code: authResult.code ? "present" : "missing" });
    
    try {
      if (authResult["code"]) {
        const result = await connectGoogleDrive(authResult.code);
        console.log("Drive connection response:", result);
        
        const userInfo = JSON.parse(localStorage.getItem("user-info") || "{}");
        
        // Store drive connection info
        const updatedUserInfo = {
          ...userInfo,
          driveAccess: true,
          driveToken: result.data.token,
          driveConnectedAt: new Date().toISOString()
        };
        
        localStorage.setItem("user-info", JSON.stringify(updatedUserInfo));
        console.log("Updated user info after successful connection:", {
          driveAccess: updatedUserInfo.driveAccess,
          driveConnectedAt: updatedUserInfo.driveConnectedAt,
          tokenPresent: !!updatedUserInfo.driveToken
        });
        
        setIsDriveConnected(true);
      } else {
        throw new Error(authResult);
      }
    } catch (e) {
      console.error("Error while connecting Google Drive:", e);
      setError("Failed to connect Google Drive");
      
      // Clear any invalid drive data
      const userInfo = JSON.parse(localStorage.getItem("user-info") || "{}");
      const updatedUserInfo = { ...userInfo };
      delete updatedUserInfo.driveAccess;
      delete updatedUserInfo.driveToken;
      localStorage.setItem("user-info", JSON.stringify(updatedUserInfo));
      console.log("Cleared user info after error:", updatedUserInfo);
    } finally {
      setIsLoading(false);
    }
  };

  const googleDriveLogin = useGoogleLogin({
    onSuccess: handleDriveResponse,
    onError: (error) => {
      console.error("Google Drive login error:", error);
      setError("Google Drive connection failed. Please try again.");
    },
    flow: "auth-code",
    scope: "https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/spreadsheets.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/calendar.events",
  });

  // Check if user is logged in and handle connect button click
  const handleConnectClick = () => {
    if (isLoading) return;
    
    // Get user info from localStorage
    const userInfo = JSON.parse(localStorage.getItem("user-info") || "{}");
    
    // Check if user is logged in - looking for a valid token
    // This is the key check - a user is logged in if they have a token property
    const isLoggedIn = !!userInfo.token;
    
    console.log("Login check:", { isLoggedIn, userInfo });
    
    if (!isLoggedIn) {
      // User is not logged in, show the login prompt
      setShowLoginPrompt(true);
    } else {
      // User is logged in, proceed with Google login
      googleDriveLogin();
    }
  };

  // If connected, return null (render nothing)
  if (isDriveConnected) {
    return null;
  }

  return (
    <div className="connect-container">
      <div className="background-text">CONNECT</div>
      <div className="instruction-text">
        Click button to connect google drive*
      </div>
      <span 
        className="connect-button"
        onClick={handleConnectClick}
      >
        {isLoading ? "Connecting..." : "Connect Drive"}
      </span>
      {error && <div className="error-message">{error}</div>}
      
      {/* Render login prompt when needed */}
      {showLoginPrompt && <LoginPrompt onClose={() => setShowLoginPrompt(false)} />}
    </div>
  );
};

export default DriveConnect;