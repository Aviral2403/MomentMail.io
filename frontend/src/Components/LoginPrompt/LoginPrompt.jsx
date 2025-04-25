/* eslint-disable react/prop-types */
import "./LoginPrompt.css"; 

const LoginPrompt = ({ onClose }) => {
    return (
        <div className="login-prompt-overlay">
            <div className="login-prompt-text">
                <p>Please log in first to use this feature.</p>
                <button onClick={onClose}>Close</button>
            </div>
        </div>
    );
};

export default LoginPrompt;