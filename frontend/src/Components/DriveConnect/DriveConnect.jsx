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

  useEffect(() => {
    console.log('Checking initial drive connection status');
    const userInfo = JSON.parse(localStorage.getItem("user-info") || "{}");
    
    if (userInfo.driveAccess && userInfo.driveToken) {
      try {
        const tokenData = JSON.parse(atob(userInfo.driveToken.split('.')[1]));
        const isTokenValid = tokenData.exp * 1000 > Date.now();
        
        console.log('Drive token validation:', {
          isValid: isTokenValid,
          expiration: new Date(tokenData.exp * 1000).toLocaleString(),
          currentTime: new Date().toLocaleString()
        });

        setIsDriveConnected(isTokenValid);
        
        if (!isTokenValid) {
          console.log('Clearing invalid drive token');
          const updatedUserInfo = { ...userInfo };
          delete updatedUserInfo.driveAccess;
          delete updatedUserInfo.driveToken;
          localStorage.setItem("user-info", JSON.stringify(updatedUserInfo));
        }
      } catch (err) {
        console.error('Error checking drive token:', err);
        setIsDriveConnected(false);
      }
    }
  }, []);

  const handleDriveResponse = async (authResult) => {
    console.log('Received Google Drive auth response:', {
      code: authResult.code ? 'present' : 'missing',
      error: authResult.error
    });

    setError(null);
    setIsLoading(true);
    
    try {
      if (authResult.code) {
        console.log('Attempting to connect Google Drive...');
        const result = await connectGoogleDrive(authResult.code);
        console.log('Drive connection result:', result);

        const userInfo = JSON.parse(localStorage.getItem("user-info") || "{}");
        const updatedUserInfo = {
          ...userInfo,
          driveAccess: true,
          driveToken: result.token,
          driveConnectedAt: new Date().toISOString()
        };

        localStorage.setItem("user-info", JSON.stringify(updatedUserInfo));
        console.log('Updated user info with drive connection');
        
        setIsDriveConnected(true);
      } else {
        throw new Error(authResult.error || 'No authorization code received');
      }
    } catch (e) {
      console.error('Google Drive connection error:', {
        error: e.message,
        stack: e.stack
      });
      
      setError("Failed to connect Google Drive. Please try again.");
      
      const userInfo = JSON.parse(localStorage.getItem("user-info") || "{}");
      const updatedUserInfo = { ...userInfo };
      delete updatedUserInfo.driveAccess;
      delete updatedUserInfo.driveToken;
      
      localStorage.setItem("user-info", JSON.stringify(updatedUserInfo));
      setIsDriveConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const googleDriveLogin = useGoogleLogin({
    onSuccess: handleDriveResponse,
    onError: (error) => {
      console.error('Google Drive login error:', error);
      setError("Google Drive connection failed. Please try again.");
    },
    flow: "auth-code",
    scope: [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/spreadsheets.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/userinfo.email',
      'openid'
    ].join(' '),
  });

  const handleConnectClick = () => {
    console.log('Drive connect button clicked');
    if (isLoading) return;

    const userInfo = JSON.parse(localStorage.getItem("user-info") || "{}");
    const isLoggedIn = !!userInfo.token;
    
    console.log('Login check:', { isLoggedIn });
    
    if (!isLoggedIn) {
      console.log('User not logged in, showing login prompt');
      setShowLoginPrompt(true);
    } else {
      console.log('Initiating Google Drive login');
      googleDriveLogin();
    }
  };

  if (isDriveConnected) {
    return null;
  }

  return (
    <div className="connect-container">
      <div className="background-text">CONNECT</div>
      <div className="instruction-text">
        Click button to connect Google Drive
      </div>
      <span
        className="connect-button"
        onClick={handleConnectClick}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <span className="spinner"></span>
            Connecting...
          </>
        ) : (
          "Connect Drive"
        )}
      </span>
      {error && (
        <div className="error-message">
          <svg className="error-icon" viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
          {error}
        </div>
      )}
      {showLoginPrompt && <LoginPrompt onClose={() => setShowLoginPrompt(false)} />}
    </div>
  );
};

export default DriveConnect;