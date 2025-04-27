// Dashboard.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "../../Components/Navbar/Navbar";
import { getScheduledEmails, getEmailHistory } from "../../api";
import "./Dashboard.css";

const Dashboard = () => {
    const [activeTab, setActiveTab] = useState("scheduled");
    const [scheduledEmails, setScheduledEmails] = useState([]);
    const [emailHistory, setEmailHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError("");
                
                if (activeTab === "scheduled") {
                    const response = await getScheduledEmails();
                    setScheduledEmails(response.scheduledEmails || []);
                } else {
                    const response = await getEmailHistory();
                    setEmailHistory(response.emailHistory || []);
                }
            } catch (err) {
                console.error("Error fetching data:", err);
                setError("Failed to load data. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [activeTab]);

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'scheduled':
                return <span className="dashboard-badge scheduled">Scheduled</span>;
            case 'processing':
                return <span className="dashboard-badge processing">Processing</span>;
            case 'completed':
                return <span className="dashboard-badge completed">Completed</span>;
            case 'cancelled':
                return <span className="dashboard-badge cancelled">Cancelled</span>;
            case 'failed':
                return <span className="dashboard-badge failed">Failed</span>;
            case 'sent':
                return <span className="dashboard-badge sent">Sent</span>;
            case 'partially_failed':
                return <span className="dashboard-badge partially-failed">Partial</span>;
            default:
                return <span className="dashboard-badge">{status}</span>;
        }
    };

    return (
        <div className="dashboard-page">
            <Navbar />
            <main className="dashboard-main">
                <div className="dashboard-container">
                    <h1 className="dashboard-title">Email Dashboard</h1>
                    
                    <div className="dashboard-tabs">
                        <button
                            className={`dashboard-tab ${activeTab === "scheduled" ? "active" : ""}`}
                            onClick={() => setActiveTab("scheduled")}
                        >
                            Scheduled Emails
                        </button>
                        <button
                            className={`dashboard-tab ${activeTab === "history" ? "active" : ""}`}
                            onClick={() => setActiveTab("history")}
                        >
                            Email History
                        </button>
                    </div>
                    
                    {error && (
                        <div className="dashboard-error">
                            <svg className="error-icon" viewBox="0 0 24 24" width="24" height="24">
                                <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                            </svg>
                            {error}
                        </div>
                    )}
                    
                    {loading ? (
                        <div className="dashboard-loading">
                            <div className="dashboard-spinner"></div>
                            Loading...
                        </div>
                    ) : activeTab === "scheduled" ? (
                        <div className="dashboard-table-container">
                            {scheduledEmails.length > 0 ? (
                                <table className="dashboard-table">
                                    <thead>
                                        <tr>
                                            <th>Subject</th>
                                            <th>Recipients</th>
                                            <th>Scheduled Time</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {scheduledEmails.map((email) => (
                                            <tr key={email._id}>
                                                <td>{email.templateName}</td>
                                                <td>{email.recipients.length}</td>
                                                <td>{formatDate(email.scheduledAt)}</td>
                                                <td>{getStatusBadge(email.status)}</td>
                                                <td>
                                                    {email.status === 'scheduled' && (
                                                        <button className="dashboard-action-btn cancel">
                                                            Cancel
                                                        </button>
                                                    )}
                                                   
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="dashboard-empty">
                                    <svg className="empty-icon" viewBox="0 0 24 24" width="48" height="48">
                                        <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z" />
                                    </svg>
                                    <p>No scheduled emails found</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="dashboard-table-container">
                            {emailHistory.length > 0 ? (
                                <table className="dashboard-table">
                                    <thead>
                                        <tr>
                                            <th>Subject</th>
                                            <th>Recipients</th>
                                            <th>Sent Time</th>
                                            <th>Status</th>
                                            <th>Success</th>
                                            <th>Failed</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {emailHistory.map((email) => (
                                            <tr key={email._id}>
                                                <td>{email.templateName}</td>
                                                <td>{email.recipients.length}</td>
                                                <td>{formatDate(email.sentAt)}</td>
                                                <td>{getStatusBadge(email.status)}</td>
                                                <td>{email.successCount}</td>
                                                <td>{email.failureCount}</td>
                                                <td>
                                                    
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="dashboard-empty">
                                    <svg className="empty-icon" viewBox="0 0 24 24" width="48" height="48">
                                        <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z" />
                                    </svg>
                                    <p>No email history found</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Dashboard;