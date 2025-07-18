import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getUserTemplates, deleteTemplate } from "../../api";
import { Toaster, toast } from "react-hot-toast";
import "./TemplatesList.css";

const TemplatesList = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    template: null,
  });
  const navigate = useNavigate();

  const handleSendTemplate = (template) => {
    if (!template.subject || template.subject.trim() === "") {
      toast.error("Template subject is required");
      return;
    }

    navigate(`/templates/${template.id}/recipients`, {
      state: {
        templateContent: template.html,
        emailSubject: template.subject,
        isScheduled: false,
      },
    });
  };

  const handleScheduleTemplate = (template) => {
    if (!template.subject || template.subject.trim() === "") {
      toast.error("Template subject is required");
      return;
    }

    navigate(`/templates/${template.id}/schedule`, {
      state: {
        templateContent: template.html,
        emailSubject: template.subject,
        isScheduled: true,
      },
    });
  };

  // Check authentication first
  useEffect(() => {
    const checkAuth = () => {
      const userInfo = JSON.parse(localStorage.getItem("user-info") || "{}");
      if (!userInfo || !userInfo.token) {
        setIsAuthenticated(false);
        setError("Please login to access your saved collection");
        setLoading(false);
      } else {
        setIsAuthenticated(true);
      }
    };

    checkAuth();
  }, []);

  // Fetch templates only if authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchTemplates = async () => {
      try {
        setLoading(true);
        const response = await getUserTemplates();
        setTemplates(response.templates);
        setLoading(false);
      } catch (err) {
        setError("Failed to load templates");
        setLoading(false);
      }
    };
    fetchTemplates();
  }, [isAuthenticated]);

  const handleDeleteClick = (template) => {
    setDeleteModal({ isOpen: true, template });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.template) return;

    try {
      await deleteTemplate(deleteModal.template.id);
      setTemplates(templates.filter((t) => t.id !== deleteModal.template.id));
      setDeleteModal({ isOpen: false, template: null });
    } catch (err) {
      alert("Failed to delete template");
      setDeleteModal({ isOpen: false, template: null });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModal({ isOpen: false, template: null });
  };

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      return "Invalid Date";
    }
  };

  // Helper function to check if template was recently updated
  const isRecentlyUpdated = (createdAt, updatedAt) => {
    if (!createdAt || !updatedAt) return false;
    const created = new Date(createdAt);
    const updated = new Date(updatedAt);
    // Consider it recently updated if the difference is more than 1 minute
    return updated.getTime() - created.getTime() > 60000;
  };

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (template.description &&
        template.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter =
      filter === "all" ||
      (filter === "public" && template.isPublic) ||
      (filter === "private" && !template.isPublic);
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="saved-templates-loading-container">
        <div>Loading Saved Collection!....</div>
      </div>
    );
  }

  // Show authentication required message if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="saved-templates-container">
        <div className="saved-templates-header">
          <h1>Saved Collection</h1>
        </div>
        <div className="saved-templates-auth-required">
          <div className="saved-templates-auth-message">
            <img
              className="saved-templates-auth-icon"
              src="/auth.png"
              loading="lazy"
              width="180"
              height="180"
              alt="Authentication required"
            />
            <h2>Authentication Required</h2>
            <p>Please login to access your saved collection</p>
            <Link to="/login" className="saved-templates-login-button">
              Go to Login
            </Link>
          </div>
          {error && (
            <div className="saved-templates-error-message">
              <svg
                className="saved-templates-error-icon"
                viewBox="0 0 24 24"
                width="24"
                height="24"
              >
                <path
                  fill="currentColor"
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
                />
              </svg>
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error && isAuthenticated) {
    return (
      <div className="saved-templates-error-container">
        <div>{error}</div>
      </div>
    );
  }

  return (
    <div className="saved-templates-container">
      <div className="saved-templates-header">
        <h1>Saved Collection</h1>
        <Link
          to="/templates/create/new"
          className="saved-templates-new-template-button"
        >
          Create New Template
        </Link>
      </div>

      <div className="saved-templates-controls">
        <div className="saved-templates-search-filter">
          <input
            type="text"
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="saved-templates-search-input"
          />
          {/* <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="saved-templates-filter-select"
          >
            <option value="all">All Templates</option>
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select> */}
        </div>
      </div>

      {filteredTemplates.length === 0 ? (
        <div className="saved-templates-no-templates">
          {searchTerm || filter !== "all" ? (
            <>
              <img
                src="/empty.svg"
                loading="lazy"
                className="dashboard-empty-icon"
                width="256"
                height="256"
                alt="No scheduled emails"
              />
              <p>No templates match your search criteria.</p>
            </>
          ) : (
            <>
              <div className="saved-templates-create-new-template">
                <p>You haven't created any templates yet.</p>

                <img src="/create-new.png" loading="lazy" alt="" width="180" height="180" />
                <Link
                  to="/templates/create/new"
                  className="saved-templates-create-first-template"
                >
                  Create your first template
                </Link>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="saved-templates-grid">
          {filteredTemplates.map((template) => (
            <div key={template.id} className="saved-templates-card">
              <div className="saved-templates-preview-container">
                <div className="saved-templates-preview">
                  {template.html ? (
                    <div className="saved-templates-email-wrapper">
                      <div
                        className="saved-templates-email-render"
                        dangerouslySetInnerHTML={{ __html: template.html }}
                      />
                    </div>
                  ) : (
                    <div className="saved-templates-placeholder">
                      <div className="saved-templates-placeholder-icon">📧</div>
                      <span>No Preview Available</span>
                    </div>
                  )}
                </div>
                <div className="saved-templates-preview-fade"></div>
              </div>

              <div className="saved-templates-info">
                <div className="saved-templates-info-header">
                  <h3>{template.name}</h3>
                  {/* <div className="saved-templates-visibility">
                    {template.isPublic ? 'Public' : 'Private'}
                  </div> */}
                </div>
                <p className="saved-templates-subject">
                  Subject: {template.subject}
                </p>
                <p className="saved-templates-description">
                  {template.description || "No description provided"}
                </p>

                {template.tags && template.tags.length > 0 && (
                  <div className="saved-templates-tags">
                    {template.tags.map((tag, index) => (
                      <span key={index} className="saved-templates-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="saved-templates-meta">
                  <div className="saved-templates-dates">
                    <div className="saved-templates-date-wrapper">
                      <span className="saved-templates-date">
                        Created : {formatDate(template.createdAt)}
                      </span>
                      {template.updatedAt &&
                        isRecentlyUpdated(
                          template.createdAt,
                          template.updatedAt
                        ) && (
                          <span className="saved-templates-date">
                            Last Updated : {formatDate(template.updatedAt)}
                          </span>
                        )}
                    </div>
                  </div>
                </div>

                <div className="saved-templates-actions">
                  <button
                    onClick={() =>
                      navigate(`/my-templates/${template.id}/edit`)
                    }
                    className="saved-templates-edit-button"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteClick(template)}
                    className="saved-templates-delete-button"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="3,6 5,6 21,6" />
                      <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleSendTemplate(template)}
                    className="saved-templates-use-button"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                  </button>

                  <button
                    onClick={() => handleScheduleTemplate(template)}
                    className="saved-templates-schedule-button"
                  >
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 20 20"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <rect
                        x="2"
                        y="3"
                        width="16"
                        height="14"
                        rx="2"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1"
                      />

                      <rect
                        x="2"
                        y="3"
                        width="16"
                        height="4"
                        rx="2"
                        fill="currentColor"
                        fillOpacity="0.3"
                      />
                      <rect
                        x="2"
                        y="5"
                        width="16"
                        height="2"
                        fill="currentColor"
                        fillOpacity="0.2"
                      />

                      <rect
                        x="5"
                        y="1"
                        width="1"
                        height="4"
                        rx="0.5"
                        fill="currentColor"
                      />
                      <rect
                        x="14"
                        y="1"
                        width="1"
                        height="4"
                        rx="0.5"
                        fill="currentColor"
                      />

                      <line
                        x1="6"
                        y1="8"
                        x2="6"
                        y2="16"
                        stroke="currentColor"
                        strokeWidth="0.5"
                        opacity="0.4"
                      />
                      <line
                        x1="10"
                        y1="8"
                        x2="10"
                        y2="16"
                        stroke="currentColor"
                        strokeWidth="0.5"
                        opacity="0.4"
                      />
                      <line
                        x1="14"
                        y1="8"
                        x2="14"
                        y2="16"
                        stroke="currentColor"
                        strokeWidth="0.5"
                        opacity="0.4"
                      />
                      <line
                        x1="3"
                        y1="10"
                        x2="17"
                        y2="10"
                        stroke="currentColor"
                        strokeWidth="0.5"
                        opacity="0.4"
                      />
                      <line
                        x1="3"
                        y1="13"
                        x2="17"
                        y2="13"
                        stroke="currentColor"
                        strokeWidth="0.5"
                        opacity="0.4"
                      />

                      <circle
                        cx="13"
                        cy="13"
                        r="4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />

                      <line
                        x1="13"
                        y1="13"
                        x2="13"
                        y2="10.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                      <line
                        x1="13"
                        y1="13"
                        x2="15"
                        y2="13"
                        stroke="currentColor"
                        strokeWidth="1"
                        strokeLinecap="round"
                      />

                      <circle cx="13" cy="13" r="0.5" fill="currentColor" />

                      <line
                        x1="13"
                        y1="9.2"
                        x2="13"
                        y2="9.8"
                        stroke="currentColor"
                        strokeWidth="0.5"
                      />
                      <line
                        x1="16.8"
                        y1="13"
                        x2="16.2"
                        y2="13"
                        stroke="currentColor"
                        strokeWidth="0.5"
                      />
                      <line
                        x1="13"
                        y1="16.8"
                        x2="13"
                        y2="16.2"
                        stroke="currentColor"
                        strokeWidth="0.5"
                      />
                      <line
                        x1="9.2"
                        y1="13"
                        x2="9.8"
                        y2="13"
                        stroke="currentColor"
                        strokeWidth="0.5"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Toaster position="top-center" />

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="delete-modal-overlay">
          <div className="delete-modal">
            <div className="delete-modal-content">
              <h3>Delete Template</h3>
              <p>Are you sure you want to delete this template?</p>
              {deleteModal.template && (
                <p className="delete-modal-template-name">
                  "{deleteModal.template.name}"
                </p>
              )}
              <div className="delete-modal-actions">
                <button
                  onClick={handleDeleteCancel}
                  className="delete-modal-cancel"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="delete-modal-confirm"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplatesList;
