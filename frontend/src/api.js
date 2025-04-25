import axios from 'axios';

// Base URL for the backend API
const API_BASE_URL = 'https://momentmail-io-backend.onrender.com';

// Helper function to get the auth token from localStorage
const getDriveToken = () => {
  try {
    const userInfo = JSON.parse(localStorage.getItem("user-info") || "{}");
    return userInfo.driveToken;
  } catch (error) {
    console.error("Error getting drive token:", error);
    return null;
  }
};

// Google Auth
export const googleAuth = (code) => {
  return axios.get(`${API_BASE_URL}/auth/google?code=${code}`);
};

// Connect Google Drive
export const connectGoogleDrive = (code) => {
  return axios.get(`${API_BASE_URL}/auth/connect-drive`, {
    params: { code },
  });
};

// Fetch spreadsheets
export const fetchSpreadsheets = () => {
  const token = getDriveToken();
  if (!token) {
    return Promise.reject(new Error("No drive token found"));
  }

  return axios.get(`${API_BASE_URL}/drive/spreadsheets`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

// Fetch spreadsheet columns
export const fetchSpreadsheetColumns = (spreadsheetId) => {
  const token = getDriveToken();
  if (!token) {
    return Promise.reject(new Error("No drive token found"));
  }

  return axios.get(`${API_BASE_URL}/drive/spreadsheets/${spreadsheetId}/columns`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

// Fetch column data
export const fetchColumnData = (spreadsheetId, column) => {
  const token = getDriveToken();
  if (!token) {
    return Promise.reject(new Error("No drive token found"));
  }

  return axios.get(`${API_BASE_URL}/drive/spreadsheets/${spreadsheetId}/columns/${column}/data`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};


// Updated sendEmails function in api.js
export const sendEmails = async (templateContent, recipients, templateName) => {
  try {
      // Get user info from localStorage
      const userInfo = JSON.parse(localStorage.getItem("user-info") || "{}");
      
      if (!userInfo.token) {
          console.error("No authentication token found");
          return Promise.reject(new Error("Authentication required"));
      }

      console.log("Sending emails with subject:", templateName);
      
      const response = await axios.post(`${API_BASE_URL}/drive/send-emails`, {
          templateContent,
          recipients,
          templateName
      }, {
          headers: {
              Authorization: `Bearer ${userInfo.token}`,
          },
      });
      
      console.log("Email sending response:", response.data);
      return response.data;
  } catch (error) {
      console.error("Error sending emails:", error.response?.data?.error || error.message);
      if (error.response) {
          console.error("Response status:", error.response.status);
          console.error("Response data:", error.response.data);
      }
      throw error;
  }
};
