// api.js - Enhanced with NO timeouts and progress tracking - COMPLETE VERSION
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

// Create enhanced axios instance with NO TIMEOUT for specific operations
const createApiInstance = (timeout = 30000) => {
  const config = {
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  // Only add timeout if specified and not 0 (0 means no timeout)
  if (timeout > 0) {
    config.timeout = timeout;
  }
  
  const apiInstance = axios.create(config);

  // Enhanced request interceptor
  apiInstance.interceptors.request.use(
    async (config) => {
      const authExcludedPaths = ["/auth/google", "/auth/connect-drive"];
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

// Create default API instance with 30 second timeout for regular operations
const api = createApiInstance(30000);

// Create API instance with NO TIMEOUT for lead generation operations
const leadApi = createApiInstance(0); // 0 = no timeout at all

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
        "/api/drive/send-emails",
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
    const response = await api.get("/api/drive/scheduled-emails");
    console.log("Scheduled emails:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error getting scheduled emails:", error);
    throw error;
  }
};

export const getEmailHistory = async () => {
  try {
    const response = await api.get("/api/drive/email-history");
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
      `/api/drive/scheduled-emails/${scheduledEmailId}`
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
      `${API_BASE_URL}/api/drive/email-status`
    );
    console.log("Request payload:", { recipients, emailSubject });

    const response = await api.post("/api/drive/email-status", {
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
    const response = await axios.get(`${API_BASE_URL}/api/drive/connect-drive`, {
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
    const response = await api.get("/api/drive/spreadsheets");
    return response.data;
  } catch (error) {
    console.error("Error fetching spreadsheets:", error);
    throw error;
  }
};

export const fetchSpreadsheetColumns = async (spreadsheetId) => {
  try {
    const response = await api.get(
      `/api/drive/spreadsheets/${spreadsheetId}/columns`
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
      `/api/drive/spreadsheets/${spreadsheetId}/columns/${column}/data`
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

// Start lead generation - returns immediately with searchId (NO TIMEOUT)
export const generateLeads = async (searchData) => {
  try {
    console.log("Starting lead generation with data:", searchData);
    
    // Validate required fields
    if (!searchData.keyword || !searchData.location) {
      throw new Error("Keyword and location are required");
    }
    
    if (!searchData.userId) {
      throw new Error("User ID is required");
    }
    
    // Use NO TIMEOUT API instance for lead generation
    const response = await leadApi.post('/api/leads/generate', {
      ...searchData,
      // Ensure all required fields are present with defaults
      platforms: Array.isArray(searchData.platforms) ? searchData.platforms : ['google'],
      maxResults: parseInt(searchData.maxResults) || 20,
      qualityThreshold: parseInt(searchData.qualityThreshold) || 50,
      enableGeminiValidation: searchData.enableGeminiValidation !== false,
      enableIndividualSearch: searchData.enableIndividualSearch !== false,
      enableVerification: searchData.enableVerification !== false,
      deepCrawl: searchData.deepCrawl !== false
    });
    
    console.log("Lead generation API response:", response.data);
    
    if (!response.data.success) {
      throw new Error(response.data.error || "Failed to start lead generation");
    }
    
    if (!response.data.searchId) {
      throw new Error("No search ID returned from server");
    }
    
    return response.data;
  } catch (error) {
    console.error('Error starting lead generation:', {
      message: error.response?.data?.message || error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    throw new Error(error.response?.data?.error || error.message || "Failed to start lead generation");
  }
};

// Poll for progress updates - NO TIMEOUT
export const getSearchProgress = async (searchId) => {
  try {
    if (!searchId) {
      throw new Error("Search ID is required");
    }
    
    console.log("Fetching progress for search:", searchId);
    const response = await leadApi.get(`/api/leads/progress/${searchId}`);
    
    console.log("Progress API response:", {
      success: response.data.success,
      status: response.data.status,
      percentage: response.data.progress?.percentage,
      phase: response.data.progress?.currentPhase,
      completed: response.data.completed
    });
    
    if (!response.data.success) {
      throw new Error(response.data.error || "Failed to fetch progress");
    }
    
    return response.data;
  } catch (error) {
    console.error('Error fetching search progress:', {
      searchId,
      message: error.response?.data?.message || error.message,
      status: error.response?.status
    });
    throw error;
  }
};

// Get leads with proper error handling for dashboard
export const getLeads = async (params = {}) => {
  try {
    console.log("Fetching leads with params:", params);
    
    const response = await api.get('/api/leads', { 
      params: {
        page: params.page || 1,
        limit: params.limit || 20,
        ...params
      }
    });
    
    console.log("Raw leads response:", {
      success: response.data.success,
      hasSearches: !!response.data.searches,
      searchesIsArray: Array.isArray(response.data.searches),
      searchCount: response.data.searches?.length || 0
    });
    
    if (!response.data.success) {
      throw new Error(response.data.error || "Failed to fetch leads");
    }
    
    // Ensure the response has the expected structure
    const formattedResponse = {
      success: true,
      searches: Array.isArray(response.data.searches) ? response.data.searches : [],
      pagination: response.data.pagination || {
        page: 1,
        limit: 20,
        totalCount: 0,
        totalPages: 0
      }
    };
    
    console.log("Formatted leads response:", {
      success: formattedResponse.success,
      searchCount: formattedResponse.searches.length,
      pagination: formattedResponse.pagination
    });
    
    return formattedResponse;
    
  } catch (error) {
    console.error('Error fetching leads:', {
      message: error.response?.data?.message || error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    
    // Return a safe default structure to prevent crashes
    return {
      success: false,
      error: error.message || "Failed to fetch leads",
      searches: [],
      pagination: {
        page: 1,
        limit: 20,
        totalCount: 0,
        totalPages: 0
      }
    };
  }
};

export const getSearchDetail = async (searchId) => {
  try {
    if (!searchId) {
      throw new Error("Search ID is required");
    }
    
    console.log("Fetching search detail:", searchId);
    const response = await api.get(`/api/leads/search/${searchId}`);
    
    console.log("Raw search detail response:", {
      success: response.data.success,
      hasSearch: !!response.data.search,
      contactCount: response.data.search?.contacts?.length || 0,
      status: response.data.search?.status
    });
    
    if (!response.data.success) {
      throw new Error(response.data.error || "Search not found");
    }
    
    if (!response.data.search) {
      throw new Error("Search data not found");
    }
    
    // Ensure contacts array exists and is properly formatted
    const searchData = {
      ...response.data.search,
      contacts: Array.isArray(response.data.search.contacts) ? 
        response.data.search.contacts.map(contact => ({
          ...contact,
          emails: Array.isArray(contact.emails) ? contact.emails : [],
          phones: Array.isArray(contact.phones) ? contact.phones : [],
          socialLinks: Array.isArray(contact.socialLinks) ? contact.socialLinks : [],
          tags: Array.isArray(contact.tags) ? contact.tags : [],
          businessName: contact.businessName || 'Unknown Business',
          description: contact.description || '',
          notes: contact.notes || '',
          qualityScore: contact.qualityScore || 0
        })) : []
    };
    
    console.log("Processed search detail:", {
      searchId: searchData.searchId,
      status: searchData.status,
      contactCount: searchData.contacts.length,
      keyword: searchData.keyword,
      location: searchData.location
    });
    
    return {
      success: true,
      search: searchData
    };
    
  } catch (error) {
    console.error('Error fetching search detail:', {
      searchId,
      message: error.response?.data?.message || error.message,
      status: error.response?.status
    });
    throw error;
  }
};

export const updateLead = async (searchId, contactIndex, data) => {
  try {
    if (!searchId || contactIndex === undefined) {
      throw new Error("Search ID and contact index are required");
    }
    
    console.log("Updating lead:", { searchId, contactIndex, data });
    
    const response = await api.put(`/api/leads/${searchId}/contact/${contactIndex}`, data);
    
    if (!response.data.success) {
      throw new Error(response.data.error || "Failed to update lead");
    }
    
    console.log("Lead update successful:", response.data);
    return response.data;
    
  } catch (error) {
    console.error('Error updating lead:', {
      searchId,
      contactIndex,
      message: error.response?.data?.message || error.message,
      status: error.response?.status
    });
    throw error;
  }
};

export const deleteLeadSearch = async (searchId) => {
  try {
    if (!searchId) {
      throw new Error("Search ID is required");
    }
    
    console.log("Deleting lead search:", searchId);
    const response = await api.delete(`/api/leads/${searchId}`);
    
    if (!response.data.success) {
      throw new Error(response.data.error || "Failed to delete search");
    }
    
    console.log("Search deleted successfully:", searchId);
    return response.data;
    
  } catch (error) {
    console.error('Error deleting lead search:', {
      searchId,
      message: error.response?.data?.message || error.message,
      status: error.response?.status
    });
    throw error;
  }
};

export const getLeadStats = async (params = {}) => {
  try {

    const userInfo = JSON.parse(localStorage.getItem("user-info") || "{}");
    const userId = userInfo.email || userInfo.userId;
    console.log("Fetching lead statistics with params:", params);
    
    const response = await api.get('/api/leads/stats', { 
      params: {
        userId: userId,
        days: params.days || 30,
        ...params
      }
    });
    
    console.log("Raw stats response:", {
      success: response.data.success,
      hasStats: !!response.data.stats
    });
    
    if (!response.data.success) {
      throw new Error(response.data.error || "Failed to fetch statistics");
    }
    
    // Ensure stats object exists with default values
    const stats = response.data.stats || {
      totalSearches: 0,
      totalLeads: 0,
      totalQualityLeads: 0,
      avgQualityScore: 0,
      totalUrlsCrawled: 0,
      totalSuccessfulCrawls: 0,
      totalGeminiValidations: 0,
      avgValidationScore: 0
    };
    
    console.log("Processed stats:", stats);
    
    return {
      success: true,
      stats
    };
    
  } catch (error) {
    console.error('Error fetching lead stats:', {
      message: error.response?.data?.message || error.message,
      status: error.response?.status
    });
    
    // Return safe defaults
    return {
      success: false,
      error: error.message || "Failed to fetch statistics",
      stats: {
        totalSearches: 0,
        totalLeads: 0,
        totalQualityLeads: 0,
        avgQualityScore: 0,
        totalUrlsCrawled: 0,
        totalSuccessfulCrawls: 0,
        totalGeminiValidations: 0,
        avgValidationScore: 0
      }
    };
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
  // Core functions
  generateLeads: (data) => generateLeads(data),
  getSearchProgress: (searchId) => getSearchProgress(searchId),
  getLeads: (params) => getLeads(params),
  getSearchDetail: (searchId) => getSearchDetail(searchId),
  updateLead: (searchId, contactIndex, data) => updateLead(searchId, contactIndex, data),
  deleteLeadSearch: (searchId) => deleteLeadSearch(searchId),
  getStats: (params) => getLeadStats(params),
  
  // Backward compatibility methods
  getHistory: (page = 1, limit = 20) => getLeads({ page, limit }),
  getDetails: (searchId) => getSearchDetail(searchId),
  updateNotes: (searchId, contactIndex, data) => updateLead(searchId, contactIndex, data),
  deleteSearch: (searchId) => deleteLeadSearch(searchId),
  updateContact: (searchId, contactIndex, data) => updateLead(searchId, contactIndex, data)
};