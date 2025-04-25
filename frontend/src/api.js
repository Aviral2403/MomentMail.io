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


// export const sendEmails = async (templateContent, recipients, templateName) => {
//     const token = getDriveToken();
//     if (!token) {
//         console.error("No drive token found");
//         return Promise.reject(new Error("No drive token found"));
//     }

//     try {
//         console.log("Sending emails with subject:", templateName); // Debugging: Log the subject
//         const response = await axios.post(`${API_BASE_URL}/drive/send-emails`, {
//             templateContent,
//             recipients,
//             templateName, // Ensure this is passed correctly
//         }, {
//             headers: {
//                 Authorization: `Bearer ${token}`,
//             },
//         });

//         console.log("Email sending response:", response.data);
//         return response.data;
//     } catch (error) {
//         console.error("Error sending emails:", error.response?.data?.error || error.message);
//         throw error;
//     }
// };




export const sendEmails = async (templateContent, recipients, templateName) => {
    const token = getDriveToken();
    if (!token) {
        console.error("No drive token found");
        return Promise.reject(new Error("No drive token found"));
    }

    try {
        console.log("Sending emails with subject:", templateName);
        console.log("Email Payload Size:", JSON.stringify({ templateContent, recipients, templateName }).length);

        const response = await axios.post(`${API_BASE_URL}/drive/send-emails`, {
            templateContent,
            recipients,
            templateName,
        }, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        console.log("Email sending response:", response.data);
        return response.data;
    } catch (error) {
        console.error("Error sending emails:", error.response?.data?.error || error.message);
        throw error;
    }
};










export const getScheduledEmails = (filter = "all") => {
  const userInfo = JSON.parse(localStorage.getItem("user-info") || "{}");
  const token = userInfo.token;
  
  return axios.get(`${API_BASE_URL}/scheduled-emails/scheduled-emails?filter=${filter}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

export const getEmailStats = () => {
  const userInfo = JSON.parse(localStorage.getItem("user-info") || "{}");
  const token = userInfo.token;
  
  return axios.get(`${API_BASE_URL}/scheduled-emails/email-stats`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

export const getEmailDetails = (emailId) => {
  const userInfo = JSON.parse(localStorage.getItem("user-info") || "{}");
  const token = userInfo.token;
  
  return axios.get(`${API_BASE_URL}/scheduled-emails/${emailId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};








export const scheduleEmails = (templateContent, recipients, templateName, scheduledTime) => {
  const userInfo = JSON.parse(localStorage.getItem("user-info") || "{}");
  const token = userInfo.token;
  
  return axios.post(`${API_BASE_URL}/scheduled-emails/schedule-emails`, {
    templateContent,
    recipients,
    templateName,
    scheduledTime
  }, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });
};