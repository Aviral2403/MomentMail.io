import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from "react-router-dom";
import { generateLeads, getLeadHistory, getLeadDetails, addTagToLead, removeTagFromLead, addNoteToLead } from '../../api';
import './LeadGeneration.css';
import LoadingSkeleton from "../../Components/LoadingSkeleton/LoadingSkeleton";

const LeadGeneration = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('generate');
  const [isLoading, setIsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [progress, setProgress] = useState("");
  const [progressDetails, setProgressDetails] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  
  // Search parameters with validation
  const [searchParams, setSearchParams] = useState({
    keyword: '',
    sources: [],
    location: '',
    emailDomain: ''
  });
  
  const [generatedLeads, setGeneratedLeads] = useState([]);
  const [leadHistory, setLeadHistory] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [tags, setTags] = useState([]);
  const [notes, setNotes] = useState('');
  const [generationStats, setGenerationStats] = useState(null);

  // Enhanced source options with descriptions
  const sourceOptions = [
    { value: 'google', label: 'Google Search', description: 'General Google searches for contact info' },
    { value: 'linkedin', label: 'LinkedIn', description: 'Professional profiles and companies' },
    { value: 'facebook', label: 'Facebook', description: 'Business pages and profiles' },
    { value: 'instagram', label: 'Instagram', description: 'Business accounts and creator profiles' },
    { value: 'google_maps', label: 'Google Maps', description: 'Local business listings' },
    { value: 'fiverr', label: 'Fiverr', description: 'Freelancer profiles' },
    { value: 'upwork', label: 'Upwork', description: 'Freelancer and agency profiles' },
    { value: 'reddit', label: 'Reddit', description: 'Community discussions and posts' }
  ];

  const tagOptions = [
    { value: 'contacted', label: 'Contacted', color: '#4CAF50' },
    { value: 'converted', label: 'Converted', color: '#2196F3' },
    { value: 'unresponsive', label: 'Unresponsive', color: '#FF5722' },
    { value: 'interested', label: 'Interested', color: '#9C27B0' },
    { value: 'not_interested', label: 'Not Interested', color: '#607D8B' }
  ];

  // Clear messages after 8 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError("");
        setSuccess("");
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Clear progress after longer timeout
  useEffect(() => {
    if (progress && !isLoading) {
      const timer = setTimeout(() => {
        setProgress("");
        setProgressDetails("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [progress, isLoading]);

  // Check authentication on component mount
  useEffect(() => {
    const checkAuth = () => {
      const userInfo = JSON.parse(localStorage.getItem("user-info") || "{}");
      if (!userInfo || !userInfo.token) {
        setIsAuthenticated(false);
        setError("Please login to access lead generation");
        setLoading(false);
      } else {
        setIsAuthenticated(true);
        setUserEmail(userInfo.email || "");
      }
    };
    checkAuth();
  }, []);

  // Fetch data when switching tabs
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchData = async () => {
      if (activeTab === 'history') {
        try {
          setLoading(true);
          setError("");
          await fetchLeadHistory();
        } catch (err) {
          console.error("Error fetching lead history:", err);
          setError("Failed to load lead history. Please try again.");
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab, isAuthenticated]);

  const fetchLeadHistory = async () => {
    try {
      const response = await getLeadHistory();
      setLeadHistory(response.data?.data || response.data || []);
    } catch (error) {
      console.error('Error fetching lead history:', error);
      throw error;
    }
  };

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setSearchParams(prev => ({ ...prev, [name]: value }));
    setError(""); // Clear error when user makes changes
  }, []);

  const handleSourceChange = useCallback((e) => {
    const { value, checked } = e.target;
    setSearchParams(prev => {
      const newSources = checked 
        ? [...prev.sources, value] 
        : prev.sources.filter(source => source !== value);
      return { ...prev, sources: newSources };
    });
    setError(""); // Clear error when user makes changes
  }, []);

  // Enhanced progress handler
  const handleProgress = useCallback((message, details = "") => {
    setProgress(message);
    setProgressDetails(details);
    console.log('Progress:', message, details);
  }, []);

  // Main lead generation function with enhanced error handling
  const handleGenerateLeads = async () => {
    // Clear previous messages
    setError("");
    setSuccess("");
    setProgress("");
    setProgressDetails("");
    setGenerationStats(null);

    // Enhanced validation with specific error messages
    if (!searchParams.keyword.trim()) {
      setError('Please enter a keyword (e.g., "web developer", "digital marketer")');
      return;
    }

    if (searchParams.keyword.trim().length < 2) {
      setError('Keyword must be at least 2 characters long');
      return;
    }

    if (!searchParams.sources.length) {
      setError('Please select at least one source to search');
      return;
    }

    if (searchParams.sources.length > 4) {
      setError('Please select maximum 4 sources to avoid timeouts and improve reliability');
      return;
    }

    if (!searchParams.location.trim()) {
      setError('Please enter a location (e.g., "New York", "California", "United States")');
      return;
    }

    if (searchParams.location.trim().length < 2) {
      setError('Location must be at least 2 characters long');
      return;
    }

    setIsLoading(true);
    const startTime = Date.now();
    
    try {
      console.log('='.repeat(50));
      console.log('STARTING LEAD GENERATION PROCESS');
      console.log('='.repeat(50));
      console.log('Search Parameters:', searchParams);
      
      handleProgress('Initializing lead generation...', 'Preparing search queries and connecting to services');
      
      const response = await generateLeads(searchParams, (progressMsg) => {
        handleProgress(progressMsg, `Elapsed: ${Math.round((Date.now() - startTime) / 1000)}s`);
      });
      
      const duration = Math.round((Date.now() - startTime) / 1000);
      console.log('='.repeat(50));
      console.log('LEAD GENERATION COMPLETED');
      console.log('='.repeat(50));
      console.log(`Total Duration: ${duration}s`);
      console.log('Response:', response.data);
      
      if (response.data?.success) {
        const leads = response.data?.data?.leads || [];
        const stats = response.data?.data?.stats || {};
        
        setGeneratedLeads(leads);
        setGenerationStats(stats);
        setActiveTab('results');
        
        const successMsg = `Successfully generated ${leads.length} leads in ${duration} seconds!`;
        setSuccess(successMsg);
        handleProgress('Generation completed!', `Found ${leads.length} leads from ${stats.successfulSources || 0} sources`);
        
        // Show warnings if some sources failed
        if (response.data?.warnings || (response.data?.errors && response.data.errors.length > 0)) {
          const failedCount = response.data?.data?.stats?.failedSources || response.data?.errors?.length || 0;
          console.warn('Some sources failed:', response.data?.warnings || response.data?.errors);
          setError(`Generated ${leads.length} leads successfully, but ${failedCount} source(s) encountered issues. Check browser console for details.`);
        }
      } else {
        throw new Error(response.data?.message || 'Unknown error occurred');
      }
      
    } catch (error) {
      const duration = Math.round((Date.now() - startTime) / 1000);
      console.error('='.repeat(50));
      console.error('LEAD GENERATION FAILED');
      console.error('='.repeat(50));
      console.error(`Duration: ${duration}s`);
      console.error('Error Details:', {
        message: error.message,
        status: error.status,
        originalError: error.originalError?.message
      });
      
      let errorMessage = 'Lead generation failed. ';
      
      // Use enhanced error messages from API
      if (error.message.includes('timeout') || error.message.includes('longer than expected')) {
        errorMessage = `Request timed out after ${duration} seconds. This can happen with slow connections or when searching multiple sources. Please try again with fewer sources or check your internet connection.`;
      } else if (error.message.includes('Rate limit') || error.message.includes('too many requests')) {
        errorMessage = 'You have made too many requests recently. Please wait 1-2 minutes before trying again.';
      } else if (error.message.includes('Authentication') || error.message.includes('login again')) {
        errorMessage = 'Your session has expired. Please login again to continue.';
        setTimeout(() => navigate('/login'), 2000);
      } else if (error.status >= 500) {
        errorMessage = 'Server error occurred during lead generation. Please try again in a few minutes.';
      } else if (error.status === 422 || error.message.includes('No leads could be generated')) {
        errorMessage = error.message + ' Try different keywords, locations, or sources.';
      } else {
        errorMessage += error.message || 'Please try again.';
      }
      
      setError(errorMessage);
      handleProgress('Generation failed', `Failed after ${duration}s`);
      
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = async (leadId) => {
    try {
      setLoading(true);
      setError("");
      const response = await getLeadDetails(leadId);
      const leadData = response.data?.data || response.data;
      setSelectedLead(leadData);
      setTags(leadData.tags || []);
      setActiveTab('details');
    } catch (error) {
      console.error('Error fetching lead details:', error);
      setError('Failed to load lead details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = async (leadId) => {
    const validTags = tagOptions.map(t => t.value).join(', ');
    const tag = prompt(`Enter tag (${validTags}):`);
    
    if (!tag || !tagOptions.some(t => t.value === tag)) {
      setError('Invalid tag selected');
      return;
    }

    const notes = prompt('Enter notes (optional):') || '';
    
    try {
      setError("");
      await addTagToLead({ leadId, tag, notes });
      const updatedTags = [...tags, { leadId, tag, notes, _id: Date.now().toString() }];
      setTags(updatedTags);
      setSuccess('Tag added successfully!');
    } catch (error) {
      console.error('Error adding tag:', error);
      setError('Failed to add tag. Please try again.');
    }
  };

  const handleRemoveTag = async (tagId) => {
    if (!confirm('Are you sure you want to remove this tag?')) return;
    
    try {
      setError("");
      await removeTagFromLead(tagId);
      setTags(tags.filter(tag => tag._id !== tagId));
      setSuccess('Tag removed successfully!');
    } catch (error) {
      console.error('Error removing tag:', error);
      setError('Failed to remove tag. Please try again.');
    }
  };

  const handleSaveNote = async (leadId) => {
    if (!notes.trim()) {
      setError('Please enter a note before saving');
      return;
    }
    
    try {
      setError("");
      await addNoteToLead(leadId, { notes });
      setSuccess('Note saved successfully!');
    } catch (error) {
      console.error('Error saving note:', error);
      setError('Failed to save note. Please try again.');
    }
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getSelectedSourcesText = () => {
    return searchParams.sources.map(source => 
      sourceOptions.find(opt => opt.value === source)?.label || source
    ).join(', ');
  };

  if (loading && activeTab !== 'generate') {
    return <LoadingSkeleton type="lead-generation" />;
  }

  if (!isAuthenticated) {
    return (
      <div className="lead-generation-page-container">
        <main className="lead-generation-main-content">
          <div className="lead-generation-inner-container">
            <h1 className="lead-generation-page-title">Lead Generation</h1>
            <div className="lead-generation-auth-required">
              <div className="lead-generation-auth-message">
                <img
                  className="lead-generation-auth-icon"
                  src="/auth.png"
                  loading="lazy"
                  width="180"
                  height="180"
                  alt="Authentication Required"
                />
                <h2>Authentication Required</h2>
                <p>Please login to access lead generation features</p>
                <Link to="/login" className="lead-generation-login-button">
                  Go to Login
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="lead-generation-page-container">
      <main className="lead-generation-main-content">
        <div className="lead-generation-inner-container">
          <h1 className="lead-generation-page-title">AI-Powered Lead Generation</h1>
          
          <div className="lead-generation-container">
            {/* Enhanced Tab Navigation */}
            <div className="tabs">
              <button 
                className={`tab ${activeTab === 'generate' ? 'active' : ''}`}
                onClick={() => setActiveTab('generate')}
              >
                <span>🔍</span> Generate Leads
              </button>
              <button 
                className={`tab ${activeTab === 'history' ? 'active' : ''}`}
                onClick={() => setActiveTab('history')}
              >
                <span>📋</span> History ({leadHistory.length})
              </button>
              {activeTab === 'results' && (
                <button className="tab active">
                  <span>✅</span> Results ({generatedLeads.length})
                </button>
              )}
              {activeTab === 'details' && (
                <button className="tab active">
                  <span>🔍</span> Lead Details
                </button>
              )}
            </div>

            {/* Enhanced Status Messages */}
            {success && (
              <div className="lead-generation-success-message">
                <svg className="lead-generation-success-icon" viewBox="0 0 24 24" width="24" height="24">
                  <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
                {success}
              </div>
            )}

            {error && (
              <div className="lead-generation-error-message">
                <svg className="lead-generation-error-icon" viewBox="0 0 24 24" width="24" height="24">
                  <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
                {error}
              </div>
            )}

            {progress && (
              <div className="lead-generation-progress-message">
                <div className="spinner"></div>
                <div className="progress-content">
                  <div className="progress-main">{progress}</div>
                  {progressDetails && <div className="progress-details">{progressDetails}</div>}
                </div>
              </div>
            )}

            <div className="tab-content">
              {activeTab === 'generate' && (
                <div className="generate-leads">
                  <h2>🚀 Generate New Leads</h2>
                  
                  {/* Enhanced Info Box */}
                  <div className="info-box">
                    <h3>💡 Tips for Better Results:</h3>
                    <ul>
                      <li><strong>Be Specific:</strong> Use detailed keywords like "wedding photographer" instead of just "photographer"</li>
                      <li><strong>Limit Sources:</strong> Select 2-4 sources for optimal speed and reliability</li>
                      <li><strong>Be Patient:</strong> Lead generation typically takes 1-3 minutes depending on sources</li>
                      <li><strong>Try Variations:</strong> If results are limited, try different keyword combinations</li>
                      <li><strong>Local Works Best:</strong> City names often yield better results than broad regions</li>
                    </ul>
                  </div>

                  {/* Search Form */}
                  <div className="form-container">
                    <div className="form-group">
                      <label>
                        <span className="label-icon">🔍</span>
                        Keyword* 
                        <span className="field-hint">(Be specific for better results)</span>
                      </label>
                      <input
                        type="text"
                        name="keyword"
                        value={searchParams.keyword}
                        onChange={handleInputChange}
                        placeholder="e.g., wedding photographer, digital marketer, web developer"
                        disabled={isLoading}
                        className="form-input"
                      />
                      <small className="input-help">
                        Current: {searchParams.keyword || 'None entered'}
                      </small>
                    </div>
                    
                    <div className="form-group">
                      <label>
                        <span className="label-icon">📊</span>
                        Sources* 
                        <span className="field-hint">(Select 2-4 for optimal results)</span>
                      </label>
                      <div className="source-grid">
                        {sourceOptions.map(source => (
                          <label key={source.value} className="source-option">
                            <input
                              type="checkbox"
                              value={source.value}
                              checked={searchParams.sources.includes(source.value)}
                              onChange={handleSourceChange}
                              disabled={isLoading}
                            />
                            <div className="source-content">
                              <span className="source-label">{source.label}</span>
                              <span className="source-description">{source.description}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                      <div className="source-summary">
                        <span className={`source-count ${searchParams.sources.length > 4 ? 'warning' : ''}`}>
                          Selected: {searchParams.sources.length}/4
                        </span>
                        {searchParams.sources.length > 0 && (
                          <span className="selected-sources">
                            ({getSelectedSourcesText()})
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="form-group">
                      <label>
                        <span className="label-icon">📍</span>
                        Location* 
                        <span className="field-hint">(City, State, or Country)</span>
                      </label>
                      <input
                        type="text"
                        name="location"
                        value={searchParams.location}
                        onChange={handleInputChange}
                        placeholder="e.g., New York, California, United States, London"
                        disabled={isLoading}
                        className="form-input"
                      />
                      <small className="input-help">
                        Current: {searchParams.location || 'None entered'}
                      </small>
                    </div>
                    
                    <div className="form-group">
                      <label>
                        <span className="label-icon">📧</span>
                        Email Domain Filter 
                        <span className="field-hint">(Optional - filter by email provider)</span>
                      </label>
                      <input
                        type="text"
                        name="emailDomain"
                        value={searchParams.emailDomain}
                        onChange={handleInputChange}
                        placeholder="e.g., gmail.com, yahoo.com, company.com"
                        disabled={isLoading}
                        className="form-input"
                      />
                      <small className="input-help">
                        {searchParams.emailDomain ? `Filtering for: @${searchParams.emailDomain}` : 'All email domains will be included'}
                      </small>
                    </div>
                  </div>
                  
                  {/* Generate Button */}
                  <div className="generate-section">
                    <button 
                      className={`generate-button ${isLoading ? 'loading' : ''}`}
                      onClick={handleGenerateLeads}
                      disabled={isLoading || !searchParams.keyword.trim() || !searchParams.sources.length || !searchParams.location.trim()}
                    >
                      {isLoading ? (
                        <>
                          <div className="button-spinner"></div>
                          Generating Leads...
                        </>
                      ) : (
                        <>
                          <span>🚀</span>
                          Generate Leads
                        </>
                      )}
                    </button>
                    
                    {!isLoading && (
                      <div className="generate-preview">
                        Will search for <strong>{searchParams.keyword || '[keyword]'}</strong> 
                        in <strong>{searchParams.location || '[location]'}</strong> 
                        across <strong>{searchParams.sources.length}</strong> source{searchParams.sources.length !== 1 ? 's' : ''}
                        {searchParams.emailDomain && (
                          <span> with email filter: <strong>@{searchParams.emailDomain}</strong></span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Loading Information */}
                  {isLoading && (
                    <div className="loading-info">
                      <div className="loading-stats">
                        <div className="stat">
                          <span className="stat-icon">⏱️</span>
                          <span>Estimated: 1-3 minutes</span>
                        </div>
                        <div className="stat">
                          <span className="stat-icon">🔍</span>
                          <span>Searching {searchParams.sources.length} sources</span>
                        </div>
                        <div className="stat">
                          <span className="stat-icon">🤖</span>
                          <span>AI processing enabled</span>
                        </div>
                      </div>
                      <p className="loading-note">
                        <strong>Please don't close this tab.</strong> The system is actively searching and processing results.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'history' && (
                <div className="lead-history">
                  <h2>📋 Your Lead Generation History</h2>
                  {loading ? (
                    <LoadingSkeleton type="lead-generation" />
                  ) : leadHistory.length === 0 ? (
                    <div className="lead-generation-empty-state">
                      <img
                        src="/empty.svg"
                        loading="lazy"
                        className="lead-generation-empty-icon"
                        width="256"
                        height="256"
                        alt="No lead history"
                      />
                      <h3>No Lead Generation History</h3>
                      <p>You haven't generated any leads yet. Click "Generate Leads" to get started!</p>
                      <button 
                        className="primary-button"
                        onClick={() => setActiveTab('generate')}
                      >
                        Generate Your First Leads
                      </button>
                    </div>
                  ) : (
                    <div className="history-cards">
                      {leadHistory.map(lead => (
                        <div key={lead._id} className="history-card">
                          <div className="card-header">
                            <h3>
                              <span className="keyword-icon">🎯</span>
                              {lead.searchQuery.keyword}
                            </h3>
                            <span className="date">{formatDate(lead.createdAt)}</span>
                          </div>
                          <div className="card-body">
                            <div className="card-stat">
                              <span className="stat-label">📊 Sources:</span>
                              <span className="stat-value">{lead.searchQuery.sources.join(', ')}</span>
                            </div>
                            <div className="card-stat">
                              <span className="stat-label">📍 Location:</span>
                              <span className="stat-value">{lead.searchQuery.location}</span>
                            </div>
                            <div className="card-stat">
                              <span className="stat-label">📧 Leads Found:</span>
                              <span className="stat-value highlight">{lead.leadsCount || lead.leads?.length || 0}</span>
                            </div>
                            {lead.processingTime && (
                              <div className="card-stat">
                                <span className="stat-label">⏱️ Processing Time:</span>
                                <span className="stat-value">{lead.processingTime}</span>
                              </div>
                            )}
                          </div>
                          <div className="card-footer">
                            <button 
                              className="view-details-button"
                              onClick={() => handleViewDetails(lead._id)}
                            >
                              <span>👁️</span> View Details
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'results' && (
                <div className="generated-leads">
                  <div className="results-header">
                    <h2>✅ Generated Leads ({generatedLeads.length})</h2>
                    {generationStats && (
                      <div className="generation-stats">
                        <div className="stat">
                          <span className="stat-value">{generationStats.totalLeads}</span>
                          <span className="stat-label">Total Leads</span>
                        </div>
                        <div className="stat">
                          <span className="stat-value">{generationStats.successfulSources}</span>
                          <span className="stat-label">Successful Sources</span>
                        </div>
                        <div className="stat">
                          <span className="stat-value">{generationStats.processingTimeSeconds}s</span>
                          <span className="stat-label">Processing Time</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {generatedLeads.length === 0 ? (
                    <div className="lead-generation-empty-state">
                      <img
                        src="/empty.svg"
                        loading="lazy"
                        className="lead-generation-empty-icon"
                        width="256"
                        height="256"
                        alt="No leads generated"
                      />
                      <h3>No Leads Found</h3>
                      <p>No leads were generated from this search. Try different keywords or sources.</p>
                      <button 
                        className="primary-button"
                        onClick={() => setActiveTab('generate')}
                      >
                        Try Again
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="leads-table-container">
                        <table className="leads-table">
                          <thead>
                            <tr>
                              <th>👤 Name</th>
                              <th>🏢 Business</th>
                              <th>📧 Email</th>
                              <th>📞 Phone</th>
                              <th>🌐 Website</th>
                              <th>📱 Source</th>
                              <th>⚙️ Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {generatedLeads.map((lead, index) => (
                              <tr key={index}>
                                <td>{lead.name !== 'N/A' ? lead.name : '-'}</td>
                                <td>{lead.businessName !== 'N/A' ? lead.businessName : '-'}</td>
                                <td>
                                  {lead.email !== 'N/A' ? (
                                    <a href={`mailto:${lead.email}`} className="email-link">
                                      {lead.email}
                                    </a>
                                  ) : '-'}
                                </td>
                                <td>
                                  {lead.phone !== 'N/A' ? (
                                    <a href={`tel:${lead.phone}`} className="phone-link">
                                      {lead.phone}
                                    </a>
                                  ) : '-'}
                                </td>
                                <td>
                                  {lead.website !== 'N/A' ? (
                                    <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} 
                                       target="_blank" 
                                       rel="noopener noreferrer"
                                       className="website-link">
                                      🔗 Visit
                                    </a>
                                  ) : '-'}
                                </td>
                                <td>
                                  <span className="source-badge">{lead.source}</span>
                                </td>
                                <td>
                                  <button 
                                    className="action-button tag-button"
                                    onClick={() => handleAddTag(lead._id)}
                                    title="Add Tag"
                                  >
                                    🏷️ Tag
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      
                      <div className="results-actions">
                        <button 
                          className="secondary-button"
                          onClick={() => setActiveTab('generate')}
                        >
                          ← Back to Search
                        </button>
                        <button 
                          className="primary-button"
                          onClick={() => {
                            const csvContent = "data:text/csv;charset=utf-8," 
                              + "Name,Business,Email,Phone,Website,Source\n"
                              + generatedLeads.map(lead => 
                                  `"${lead.name}","${lead.businessName}","${lead.email}","${lead.phone}","${lead.website}","${lead.source}"`
                                ).join("\n");
                            
                            const encodedUri = encodeURI(csvContent);
                            const link = document.createElement("a");
                            link.setAttribute("href", encodedUri);
                            link.setAttribute("download", `leads_${searchParams.keyword}_${new Date().toISOString().split('T')[0]}.csv`);
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                        >
                          💾 Export CSV
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === 'details' && selectedLead && (
                <div className="lead-details">
                  <h2>🔍 Lead Details</h2>
                  
                  <div className="details-container">
                    <div className="search-info-card">
                      <h3>📋 Search Information</h3>
                      <div className="info-grid">
                        <div className="info-item">
                          <span className="info-label">🎯 Keyword:</span>
                          <span className="info-value">{selectedLead.searchQuery.keyword}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">📊 Sources:</span>
                          <span className="info-value">{selectedLead.searchQuery.sources.join(', ')}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">📍 Location:</span>
                          <span className="info-value">{selectedLead.searchQuery.location}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">📅 Generated:</span>
                          <span className="info-value">{formatDate(selectedLead.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="leads-section">
                      <h3>👥 Generated Leads ({selectedLead.leads.length})</h3>
                      
                      {selectedLead.leads.length > 0 ? (
                        <div className="leads-table-container">
                          <table className="leads-table">
                            <thead>
                              <tr>
                                <th>👤 Name</th>
                                <th>🏢 Business</th>
                                <th>📧 Email</th>
                                <th>📞 Phone</th>
                                <th>📱 Source</th>
                                <th>🏷️ Tags</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedLead.leads.map((lead, index) => {
                                const leadTags = tags.filter(tag => tag.leadId === lead._id);
                                return (
                                  <tr key={index}>
                                    <td>{lead.name !== 'N/A' ? lead.name : '-'}</td>
                                    <td>{lead.businessName !== 'N/A' ? lead.businessName : '-'}</td>
                                    <td>
                                      {lead.email !== 'N/A' ? (
                                        <a href={`mailto:${lead.email}`} className="email-link">
                                          {lead.email}
                                        </a>
                                      ) : '-'}
                                    </td>
                                    <td>
                                      {lead.phone !== 'N/A' ? (
                                        <a href={`tel:${lead.phone}`} className="phone-link">
                                          {lead.phone}
                                        </a>
                                      ) : '-'}
                                    </td>
                                    <td>
                                      <span className="source-badge">{lead.source}</span>
                                    </td>
                                    <td>
                                      <div className="tags-container">
                                        {leadTags.map(tag => (
                                          <span 
                                            key={tag._id} 
                                            className="tag"
                                            style={{ 
                                              backgroundColor: tagOptions.find(t => t.value === tag.tag)?.color || '#2555eb'
                                            }}
                                          >
                                            {tag.tag}
                                            <button 
                                              className="remove-tag"
                                              onClick={() => handleRemoveTag(tag._id)}
                                              title="Remove tag"
                                            >
                                              ×
                                            </button>
                                          </span>
                                        ))}
                                        <button 
                                          className="add-tag-btn"
                                          onClick={() => handleAddTag(lead._id)}
                                          title="Add tag"
                                        >
                                          + Add Tag
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="no-leads-message">
                          <p>No leads found in this search.</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="notes-section">
                      <h3>📝 Notes</h3>
                      <div className="notes-container">
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Add notes about these leads, follow-up actions, or observations..."
                          rows="4"
                          className="notes-textarea"
                        />
                        <button 
                          className="save-notes-button"
                          onClick={() => handleSaveNote(selectedLead._id)}
                          disabled={!notes.trim()}
                        >
                          💾 Save Notes
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="details-actions">
                    <button 
                      className="secondary-button"
                      onClick={() => setActiveTab('history')}
                    >
                      ← Back to History
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LeadGeneration;