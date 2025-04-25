import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  fetchSpreadsheets,
  fetchSpreadsheetColumns,
  fetchColumnData,
} from "../../api";
import Navbar from "../../Components/Navbar/Navbar";
import { useGoogleLogin } from "@react-oauth/google";
import { connectGoogleDrive } from "../../api";
import * as XLSX from "xlsx";
import "./RecipientSelector.css";

const RecipientSelector = () => {
  const [spreadsheets, setSpreadsheets] = useState([]);
  const [selectedSpreadsheet, setSelectedSpreadsheet] = useState(null);
  const [columns, setColumns] = useState([]);
  const [selectedColumn, setSelectedColumn] = useState(null);
  const [columnData, setColumnData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoadingSpreadsheets, setIsLoadingSpreadsheets] = useState(false);
  const [selectionMethod, setSelectionMethod] = useState("drive"); // 'drive' or 'local'

  const navigate = useNavigate();
  const { slug } = useParams();
  const location = useLocation();
  const templateContent = location.state?.templateContent || "";

  // Check drive connection on mount when method is drive
  useEffect(() => {
    if (selectionMethod === "drive") {
      const checkDriveConnection = () => {
        try {
          const userInfo = JSON.parse(localStorage.getItem("user-info") || "{}");
          if (userInfo.driveAccess && userInfo.driveToken) {
            // Verify token is still valid
            const tokenData = JSON.parse(atob(userInfo.driveToken.split(".")[1]));
            const isTokenValid = tokenData.exp * 1000 > Date.now();
            setIsDriveConnected(isTokenValid);

            if (isTokenValid) {
              loadSpreadsheets();
            }
          } else {
            setIsDriveConnected(false);
          }
        } catch (error) {
          console.error("Error checking drive connection:", error);
          setIsDriveConnected(false);
        }
      };

      checkDriveConnection();
    }
  }, [selectionMethod]);

  // Load spreadsheets directly from API (Google Drive only)
  const loadSpreadsheets = async () => {
    setIsLoadingSpreadsheets(true);
    setError(null);

    try {
      const result = await fetchSpreadsheets();
      setSpreadsheets(result.data.files || []);

      if (result.data.files.length === 0) {
        setError(
          "No spreadsheets found in your Google Drive. Please create one first."
        );
      }
    } catch (err) {
      console.error("Error fetching spreadsheets:", err);

      if (err.response && err.response.status === 401) {
        setIsDriveConnected(false);
        setError("Your Google Drive connection has expired. Please reconnect.");
      } else {
        setError("Failed to load spreadsheets. Please try again.");
      }
    } finally {
      setIsLoadingSpreadsheets(false);
    }
  };

  // Handle local file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setSelectedSpreadsheet(null);
    setColumns([]);
    setSelectedColumn(null);
    setColumnData([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length === 0) {
          setError("The uploaded file is empty.");
          setIsLoading(false);
          return;
        }

        const headers = jsonData[0];
        if (!headers || headers.length === 0) {
          setError("No columns found in the spreadsheet.");
          setIsLoading(false);
          return;
        }

        setSelectedSpreadsheet({
          id: "local-" + file.name,
          name: file.name,
          localFile: file,
          data: jsonData,
        });
        setColumns(headers);
      } catch (err) {
        console.error("Error processing file:", err);
        setError("Failed to process the file. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Handle Google Drive authentication response
  const handleDriveResponse = async (authResult) => {
    setIsConnecting(true);
    setError(null);

    try {
      if (authResult["code"]) {
        const result = await connectGoogleDrive(authResult.code);

        const userInfo = JSON.parse(localStorage.getItem("user-info") || "{}");
        const updatedUserInfo = {
          ...userInfo,
          driveAccess: true,
          driveToken: result.data.token,
          driveConnectedAt: new Date().toISOString(),
        };

        localStorage.setItem("user-info", JSON.stringify(updatedUserInfo));
        setIsDriveConnected(true);

        // Load spreadsheets immediately after connection
        await loadSpreadsheets();
      } else {
        throw new Error(authResult);
      }
    } catch (e) {
      console.error("Error while connecting Google Drive:", e);
      setError("Failed to connect Google Drive. Please try again.");

      // Clear any invalid drive data
      const userInfo = JSON.parse(localStorage.getItem("user-info") || "{}");
      const updatedUserInfo = { ...userInfo };
      delete updatedUserInfo.driveAccess;
      delete updatedUserInfo.driveToken;
      localStorage.setItem("user-info", JSON.stringify(updatedUserInfo));
    } finally {
      setIsConnecting(false);
    }
  };

  // Initialize Google login
  const googleDriveLogin = useGoogleLogin({
    onSuccess: handleDriveResponse,
    onError: (error) => {
      console.error("Google Drive login error:", error);
      setError("Google Drive connection failed. Please try again.");
      setIsConnecting(false);
    },
    flow: "auth-code",
    scope: "https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/spreadsheets.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/calendar.events",  });

  // Handle spreadsheet selection
  const handleSpreadsheetSelect = async (spreadsheet) => {
    setSelectedSpreadsheet(spreadsheet);
    setSelectedColumn(null);
    setColumnData([]);
    setIsLoading(true);
    setError(null);

    try {
      if (spreadsheet.localFile) {
        // Local file already processed in handleFileUpload
        return;
      }

      // Google Drive file
      const result = await fetchSpreadsheetColumns(spreadsheet.id);
      setColumns(result.data.columns || []);

      if (result.data.columns.length === 0) {
        setError(
          "This spreadsheet doesn't have any columns. Please choose another one."
        );
      }
    } catch (err) {
      console.error("Error fetching columns:", err);
      setError("Failed to load spreadsheet columns. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle column selection
  const handleColumnSelect = async (column) => {
    setSelectedColumn(column);
    setIsLoading(true);
    setError(null);

    try {
      if (selectedSpreadsheet.localFile) {
        // Process local file data
        const jsonData = selectedSpreadsheet.data;
        const headers = jsonData[0];
        const columnIndex = headers.indexOf(column);
        
        if (columnIndex === -1) {
          throw new Error("Column not found");
        }

        const values = [];
        for (let i = 1; i < jsonData.length; i++) {
          if (jsonData[i][columnIndex]) {
            values.push(jsonData[i][columnIndex]);
          }
        }

        setColumnData(values);

        if (values.length === 0) {
          setError(
            "This column doesn't contain any data. Please select a different column."
          );
        }
      } else {
        // Google Drive file
        const result = await fetchColumnData(selectedSpreadsheet.id, column);
        setColumnData(result.data.values || []);

        if (result.data.values.length === 0) {
          setError(
            "This column doesn't contain any data. Please select a different column."
          );
        }
      }
    } catch (err) {
      console.error("Error fetching column data:", err);
      setError("Failed to load column data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle confirmation and proceed to email sending
  const handleSendEmails = () => {
    if (columnData.length > 0) {
      navigate(`/templates/${slug}/preview`, {
        state: {
          templateContent,
          recipients: columnData,
          emailSubject: location.state?.emailSubject || "No Subject",
          isLocalFile: selectionMethod === "local", // Pass flag to indicate local file
        },
      });
    } else {
      setError("Please select a column with data");
    }
  };

  // Handle disconnect
  const handleDisconnect = () => {
    const userInfo = JSON.parse(localStorage.getItem("user-info") || "{}");
    const updatedUserInfo = { ...userInfo };
    delete updatedUserInfo.driveAccess;
    delete updatedUserInfo.driveToken;
    localStorage.setItem("user-info", JSON.stringify(updatedUserInfo));
    setIsDriveConnected(false);
    setSelectedSpreadsheet(null);
    setColumns([]);
    setSelectedColumn(null);
    setColumnData([]);
    setSpreadsheets([]);
  };

  // Handle back button
  const handleBack = () => {
    navigate(`/templates/${slug}/edit`);
  };

  // Handle refresh spreadsheets
  const handleRefreshSpreadsheets = () => {
    loadSpreadsheets();
  };

  // Handle selection method change
  const handleMethodChange = (method) => {
    setSelectionMethod(method);
    setSelectedSpreadsheet(null);
    setColumns([]);
    setSelectedColumn(null);
    setColumnData([]);
    setError(null);
  };

  return (
    <div className="dark-theme-container">
      <Navbar />
      <div className="recipient-selector-page">
        <main className="recipient-selector-main">
          <div className="recipient-selector-container">
            <div className="recipient-selector-header">
              <h1>Select Email Recipients</h1>
              <button className="btn-back" onClick={handleBack}>
                <svg className="back-icon" viewBox="0 0 24 24" width="16" height="16">
                  <path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                </svg>
                Back to Editor
              </button>
            </div>

            {error && (
              <div className="error-message">
                <svg className="error-icon" viewBox="0 0 24 24" width="24" height="24">
                  <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
                {error}
              </div>
            )}

            <div className="selection-method-tabs">
              <button
                className={`method-tab ${selectionMethod === "drive" ? "active" : ""}`}
                onClick={() => handleMethodChange("drive")}
              >
                <svg className="method-icon" viewBox="0 0 24 24" width="20" height="20">
                  <path fill="currentColor" d="M4.5 14.5l2.5 4.5h10l2.5-4.5-5-8.5h-5l-5 8.5z" />
                  <path fill="currentColor" d="M14.5 21l5-9h-10l5 9z" />
                  <path fill="currentColor" d="M4.5 14.5L9.5 3H15l-5 8.5-5.5 3z" />
                </svg>
                Google Drive
              </button>
              <button
                className={`method-tab ${selectionMethod === "local" ? "active" : ""}`}
                onClick={() => handleMethodChange("local")}
              >
                <svg className="method-icon" viewBox="0 0 24 24" width="20" height="20">
                  <path fill="currentColor" d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z" />
                </svg>
                Local File
              </button>
            </div>

            {selectionMethod === "drive" && !isDriveConnected ? (
              <div className="drive-connect-section">
                <div className="drive-connect-content">
                  <svg className="drive-icon" width="64" height="64" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M4.5 14.5l2.5 4.5h10l2.5-4.5-5-8.5h-5l-5 8.5z" />
                    <path fill="#FBBC04" d="M14.5 21l5-9h-10l5 9z" />
                    <path fill="#0F9D58" d="M4.5 14.5L9.5 3H15l-5 8.5-5.5 3z" />
                  </svg>
                  <h2>Connect to Google Drive</h2>
                  <p>Connect your Google Drive to access your spreadsheets and select recipients.</p>
                  <button
                    className="btn-connect-drive"
                    onClick={() => googleDriveLogin()}
                    disabled={isConnecting}
                  >
                    {isConnecting ? (
                      <>
                        <span className="spinner"></span>
                        Connecting...
                      </>
                    ) : (
                      <>
                        <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Connect Google Drive
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="selection-container">
                <div className="stepper">
                  <div
                    className={`step step-card ${
                      selectedSpreadsheet ? "completed" : "active"
                    }`}
                  >
                    <div className="step-header">
                      <div className="step-number">1</div>
                      <h2>
                        {selectionMethod === "drive"
                          ? "Select a Spreadsheet"
                          : "Upload a Spreadsheet"}
                      </h2>
                    </div>
                    <div className="step-content">
                      {selectedSpreadsheet ? (
                        <div className="selected-item">
                          <div className="selected-item-content">
                            <svg className="spreadsheet-icon" viewBox="0 0 24 24" width="24" height="24">
                              <path fill="#34A853" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1.6 16H6.6c-.9 0-1.6-.7-1.6-1.6V6.6C5 5.7 5.7 5 6.6 5h10.8c.9 0 1.6.7 1.6 1.6v10.8c0 .9-.7 1.6-1.6 1.6z" />
                              <path fill="#34A853" d="M7 7h10v2H7zM7 11h4v6H7zM13 11h4v6h-4z" />
                            </svg>
                            <div className="selected-details">
                              <span className="selected-label">Selected:</span>
                              <span className="selected-value">
                                {selectedSpreadsheet.name}
                              </span>
                            </div>
                          </div>
                          <button
                            className="btn-change"
                            onClick={() => setSelectedSpreadsheet(null)}
                          >
                            Change
                          </button>
                        </div>
                      ) : (
                        <>
                          {selectionMethod === "drive" ? (
                            <>
                              {isLoadingSpreadsheets ? (
                                <div className="loading">
                                  <span className="spinner"></span>
                                  Loading spreadsheets...
                                </div>
                              ) : (
                                <div className="spreadsheet-list">
                                  <div className="list-header">
                                    <h3>Your Spreadsheets</h3>
                                    <button
                                      className="btn-refresh"
                                      onClick={handleRefreshSpreadsheets}
                                      disabled={isLoadingSpreadsheets}
                                    >
                                      <svg className="refresh-icon" viewBox="0 0 24 24" width="16" height="16">
                                        <path fill="currentColor" d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
                                      </svg>
                                      Refresh
                                    </button>
                                  </div>

                                  {spreadsheets.length > 0 ? (
                                    <div className="spreadsheet-scroll-container">
                                      <div className="spreadsheet-grid">
                                        {spreadsheets.map((sheet) => (
                                          <div
                                            key={sheet.id}
                                            className="spreadsheet-item"
                                            onClick={() =>
                                              handleSpreadsheetSelect(sheet)
                                            }
                                          >
                                            <div className="spreadsheet-icon-container">
                                              <svg className="spreadsheet-icon" viewBox="0 0 24 24" width="24" height="24">
                                                <path fill="#34A853" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1.6 16H6.6c-.9 0-1.6-.7-1.6-1.6V6.6C5 5.7 5.7 5 6.6 5h10.8c.9 0 1.6.7 1.6 1.6v10.8c0 .9-.7 1.6-1.6 1.6z" />
                                                <path fill="#34A853" d="M7 7h10v2H7zM7 11h4v6H7zM13 11h4v6h-4z" />
                                              </svg>
                                            </div>
                                            <div className="spreadsheet-details">
                                              <div className="spreadsheet-name">
                                                {sheet.name}
                                              </div>
                                              <div className="spreadsheet-modified">
                                                Last Modified: {new Date(sheet.modifiedTime).toLocaleDateString()}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="no-data-message">
                                      <svg className="empty-icon" viewBox="0 0 24 24" width="48" height="48">
                                        <path fill="currentColor" d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
                                        <path fill="currentColor" d="M12 17l-5-5 1.41-1.41L12 14.17l4.59-4.58L18 11l-6 6z" />
                                      </svg>
                                      <span>No spreadsheets found.</span>
                                      <button
                                        className="btn-refresh-inline"
                                        onClick={handleRefreshSpreadsheets}
                                      >
                                        Refresh
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="file-upload-section">
                              <label className="file-upload-label">
                                <input
                                  type="file"
                                  accept=".xlsx,.xls,.csv"
                                  onChange={handleFileUpload}
                                  className="file-upload-input"
                                />
                                <div className="file-upload-content">
                                  <svg className="upload-icon" viewBox="0 0 24 24" width="48" height="48">
                                    <path fill="currentColor" d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
                                  </svg>
                                  <h3>Upload Spreadsheet</h3>
                                  <p>Drag & drop your file here or click to browse</p>
                                  <p className="file-types">Supported formats: .xlsx, .xls, .csv</p>
                                </div>
                              </label>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div
                    className={`step step-card ${
                      selectedColumn
                        ? "completed"
                        : selectedSpreadsheet
                        ? "active"
                        : "disabled"
                    }`}
                  >
                    <div className="step-header">
                      <div className="step-number">2</div>
                      <h2>Select an Email Column</h2>
                    </div>
                    <div className="step-content">
                      {isLoading &&
                      selectedSpreadsheet &&
                      columns.length === 0 ? (
                        <div className="loading">
                          <span className="spinner"></span>
                          Loading columns...
                        </div>
                      ) : selectedSpreadsheet ? (
                        columns.length > 0 ? (
                          <div className="column-selector">
                            {selectedColumn ? (
                              <div className="selected-item">
                                <div className="selected-item-content">
                                  <svg className="column-icon" viewBox="0 0 24 24" width="24" height="24">
                                    <path fill="#4285F4" d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                                  </svg>
                                  <div className="selected-details">
                                    <span className="selected-label">
                                      Selected:
                                    </span>
                                    <span className="selected-value">
                                      {selectedColumn}
                                    </span>
                                  </div>
                                </div>
                                <button
                                  className="btn-change"
                                  onClick={() => setSelectedColumn(null)}
                                >
                                  Change
                                </button>
                              </div>
                            ) : (
                              <div className="column-list">
                                {columns.map((column) => (
                                  <button
                                    key={column}
                                    className="column-option"
                                    onClick={() => handleColumnSelect(column)}
                                  >
                                    <svg className="column-option-icon" viewBox="0 0 24 24" width="16" height="16">
                                      <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                    </svg>
                                    {column}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          !isLoading && (
                            <div className="no-data-message">
                              <svg className="empty-icon" viewBox="0 0 24 24" width="48" height="48">
                                <path fill="currentColor" d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z" />
                              </svg>
                              <span>No columns found in this spreadsheet.</span>
                            </div>
                          )
                        )
                      ) : (
                        <p className="instruction-message">
                          <svg className="info-icon" viewBox="0 0 24 24" width="24" height="24">
                            <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                          </svg>
                          {selectionMethod === "drive"
                            ? "Please select a spreadsheet first."
                            : "Please upload a spreadsheet first."}
                        </p>
                      )}
                    </div>
                  </div>

                  <div
                    className={`step step-card ${
                      columnData.length > 0
                        ? "completed"
                        : selectedColumn
                        ? "active"
                        : "disabled"
                    }`}
                  >
                    <div className="step-header">
                      <div className="step-number">3</div>
                      <h2>Review Recipients</h2>
                    </div>
                    <div className="step-content">
                      {isLoading &&
                      selectedColumn &&
                      columnData.length === 0 ? (
                        <div className="loading">
                          <span className="spinner"></span>
                          Loading data...
                        </div>
                      ) : selectedColumn ? (
                        columnData.length > 0 ? (
                          <div className="data-preview">
                            <div className="total-count">
                              <svg className="user-icon" viewBox="0 0 24 24" width="24" height="24">
                                <path fill="currentColor" d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                              </svg>
                              Total recipients:{" "}
                              <strong>{columnData.length}</strong>
                            </div>
                            <div className="email-list">
                              {columnData.slice(0, 5).map((item, index) => (
                                <div key={index} className="email-item">
                                  <svg className="email-icon" viewBox="0 0 24 24" width="16" height="16">
                                    <path fill="currentColor" d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                                  </svg>
                                  <span className="email-text">{item}</span>
                                </div>
                              ))}
                              {columnData.length > 5 && (
                                <div className="more-recipients">
                                  <span className="more-icon">+</span>
                                  {columnData.length - 5} more recipients
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          !isLoading && (
                            <div className="no-data-message">
                              <svg className="empty-icon" viewBox="0 0 24 24" width="48" height="48">
                                <path fill="currentColor" d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-7 13h-2v-2h2v2zm0-4h-2V7h2v6z" />
                              </svg>
                              <span>No data found in this column.</span>
                            </div>
                          )
                        )
                      ) : (
                        <p className="instruction-message">
                          <svg className="info-icon" viewBox="0 0 24 24" width="24" height="24">
                            <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                          </svg>
                          Please select a column to see recipient data.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="recipient-selector-actions">
                  {selectionMethod === "drive" && isDriveConnected && (
                    <button className="btn-disconnect" onClick={handleDisconnect}>
                      <svg className="disconnect-icon" viewBox="0 0 24 24" width="16" height="16">
                        <path fill="currentColor" d="M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42C17.99 7.86 19 9.81 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.19 1.01-4.14 2.58-5.42L6.17 5.17C4.23 6.82 3 9.26 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.74-1.23-5.18-3.17-6.83z" />
                      </svg>
                      Disconnect Drive
                    </button>
                  )}
                  <button
                    className="btn-send"
                    onClick={handleSendEmails}
                    disabled={columnData.length === 0}
                  >
                    <svg className="send-icon" viewBox="0 0 24 24" width="16" height="16">
                      <path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                    Send to {columnData.length || 0} Recipients
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default RecipientSelector;