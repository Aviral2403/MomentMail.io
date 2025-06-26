// api.js - Updated with token refresh logic
import axios from "axios";

const API_BASE_URL = "https://momentmail-io-backend.onrender.com";

// Token refresh function
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

// Create axios instance with interceptors
const createApiInstance = () => {
  const apiInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
  });

  // Request interceptor
  apiInstance.interceptors.request.use(
    (config) => {
      const authExcludedPaths = ["/auth/google", "/drive/connect-drive"];
      const isAuthExcluded = authExcludedPaths.some((path) =>
        config.url?.includes(path)
      );

      if (!isAuthExcluded) {
        const userInfo = JSON.parse(localStorage.getItem("user-info") || "{}");
        if (userInfo.token) {
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

  // Response interceptor
  apiInstance.interceptors.response.use(
    (response) => {
      console.log("API Success:", {
        url: response.config.url,
        status: response.status,
        method: response.config.method,
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

      if (
        error.response?.status === 401 &&
        (error.response?.data?.expired ||
          error.response?.data?.requiresRefresh) &&
        !originalRequest._retry
      ) {
        console.log("Attempting token refresh due to 401...");
        originalRequest._retry = true;

        try {
          const userInfo = JSON.parse(
            localStorage.getItem("user-info") || "{}"
          );
          if (!userInfo.token) {
            throw new Error("No token available for refresh");
          }

          const refreshResult = await refreshAuthToken(userInfo.token);

          if (refreshResult.requiresReauth) {
            console.log("Refresh requires reauthentication");
            localStorage.removeItem("user-info");
            window.location.href = "/login";
            return Promise.reject(error);
          }

          console.log("Updating local storage with new token");
          const updatedUserInfo = { ...userInfo, token: refreshResult.token };
          localStorage.setItem("user-info", JSON.stringify(updatedUserInfo));

          console.log("Retrying original request with new token");
          originalRequest.headers.Authorization = `Bearer ${refreshResult.token}`;
          return apiInstance(originalRequest);
        } catch (refreshError) {
          console.error("Token refresh failed:", refreshError);
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

// Debounce function (keep your existing implementation)
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

// Updated API functions using the interceptor-enabled instance
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
    // Use direct axios call without interceptors for this endpoint
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
