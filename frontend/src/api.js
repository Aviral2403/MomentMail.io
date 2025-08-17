// api.js - Enhanced with better token management and lead generation handling
import axios from "axios";

const API_BASE_URL = "http://localhost:8080";

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
const createApiInstance = () => {
  const apiInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
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
        
        if (userInfo.token) {
          // Check if token is expiring soon and refresh preemptively
          if (isTokenExpiringSoon(userInfo.token)) {
            console.log('Token expiring soon, refreshing before request...');
            try {
              const refreshResult = await refreshAuthToken(userInfo.token);
              if (refreshResult.refreshed && refreshResult.token) {
                userInfo = { ...userInfo, token: refreshResult.token };
                localStorage.setItem('user-info', JSON.stringify(userInfo));
              }
            } catch (refreshError) {
              console.error('Preemptive token refresh failed:', refreshError);
              // Continue with existing token
            }
          }
          
          config.headers.Authorization = `Bearer ${userInfo.token}`;
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
          if (!userInfo.token) {
            console.log("No token available for refresh, redirecting to login");
            localStorage.removeItem("user-info");
            window.location.href = "/login";
            return Promise.reject(error);
          }

          const refreshResult = await refreshAuthToken(userInfo.token);

          if (refreshResult.requiresReauth) {
            console.log("Refresh requires reauthentication");
            localStorage.removeItem("user-info");
            window.location.href = "/login";
            return Promise.reject(error);
          }

          if (refreshResult.refreshed && refreshResult.token) {
            console.log("Token refreshed successfully, retrying original request");
            const updatedUserInfo = { ...userInfo, token: refreshResult.token };
            localStorage.setItem("user-info", JSON.stringify(updatedUserInfo));

            originalRequest.headers.Authorization = `Bearer ${refreshResult.token}`;
            return apiInstance(originalRequest);
          }
        } catch (refreshError) {
          console.error("Token refresh failed during error handling:", refreshError);
          localStorage.removeItem("user-info");
          window.location.href = "/login";
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );

  return apiInstance;
};

const api = createApiInstance();

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

// Existing API functions (keeping them unchanged)
export const googleAuth = (code) => {
  return axios.get(`${API_BASE_URL}/auth/google?code=${code}`);
};

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

// Template API functions
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

// Enhanced Lead Generation API with better error handling and retry logic
const createLeadAPI = () => {
  const leadAPI = axios.create({
    baseURL: API_BASE_URL,
    timeout: 180000, // 3 minutes timeout for lead generation
  });

  // Add request interceptor to include auth token
  leadAPI.interceptors.request.use(
    async (config) => {
      console.log(`Making lead API request to: ${config.url}`);
      
      let userInfo = JSON.parse(localStorage.getItem("user-info") || "{}");
      
      if (userInfo?.token) {
        // Check token expiry before making request
        if (isTokenExpiringSoon(userInfo.token)) {
          console.log('Token expiring soon, refreshing before lead API request...');
          try {
            const refreshResult = await refreshAuthToken(userInfo.token);
            if (refreshResult.refreshed && refreshResult.token) {
              userInfo = { ...userInfo, token: refreshResult.token };
              localStorage.setItem('user-info', JSON.stringify(userInfo));
            }
          } catch (refreshError) {
            console.error('Token refresh failed before lead API request:', refreshError);
          }
        }
        
        config.headers.Authorization = `Bearer ${userInfo.token}`;
      }
      
      // Add request timestamp for debugging
      config.metadata = { startTime: Date.now() };
      
      return config;
    },
    (error) => {
      console.error('Lead API request interceptor error:', error);
      return Promise.reject(error);
    }
  );

  // Enhanced response interceptor for lead API
  leadAPI.interceptors.response.use(
    (response) => {
      const duration = response.config.metadata ? 
        Date.now() - response.config.metadata.startTime : 0;
      
      console.log('Lead API Success:', {
        url: response.config.url,
        method: response.config.method,
        status: response.status,
        duration: `${duration}ms`,
        dataSize: response.data ? JSON.stringify(response.data).length : 0
      });
      
      return response;
    },
    async (error) => {
      const duration = error.config?.metadata ? 
        Date.now() - error.config.metadata.startTime : 0;
        
      console.error('Lead API Error:', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        duration: `${duration}ms`,
        message: error.message,
        data: error.response?.data
      });
      
      // Enhanced error messages for different scenarios
      if (error.code === 'ECONNABORTED') {
        error.userMessage = 'The lead generation is taking longer than expected. This is normal for comprehensive searches. Please wait and the system will continue processing.';
      } else if (error.response?.status === 429) {
        const retryAfter = error.response.headers['retry-after'] || 60;
        error.userMessage = `You have made too many requests. Please wait ${retryAfter} seconds before trying again.`;
      } else if (error.response?.status === 401) {
        error.userMessage = 'Your session has expired. Please login again to continue.';
        // Auto-redirect to login
        setTimeout(() => {
          localStorage.removeItem('user-info');
          window.location.href = '/login';
        }, 2000);
      } else if (error.response?.status >= 500) {
        error.userMessage = 'Server error occurred during lead generation. Please try again in a few minutes.';
      } else if (error.response?.status === 422) {
        error.userMessage = error.response.data?.message || 'No leads could be generated with the current search parameters. Try different keywords or sources.';
      } else if (!error.response) {
        error.userMessage = 'Network connectivity issue. Please check your internet connection and try again.';
      }
      
      return Promise.reject(error);
    }
  );

  return leadAPI;
};

const leadAPI = createLeadAPI();

// Enhanced lead generation function with retry logic
export const generateLeads = async (data, onProgress) => {
  const startTime = Date.now();
  console.log('='.repeat(50));
  console.log('STARTING LEAD GENERATION REQUEST');
  console.log('='.repeat(50));
  console.log('Request data:', data);
  
  try {
    // Enhanced validation
    if (!data.keyword || data.keyword.trim().length < 2) {
      throw new Error('Keyword must be at least 2 characters long');
    }

    if (!data.sources || !Array.isArray(data.sources) || data.sources.length === 0) {
      throw new Error('At least one source must be selected');
    }

    if (data.sources.length > 4) {
      throw new Error('Maximum 4 sources allowed to prevent timeouts');
    }

    if (!data.location || data.location.trim().length < 2) {
      throw new Error('Location must be at least 2 characters long');
    }

    // Clean the data
    const cleanData = {
      keyword: data.keyword.trim(),
      sources: data.sources.filter(s => s && s.trim()),
      location: data.location.trim(),
      emailDomain: data.emailDomain ? data.emailDomain.trim() : ''
    };

    console.log('Cleaned data:', cleanData);
    console.log('Sending request to /api/leads/generate...');
    
    // Call progress callback if provided
    if (onProgress) {
      onProgress('Initializing lead generation...');
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const messages = [
          'Connecting to search engines...',
          'Processing search queries...',
          'Extracting contact information...',
          'Analyzing results with AI...',
          'Finalizing lead data...'
        ];
        
        const messageIndex = Math.floor(elapsed / 15000) % messages.length;
        onProgress(messages[messageIndex]);
      }, 10000);
      
      // Clear interval after request completes
      setTimeout(() => clearInterval(progressInterval), 180000);
    }
    
    const response = await leadAPI.post('/api/leads/generate', cleanData);
    
    const duration = Date.now() - startTime;
    console.log('='.repeat(50));
    console.log('LEAD GENERATION COMPLETED');
    console.log('='.repeat(50));
    console.log(`Duration: ${Math.round(duration / 1000)}s`);
    console.log('Response:', {
      success: response.data?.success,
      leadCount: response.data?.data?.leads?.length || 0,
      sources: response.data?.data?.stats?.successfulSources || 0
    });
    
    if (onProgress) {
      onProgress('Lead generation completed!');
    }
    
    return response;
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('='.repeat(50));
    console.error('LEAD GENERATION FAILED');
    console.error('='.repeat(50));
    console.error(`Duration: ${Math.round(duration / 1000)}s`);
    console.error('Error:', error.message);
    
    if (onProgress) {
      onProgress('Lead generation failed');
    }
    
    // Use enhanced error message if available
    const userMessage = error.userMessage || error.response?.data?.message || error.message;
    
    // Create enhanced error object
    const enhancedError = new Error(userMessage);
    enhancedError.originalError = error;
    enhancedError.duration = duration;
    enhancedError.status = error.response?.status;
    enhancedError.data = error.response?.data;
    
    throw enhancedError;
  }
};

// Remaining lead API functions
export const getLeadHistory = async () => {
  try {
    console.log('Fetching lead history...');
    const response = await leadAPI.get('/api/leads/history');
    console.log('Lead history response:', {
      success: response.data?.success,
      count: response.data?.data?.length || 0
    });
    return response;
  } catch (error) {
    console.error('Error fetching lead history:', error);
    throw error;
  }
};

export const getLeadDetails = async (id) => {
  try {
    console.log('Fetching lead details for ID:', id);
    const response = await leadAPI.get(`/api/leads/history/${id}`);
    console.log('Lead details response:', {
      success: response.data?.success,
      leadCount: response.data?.data?.leads?.length || 0
    });
    return response;
  } catch (error) {
    console.error('Error fetching lead details:', error);
    throw error;
  }
};

export const addTagToLead = async (data) => {
  try {
    console.log('Adding tag to lead:', data);
    const response = await leadAPI.post('/api/leads/tag', data);
    console.log('Add tag response:', response.data);
    return response;
  } catch (error) {
    console.error('Error adding tag:', error);
    throw error;
  }
};

export const removeTagFromLead = async (tagId) => {
  try {
    console.log('Removing tag:', tagId);
    const response = await leadAPI.delete(`/api/leads/tag/${tagId}`);
    console.log('Remove tag response:', response.data);
    return response;
  } catch (error) {
    console.error('Error removing tag:', error);
    throw error;
  }
};

export const addNoteToLead = async (leadId, data) => {
  try {
    console.log('Adding note to lead:', leadId, data);
    const response = await leadAPI.put(`/api/leads/note/${leadId}`, data);
    console.log('Add note response:', response.data);
    return response;
  } catch (error) {
    console.error('Error adding note:', error);
    throw error;
  }
};