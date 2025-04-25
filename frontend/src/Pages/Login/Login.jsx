import { useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { googleAuth } from "../../api";
import "./Login.css";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const responseGoogle = async (authResult) => {
    setError(null);
    setIsLoading(true);
    try {
      if (authResult["code"]) {
        const result = await googleAuth(authResult.code);
        console.log("Raw response:", result);
        const { email, name, image } = result.data.user;
        console.log("Result : ", result.data.user);
        const token = result.data.token;
        console.log(token);
        const obj = { email, name, token, image };
        localStorage.setItem("user-info", JSON.stringify(obj));
        navigate("/");
      } else {
        console.log(authResult);
        throw new Error(authResult);
      }
    } catch (e) {
      console.log("Error while Google Login...", e);
    } finally {
      setIsLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: responseGoogle,
    onError: () => {
      setError("Google login failed. Please try again.");
    },
    flow: "auth-code",
    scope: "email profile",
  });

  return (
    <div className="login-page">
      <div className="welcome">
        <div className="title">Welcome to MomentMail.io</div>
        <div className="subtitle">Designed for efficiency</div>
        <div className="welcome-content">
          Forget manual email sending. Our platform lets you automate and
          personalize bulk emails directly. Effortlessly manage and send bulk
          emails using your Google Drive spreadsheets. Simplify your workflow
          and boost productivity today!
        </div>
        <div className="login-button">
          <button onClick={googleLogin} disabled={isLoading}>
            <span className="google-icon"></span>
            {isLoading ? "Logging in..." : "Log-In using Google"}
          </button>
        </div>
        {error && <div className="error-message">{error}</div>}
      </div>
    </div>
  );
};

export default Login;
