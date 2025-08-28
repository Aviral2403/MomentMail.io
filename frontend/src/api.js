// api.js - Enhanced with better token management and lead generation handling
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

// Enhanced token refresh function
export const refreshAuthToken = async (token) => {
  console.log("Attempting token refresh...");
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
      token,
    });
    
    console.log("Token refresh successful:", {
      refreshed: response.data.refreshed,
      new_expiry: response.data.refreshed
        ? new Date(
            Date.now() +
              parseInt(import.meta.env.VITE_JWT_TIMEOUT || "3600") * 1000
          ).toISOString()
        : "not refreshed",
    });
    
    return response.data;
  } catch (error) {
    console.error("Token refresh failed:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    throw error;
  }
};

// Enhanced token validation
const isTokenExpiringSoon = (token) => {
  if (!token) return true;
  
  try {
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) return true;
    
    const payload = JSON.parse(atob(tokenParts[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = payload.exp - currentTime;
    
    // Return true if token expires in less than 2 minutes
    return timeUntilExpiry <= 120;
  } catch (error) {
    console.error('Token validation error:', error);
    return true;
  }
};

// Create enhanced axios instance with interceptors
const createApiInstance = (timeout = 30000) => {
  const apiInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Enhanced request interceptor
  apiInstance.interceptors.request.use(
    async (config) => {
      const authExcludedPaths = ["/auth/google", "/drive/connect-drive"];
      const isAuthExcluded = authExcludedPaths.some((path) =>
        config.url?.includes(path)
      );

      if (!isAuthExcluded) {
        let userInfo = JSON.parse(localStorage.getItem("user-info") || "{}");
        let token = userInfo.token || localStorage.getItem("token");
        
        if (token) {
          // Check if token is expiring soon and refresh preemptively
          if (isTokenExpiringSoon(token)) {
            console.log('Token expiring soon, refreshing before request...');
            try {
              const refreshResult = await refreshAuthToken(token);
              if (refreshResult.refreshed && refreshResult.token) {
                token = refreshResult.token;
                userInfo = { ...userInfo, token: refreshResult.token };
                localStorage.setItem('user-info', JSON.stringify(userInfo));
                localStorage.setItem('token', refreshResult.token);
              }
            } catch (refreshError) {
              console.error('Preemptive token refresh failed:', refreshError);
              // Continue with existing token
            }
          }
          
          config.headers.Authorization = `Bearer ${token}`;
          console.log("Adding auth token to request:", config.url);
        }
      }
      return config;
    },
    (error) => {
      console.error("Request interceptor error:", error);
      return Promise.reject(error);
    }
  );

  // Enhanced response interceptor
  apiInstance.interceptors.response.use(
    (response) => {
      console.log("API Success:", {
        url: response.config.url,
        status: response.status,
        method: response.config.method,
        dataSize: response.data ? JSON.stringify(response.data).length : 0
      });
      return response;
    },
    async (error) => {
      console.log("API Error:", {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        message: error.message,
        data: error.response?.data,
      });

      const originalRequest = error.config;

      // Enhanced 401 handling
      if (error.response?.status === 401 && !originalRequest._retry) {
        console.log("401 Unauthorized - attempting token refresh");
        originalRequest._retry = true;

        try {
          const userInfo = JSON.parse(localStorage.getItem("user-info") || "{}");
          const token = userInfo.token || localStorage.getItem("token");
          
          if (!token) {
            console.log("No token available for refresh, redirecting to login");
            localStorage.removeItem("user-info");
            localStorage.removeItem("token");
            window.location.href = "/login";
            return Promise.reject(error);
          }

          const refreshResult = await refreshAuthToken(token);

          if (refreshResult.requiresReauth) {
            console.log("Refresh requires reauthentication");
            localStorage.removeItem("user-info");
            localStorage.removeItem("token");
            window.location.href = "/login";
            return Promise.reject(error);
          }

          if (refreshResult.refreshed && refreshResult.token) {
            console.log("Token refreshed successfully, retrying original request");
            const updatedUserInfo = { ...userInfo, token: refreshResult.token };
            localStorage.setItem("user-info", JSON.stringify(updatedUserInfo));
            localStorage.setItem("token", refreshResult.token);

            originalRequest.headers.Authorization = `Bearer ${refreshResult.token}`;
            return apiInstance(originalRequest);
          }
        } catch (refreshError) {
          console.error("Token refresh failed during error handling:", refreshError);
          localStorage.removeItem("user-info");
          localStorage.removeItem("token");
          window.location.href = "/login";
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );

  return apiInstance;
};

// Create default API instance
const api = createApiInstance();

// Create API instance with extended timeout for lead generation
const leadApi = createApiInstance(300000); // 5 minutes timeout

// Debounce function for preventing duplicate requests
const debounce = (fn, delay) => {
  let timeoutId;
  let lastArgs;
  let lastThis;
  let lastPromise;
  let isRunning = false;

  return function (...args) {
    const context = this;

    if (
      isRunning &&
      JSON.stringify(lastArgs) === JSON.stringify(args) &&
      lastThis === context
    ) {
      console.log("Debounce: returning existing promise");
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
        console.log("Executing debounced function after delay");
        lastPromise = fn
          .apply(context, args)
          .then((result) => {
            isRunning = false;
            resolve(result);
            return result;
          })
          .catch((error) => {
            isRunning = false;
            reject(error);
            throw error;
          });
      }, delay);
    });
  };
};

// === AUTHENTICATION APIs ===
export const googleAuth = (code) => {
  return axios.get(`${API_BASE_URL}/auth/google?code=${code}`);
};

// === EMAIL APIs ===
export const sendEmails = debounce(
  async (templateContent, recipients, templateName, options = {}) => {
    try {
      const { isScheduled = false, scheduledAt = null } = options;
      const userInfo = JSON.parse(localStorage.getItem("user-info") || "{}");

      console.log("Sending emails with options:", {
        templateName,
        recipientCount: recipients.length,
        isScheduled,
        scheduledAt: scheduledAt || "immediate",
      });

      const response = await api.post(
        "/drive/send-emails",
        {
          templateContent,
          recipients,
          templateName,
          isScheduled,
          scheduledAt,
        },
        {
          headers: {
            "X-Request-ID": `${userInfo.email}-${templateName}-${Date.now()}`,
          },
        }
      );

      console.log("Email API response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Email API error:", {
        message: error.response?.data?.message || error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      throw error;
    }
  },
  300
);

export const getScheduledEmails = async () => {
  try {
    const response = await api.get("/drive/scheduled-emails");
    console.log("Scheduled emails:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error getting scheduled emails:", error);
    throw error;
  }
};

export const getEmailHistory = async () => {
  try {
    const response = await api.get("/drive/email-history");
    console.log("Email history:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error getting email history:", error);
    throw error;
  }
};

export const cancelScheduledEmail = async (scheduledEmailId) => {
  try {
    const response = await api.delete(
      `/drive/scheduled-emails/${scheduledEmailId}`
    );
    console.log("Cancelled scheduled email:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error cancelling scheduled email:", error);
    throw error;
  }
};

export const getEmailStatus = async (recipients, emailSubject) => {
  try {
    console.log(
      "Making email status request to:",
      `${API_BASE_URL}/drive/email-status`
    );
    console.log("Request payload:", { recipients, emailSubject });

    const response = await api.post("/drive/email-status", {
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

    return { status: "unknown", error: error.message };
  }
};

// === GOOGLE DRIVE APIs ===
export const connectGoogleDrive = async (code) => {
  console.log('Connecting Google Drive with code:', code ? 'present' : 'missing');
  try {
    const response = await axios.get(`${API_BASE_URL}/drive/connect-drive`, {
      params: { code }
    });
    console.log('Drive connection successful:', response.data);
    return response.data;
  } catch (error) {
    console.error('Drive connection failed:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};

export const fetchSpreadsheets = async () => {
  try {
    const response = await api.get("/drive/spreadsheets");
    return response.data;
  } catch (error) {
    console.error("Error fetching spreadsheets:", error);
    throw error;
  }
};

export const fetchSpreadsheetColumns = async (spreadsheetId) => {
  try {
    const response = await api.get(
      `/drive/spreadsheets/${spreadsheetId}/columns`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching spreadsheet columns:", error);
    throw error;
  }
};

export const fetchColumnData = async (spreadsheetId, column) => {
  try {
    const response = await api.get(
      `/drive/spreadsheets/${spreadsheetId}/columns/${column}/data`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching column data:", error);
    throw error;
  }
};

// === TEMPLATE APIs ===
export const saveTemplate = async (templateData) => {
  try {
    const response = await api.post('/api/templates', templateData);
    return response.data;
  } catch (error) {
    console.error('Error saving template:', error);
    throw error;
  }
};

export const getUserTemplates = async () => {
  try {
    const response = await api.get('/api/templates');
    return response.data;
  } catch (error) {
    console.error('Error getting templates:', error);
    throw error;
  }
};

export const getTemplate = async (templateId) => {
  try {
    const response = await api.get(`/api/templates/${templateId}`);
    return response.data;
  } catch (error) {
    console.error('Error getting template:', error);
    throw error;
  }
};

export const updateTemplate = async (templateId, templateData) => {
  try {
    const response = await api.put(`/api/templates/${templateId}`, templateData);
    return response.data;
  } catch (error) {
    console.error('Error updating template:', error);
    throw error;
  }
};

export const deleteTemplate = async (templateId) => {
  try {
    const response = await api.delete(`/api/templates/${templateId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting template:', error);
    throw error;
  }
};

export const uploadImage = async (formData) => {
  try {
    const response = await api.post('/api/templates/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

// === LEAD GENERATION APIs ===
export const generateLeads = async (searchData) => {
  try {
    console.log("Generating leads with data:", searchData);
    const response = await leadApi.post('/api/leads/generate', searchData);
    console.log("Lead generation response:", response.data);
    return response.data;
  } catch (error) {
    console.error('Error generating leads:', {
      message: error.response?.data?.message || error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    throw error;
  }
};

export const getLeads = async (params = {}) => {
  try {
    console.log("Fetching leads with params:", params);
    const response = await api.get('/api/leads', { params });
    console.log("Leads fetch response:", response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching leads:', error);
    throw error;
  }
};

export const getSearchDetail = async (searchId) => {
  try {
    console.log("Fetching search detail:", searchId);
    const response = await api.get(`/api/leads/search/${searchId}`);
    console.log("Search detail response:", response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching search detail:', error);
    throw error;
  }
};

export const updateLead = async (searchId, contactIndex, data) => {
  try {
    console.log("Updating lead:", searchId, contactIndex, data);
    const response = await api.put(`/api/leads/${searchId}/contact/${contactIndex}`, data);
    console.log("Lead update response:", response.data);
    return response.data;
  } catch (error) {
    console.error('Error updating lead:', error);
    throw error;
  }
};

export const deleteLeadSearch = async (searchId) => {
  try {
    console.log("Deleting lead search:", searchId);
    const response = await api.delete(`/api/leads/${searchId}`);
    console.log("Lead search delete response:", response.data);
    return response.data;
  } catch (error) {
    console.error('Error deleting lead search:', error);
    throw error;
  }
};

export const getLeadStats = async () => {
  try {
    console.log("Fetching lead statistics");
    const response = await api.get('/api/leads/stats');
    console.log("Lead stats response:", response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching lead stats:', error);
    throw error;
  }
};

// === LEGACY LEAD APIs (for backward compatibility) ===
export const getLeadHistory = async (page = 1, limit = 20) => {
  try {
    const response = await api.get(`/api/leads?page=${page}&limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching lead history:', error);
    throw error;
  }
};

export const getLeadDetails = async (id) => {
  try {
    const response = await api.get(`/api/leads/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching lead details:', error);
    throw error;
  }
};

export const updateLeadNotes = async (leadId, updateData) => {
  try {
    const response = await api.put(`/api/leads/${leadId}`, updateData);
    return response.data;
  } catch (error) {
    console.error('Error updating lead notes:', error);
    throw error;
  }
};

export const deleteSearch = async (id) => {
  try {
    const response = await api.delete(`/api/leads/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting search:', error);
    throw error;
  }
};

// === HEALTH CHECK API ===
export const getHealthStatus = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    console.error('Error getting health status:', error);
    throw error;
  }
};

// === STRUCTURED LEAD API OBJECT ===
export const leadAPI = {
  generateLeads: (data) => generateLeads(data),
  getLeads: (params) => getLeads(params),
  getSearchDetail: (searchId) => getSearchDetail(searchId),
  updateLead: (searchId, contactIndex, data) => updateLead(searchId, contactIndex, data),
  deleteLeadSearch: (searchId) => deleteLeadSearch(searchId),
  getStats: () => getLeadStats(),
  
  // Legacy methods for backward compatibility
  getHistory: (page, limit) => getLeadHistory(page, limit),
  getDetails: (id) => getLeadDetails(id),
  updateNotes: (id, data) => updateLeadNotes(id, data),
  deleteSearch: (id) => deleteSearch(id),
};

// Note: Using named exports only to maintain consistency with existing codebase