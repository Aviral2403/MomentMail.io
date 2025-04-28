import axios from 'axios';

// Base URL for the backend API
const API_BASE_URL = 'https://momentmail-io-backend.onrender.com';

// // Helper function to get the auth token from localStorage
// const getDriveToken = () => {
//   try {
//     const userInfo = JSON.parse(localStorage.getItem("user-info") || "{}");
//     return userInfo.driveToken;
//   } catch (error) {
//     console.error("Error getting drive token:", error);
//     return null;
//   }
// };


// Debounce function to prevent duplicate API calls
const debounce = (fn, delay) => {
  let timeoutId;
  let lastArgs;
  let lastThis;
  let lastPromise;
  let isRunning = false;

  return function(...args) {
    const context = this;

    // Return existing promise if a call is already in progress with the same args
    if (isRunning && 
        JSON.stringify(lastArgs) === JSON.stringify(args) && 
        lastThis === context) {
      return lastPromise;
    }

    // Clear any existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    return new Promise((resolve, reject) => {
      // Execute the function after delay
      timeoutId = setTimeout(() => {
        isRunning = true;
        lastArgs = args;
        lastThis = context;
        
        lastPromise = fn.apply(context, args)
          .then(result => {
            isRunning = false;
            resolve(result);
            return result;
          })
          .catch(error => {
            isRunning = false;
            reject(error);
            throw error;
          });
      }, delay);
    });
  };
};



// Google Auth
export const googleAuth = (code) => {
  return axios.get(`${API_BASE_URL}/auth/google?code=${code}`);
};



// Unified email sending function with debounce to prevent duplicates
export const sendEmails = debounce(async (templateContent, recipients, templateName, options = {}) => {
  try {
      const { isScheduled = false, scheduledAt = null } = options;
      const userInfo = JSON.parse(localStorage.getItem("user-info") || "{}");
      
      if (!userInfo.token) {
          console.error("No authentication token found");
          throw new Error("Authentication required");
      }

      console.log("Sending emails with options:", {
          templateName,
          recipientCount: recipients.length,
          isScheduled,
          scheduledAt: scheduledAt || 'immediate'
      });

      const response = await axios.post(`${API_BASE_URL}/drive/send-emails`, {
          templateContent,
          recipients,
          templateName,
          isScheduled,
          scheduledAt
      }, {
          headers: {
              Authorization: `Bearer ${userInfo.token}`,
          },
      });

      console.log("Email API response:", response.data);
      return response.data;
  } catch (error) {
      console.error("Email API error:", {
          message: error.response?.data?.message || error.message,
          status: error.response?.status,
          data: error.response?.data
      });
      throw error;
  }
}, 300); // 300ms debounce

// Get scheduled emails
export const getScheduledEmails = async () => {
  try {
      const userInfo = JSON.parse(localStorage.getItem("user-info") || "{}");
      
      if (!userInfo.token) {
          console.error("No authentication token found");
          throw new Error("Authentication required");
      }

      const response = await axios.get(`${API_BASE_URL}/drive/scheduled-emails`, {
          headers: {
              Authorization: `Bearer ${userInfo.token}`,
          },
      });

      console.log("Scheduled emails:", response.data);
      return response.data;
  } catch (error) {
      console.error("Error getting scheduled emails:", error);
      throw error;
  }
};

// Get email history
export const getEmailHistory = async () => {
  try {
      const userInfo = JSON.parse(localStorage.getItem("user-info") || "{}");
      
      if (!userInfo.token) {
          console.error("No authentication token found");
          throw new Error("Authentication required");
      }

      const response = await axios.get(`${API_BASE_URL}/drive/email-history`, {
          headers: {
              Authorization: `Bearer ${userInfo.token}`,
          },
      });

      console.log("Email history:", response.data);
      return response.data;
  } catch (error) {
      console.error("Error getting email history:", error);
      throw error;
  }
};

// Cancel scheduled email
export const cancelScheduledEmail = async (scheduledEmailId) => {
  try {
      const userInfo = JSON.parse(localStorage.getItem("user-info") || "{}");
      
      if (!userInfo.token) {
          console.error("No authentication token found");
          throw new Error("Authentication required");
      }

      const response = await axios.delete(`${API_BASE_URL}/drive/scheduled-emails/${scheduledEmailId}`, {
          headers: {
              Authorization: `Bearer ${userInfo.token}`,
          },
      });

      console.log("Cancelled scheduled email:", response.data);
      return response.data;
  } catch (error) {
      console.error("Error cancelling scheduled email:", error);
      throw error;
  }
};

// Google Drive functions
export const fetchSpreadsheets = async () => {
  try {
      const userInfo = JSON.parse(localStorage.getItem("user-info") || "{}");
      
      if (!userInfo.driveToken) {
          console.error("No drive token found");
          throw new Error("Google Drive connection required");
      }

      const response = await axios.get(`${API_BASE_URL}/drive/spreadsheets`, {
          headers: {
              Authorization: `Bearer ${userInfo.driveToken}`,
          },
      });

      return response.data;
  } catch (error) {
      console.error("Error fetching spreadsheets:", error);
      throw error;
  }
};

export const fetchSpreadsheetColumns = async (spreadsheetId) => {
  try {
      const userInfo = JSON.parse(localStorage.getItem("user-info") || "{}");
      
      if (!userInfo.driveToken) {
          throw new Error("Google Drive connection required");
      }

      const response = await axios.get(`${API_BASE_URL}/drive/spreadsheets/${spreadsheetId}/columns`, {
          headers: {
              Authorization: `Bearer ${userInfo.driveToken}`,
          },
      });

      return response.data;
  } catch (error) {
      console.error("Error fetching spreadsheet columns:", error);
      throw error;
  }
};

export const fetchColumnData = async (spreadsheetId, column) => {
  try {
      const userInfo = JSON.parse(localStorage.getItem("user-info") || "{}");
      
      if (!userInfo.driveToken) {
          throw new Error("Google Drive connection required");
      }

      const response = await axios.get(`${API_BASE_URL}/drive/spreadsheets/${spreadsheetId}/columns/${column}/data`, {
          headers: {
              Authorization: `Bearer ${userInfo.driveToken}`,
          },
      });

      return response.data;
  } catch (error) {
      console.error("Error fetching column data:", error);
      throw error;
  }
};

export const connectGoogleDrive = async (code) => {
  try {
      const response = await axios.get(`${API_BASE_URL}/drive/connect-drive`, {
          params: { code },
      });
      return response.data;
  } catch (error) {
      console.error("Error connecting Google Drive:", error);
      throw error;
  }
};