// api.js - Updated with token refresh logic
import axios from 'axios';

const API_BASE_URL = 'https://momentmail-io-backend.onrender.com';

// Token refresh function
export const refreshAuthToken = async (token) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, { token });
    return response.data;
  } catch (error) {
    console.error('Error refreshing auth token:', error);
    throw error;
  }
};

// Create axios instance with interceptors
const createApiInstance = () => {
  const apiInstance = axios.create({
    baseURL: API_BASE_URL,
  });

  // Request interceptor to add auth header
  apiInstance.interceptors.request.use(
    (config) => {
      const userInfo = JSON.parse(localStorage.getItem("user-info") || "{}");
      if (userInfo.token) {
        config.headers.Authorization = `Bearer ${userInfo.token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor to handle token refresh
  apiInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      if (error.response?.status === 401 && 
          (error.response?.data?.expired || error.response?.data?.requiresRefresh) && 
          !originalRequest._retry) {
        
        originalRequest._retry = true;

        try {
          const userInfo = JSON.parse(localStorage.getItem("user-info") || "{}");
          
          if (!userInfo.token) {
            throw new Error('No token available for refresh');
          }

          const refreshResult = await refreshAuthToken(userInfo.token);
          
          if (refreshResult.requiresReauth) {
            // Clear local storage and redirect to login
            localStorage.removeItem("user-info");
            window.location.href = '/login';
            return Promise.reject(error);
          }

          // Update token in localStorage
          const updatedUserInfo = { ...userInfo, token: refreshResult.token };
          localStorage.setItem("user-info", JSON.stringify(updatedUserInfo));

          // Update the failed request with new token
          originalRequest.headers.Authorization = `Bearer ${refreshResult.token}`;
          
          return apiInstance(originalRequest);
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          localStorage.removeItem("user-info");
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );

  return apiInstance;
};

const api = createApiInstance();

// Debounce function (keep your existing implementation)
const debounce = (fn, delay) => {
  let timeoutId;
  let lastArgs;
  let lastThis;
  let lastPromise;
  let isRunning = false;

  return function(...args) {
    const context = this;

    if (isRunning && 
        JSON.stringify(lastArgs) === JSON.stringify(args) && 
        lastThis === context) {
      return lastPromise;
    }

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    return new Promise((resolve, reject) => {
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

// Updated API functions using the interceptor-enabled instance
export const googleAuth = (code) => {
  return axios.get(`${API_BASE_URL}/auth/google?code=${code}`);
};

export const sendEmails = debounce(async (templateContent, recipients, templateName, options = {}) => {
  try {
    const { isScheduled = false, scheduledAt = null } = options;
    const userInfo = JSON.parse(localStorage.getItem("user-info") || "{}");

    console.log("Sending emails with options:", {
      templateName,
      recipientCount: recipients.length,
      isScheduled,
      scheduledAt: scheduledAt || 'immediate'
    });

    const response = await api.post('/drive/send-emails', {
      templateContent,
      recipients,
      templateName,
      isScheduled,
      scheduledAt
    }, {
      headers: {
        'X-Request-ID': `${userInfo.email}-${templateName}-${Date.now()}`
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
}, 300);

export const getScheduledEmails = async () => {
  try {
    const response = await api.get('/drive/scheduled-emails');
    console.log("Scheduled emails:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error getting scheduled emails:", error);
    throw error;
  }
};

export const getEmailHistory = async () => {
  try {
    const response = await api.get('/drive/email-history');
    console.log("Email history:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error getting email history:", error);
    throw error;
  }
};

export const cancelScheduledEmail = async (scheduledEmailId) => {
  try {
    const response = await api.delete(`/drive/scheduled-emails/${scheduledEmailId}`);
    console.log("Cancelled scheduled email:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error cancelling scheduled email:", error);
    throw error;
  }
};

export const fetchSpreadsheets = async () => {
  try {
    const response = await api.get('/drive/spreadsheets');
    return response.data;
  } catch (error) {
    console.error("Error fetching spreadsheets:", error);
    throw error;
  }
};

export const fetchSpreadsheetColumns = async (spreadsheetId) => {
  try {
    const response = await api.get(`/drive/spreadsheets/${spreadsheetId}/columns`);
    return response.data;
  } catch (error) {
    console.error("Error fetching spreadsheet columns:", error);
    throw error;
  }
};

export const fetchColumnData = async (spreadsheetId, column) => {
  try {
    const response = await api.get(`/drive/spreadsheets/${spreadsheetId}/columns/${column}/data`);
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

export const getEmailStatus = async (recipients, emailSubject) => {
  try {
    console.log("Making email status request to:", `${API_BASE_URL}/drive/email-status`);
    console.log("Request payload:", { recipients, emailSubject });
    
    const response = await api.post('/drive/email-status', {
      recipients,
      emailSubject,
    });

    console.log("Email status response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error checking email status:", error);
    
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    } else if (error.request) {
      console.error("No response received:", error.request);
    }
    
    return { status: 'unknown', error: error.message };
  }
};