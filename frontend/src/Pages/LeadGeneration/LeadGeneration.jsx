import { useState, useEffect, useRef } from 'react';
import { leadAPI } from '../../api';
import './LeadGeneration.css';

const LeadGeneration = () => {
  const [formData, setFormData] = useState({
    keyword: '',
    platforms: ['google', 'linkedin', 'facebook'],
    location: '',
    emailDomain: '',
    maxResults: 20,
    enableGeminiValidation: true
  });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('form');
  
  // Progress tracking state
  const [currentSearchId, setCurrentSearchId] = useState(null);
  const [progress, setProgress] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  // Refs for cleanup
  const pollIntervalRef = useRef(null);
  const timerIntervalRef = useRef(null);

  const platformOptions = [
    { value: 'google', label: 'Google' },
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'facebook', label: 'Facebook' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'twitter', label: 'Twitter' },
    { value: 'yelp', label: 'Yelp' },
    { value: 'yellowpages', label: 'Yellow Pages' },
    { value: 'sulekha', label: 'Sulekha' },
    { value: 'angieslist', label: 'Angie\'s List' },
    { value: 'thumbtack', label: 'Thumbtack' },
    { value: 'houzz', label: 'Houzz' },
    { value: 'reddit', label: 'Reddit' }
  ];

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  // Enhanced lead data validation
  const validateLeadData = (lead) => {
    const issues = [];
    
    // Check if business name looks like a page title or contains invalid patterns
    const businessName = lead.businessName || '';
    const businessNameLower = businessName.toLowerCase();
    
    if (businessNameLower.includes('about') || 
        businessNameLower.includes('contact') ||
        businessNameLower.includes('home') ||
        businessNameLower.includes('services') ||
        businessNameLower.includes('welcome') ||
        businessName.endsWith('.html') ||
        businessName.endsWith('.htm') ||
        businessName.endsWith('.php') ||
        businessName.endsWith('.aspx') ||
        /^\d+\./.test(businessName) || // Starts with numbers followed by dot
        /^page\s+\d+/i.test(businessName) || // Page X format
        /^chapter\s+\d+/i.test(businessName) || // Chapter X format
        businessNameLower === 'unknown' ||
        businessNameLower === 'n/a' ||
        businessName.trim().length < 2) {
      issues.push('Business name appears to be a page title or invalid');
    }
    
    // Check website consistency
    if (lead.website && lead.sourceUrl) {
      try {
        const websiteDomain = new URL(lead.website).hostname.replace('www.', '');
        const sourceDomain = new URL(lead.sourceUrl).hostname.replace('www.', '');
        
        if (websiteDomain !== sourceDomain && !websiteDomain.includes(sourceDomain) && !sourceDomain.includes(websiteDomain)) {
          issues.push('Website domain does not match source domain');
        }
        
        // Check if website is from known aggregator
        const aggregatorDomains = ['clutch.co', 'designrush.com', 'justdial.com', 'yelp.com', 'yellowpages.com', 'sulekha.com'];
        if (aggregatorDomains.some(domain => websiteDomain.includes(domain))) {
          issues.push('Website appears to be from a business directory/aggregator');
        }
      } catch (e) {
        issues.push('Invalid website or source URL format');
      }
    }
    
    // Check email validity
    if (lead.emails && lead.emails.length > 0) {
      const invalidEmails = lead.emails.filter(email => 
        !email || 
        email === 'N/A' || 
        !email.includes('@') || 
        email.length < 5 ||
        /(noreply|donotreply|no-reply|support|help|info|contact)@/i.test(email)
      );
      
      if (invalidEmails.length > 0) {
        issues.push(`Contains ${invalidEmails.length} invalid or generic email addresses`);
      }
    } else {
      issues.push('No valid email addresses found');
    }
    
    // Check phone validity
    if (lead.phones && lead.phones.length > 0) {
      const invalidPhones = lead.phones.filter(phone => 
        !phone || 
        phone === 'N/A' || 
        phone.replace(/[^\d]/g, '').length < 7
      );
      
      if (invalidPhones.length > 0) {
        issues.push(`Contains ${invalidPhones.length} invalid phone numbers`);
      }
    } else {
      issues.push('No valid phone numbers found');
    }
    
    // Check description quality
    if (!lead.description || lead.description.length < 20 || lead.description === 'N/A') {
      issues.push('Missing or very short business description');
    }
    
    // Check if it's likely an aggregator page
    if (lead.isAggregator) {
      issues.push('Source appears to be a business directory/aggregator');
    }
    
    // Check verification status
    if (lead.verificationStatus && lead.verificationStatus !== 'verified') {
      issues.push(`Verification status: ${lead.verificationStatus}`);
    }
    
    return issues;
  };

  // Extract actual domain from URL for display
  const extractDisplayDomain = (url) => {
    if (!url) return 'N/A';
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch (e) {
      return url;
    }
  };

  // Format business name for better display
  const formatBusinessName = (name) => {
    if (!name) return 'Unknown Business';
    
    // Remove common page title prefixes/suffixes
    let formatted = name
      .replace(/\s*[-|–]\s*(Home|Official Site|Website|Welcome|About Us|Contact|Services).*$/i, '')
      .replace(/^\s*(Welcome to|Home of|Official Website of)\s*/i, '')
      .replace(/\.(html|htm|php|aspx)$/i, '')
      .replace(/\s*\|.*$/, '')
      .trim();
    
    // Capitalize properly
    formatted = formatted
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    return formatted || 'Unknown Business';
  };

  // Start polling for progress updates
  const startProgressPolling = (searchId) => {
    setCurrentSearchId(searchId);
    setIsPolling(true);
    setElapsedTime(0);
    
    // Start timer for elapsed time
    timerIntervalRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    // Poll for progress every 3 seconds
    pollIntervalRef.current = setInterval(async () => {
      try {
        const progressData = await leadAPI.getSearchProgress(searchId);
        setProgress(progressData);
        
        // If completed or failed, stop polling and get final results
        if (progressData.status === 'completed' || progressData.status === 'failed') {
          stopProgressPolling();
          
          if (progressData.status === 'completed') {
            // Get full results when completed
            await getFullResults();
          } else {
            setError('Lead generation failed. Please try again.');
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('Progress polling error:', err);
        // Continue polling unless it's a fatal error
        if (err.response?.status === 404) {
          stopProgressPolling();
          setError('Search not found. It may have been deleted.');
          setLoading(false);
        }
      }
    }, 3000); // Poll every 3 seconds
  };

  // Stop polling
  const stopProgressPolling = () => {
    setIsPolling(false);
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handlePlatformChange = (platform) => {
    setFormData(prev => {
      const platforms = [...prev.platforms];
      if (platforms.includes(platform)) {
        return {
          ...prev,
          platforms: platforms.filter(p => p !== platform)
        };
      } else {
        return {
          ...prev,
          platforms: [...platforms, platform]
        };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResults(null);
    setProgress(null);
    setElapsedTime(0);

    try {
      // Get userId from localStorage
      const userInfo = JSON.parse(localStorage.getItem("user-info") || "{}");
      const userId = userInfo.id || userInfo.email || userInfo.sub;
      
      if (!userId) {
        throw new Error('User not authenticated. Please log in again.');
      }

      // Include userId in the request
      const requestData = {
        ...formData,
        userId
      };

      console.log('Sending lead generation request:', requestData);
      
      // Start lead generation (this returns immediately with searchId)
      const response = await leadAPI.generateLeads(requestData);
      
      if (response.success && response.searchId) {
        // Start polling for progress
        startProgressPolling(response.searchId);
      } else {
        throw new Error(response.error || 'Failed to start lead generation');
      }
      
    } catch (err) {
      console.error('Lead generation error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to generate leads');
      setLoading(false);
      stopProgressPolling();
    }
  };

  // Format elapsed time
  const formatElapsedTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Get full results when ready
  const getFullResults = async () => {
    if (!currentSearchId) return;
    
    try {
      const fullData = await leadAPI.getSearchDetail(currentSearchId);
      if (fullData.success && fullData.search) {
        setResults({
          searchId: currentSearchId,
          totalLeads: fullData.search.contacts.length,
          leads: fullData.search.contacts,
          stats: fullData.search.stats,
          progress: fullData.search.progress,
          config: fullData.search.config
        });
        setActiveTab('results');
      }
    } catch (err) {
      console.error('Error fetching full results:', err);
      setError('Failed to fetch complete results');
    }
  };

  const renderProgress = () => {
    if (!progress && !isPolling) return null;

    return (
      <div className="progress-section">
        <h3>Lead Generation Progress</h3>
        <div className="progress-info">
          <p><strong>Search ID:</strong> {currentSearchId}</p>
          <p><strong>Status:</strong> <span className={`status ${progress?.status || 'running'}`}>{progress?.status || 'running'}</span></p>
          <p><strong>Elapsed Time:</strong> {formatElapsedTime(elapsedTime)}</p>
          {progress?.stats && (
            <p><strong>URLs Processed:</strong> {progress.stats.totalUrlsCrawled || 0}/{progress.stats.totalUrlsFound || 0}</p>
          )}
        </div>
        
        {progress && (
          <>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progress.progress?.percentage || 0}%` }}
              ></div>
              <span className="progress-text">
                {progress.progress?.percentage || 0}%
              </span>
            </div>
            
            <div className="progress-details">
              <p><strong>Current Phase:</strong> {progress.progress?.currentPhase || 'initializing'}</p>
              <p><strong>Message:</strong> {progress.progress?.message || 'Starting...'}</p>
              
              {progress.progress?.leadsFound !== undefined && (
                <p><strong>Leads Found:</strong> {progress.progress.leadsFound}</p>
              )}
            </div>
            
            {progress.stats && (
              <div className="stats-preview">
                <h4>Current Statistics</h4>
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-label">URLs Found:</span>
                    <span className="stat-value">{progress.stats.totalUrlsFound || 0}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">URLs Crawled:</span>
                    <span className="stat-value">{progress.stats.totalUrlsCrawled || 0}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Successful Crawls:</span>
                    <span className="stat-value">{progress.stats.successfulCrawls || 0}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Leads Generated:</span>
                    <span className="stat-value">{progress.stats.leadsGenerated || 0}</span>
                  </div>
                  {progress.stats.geminiValidations > 0 && (
                    <div className="stat-item">
                      <span className="stat-label">AI Validations:</span>
                      <span className="stat-value">{progress.stats.geminiValidations}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
        
        {progress?.status === 'completed' && (
          <div className="completion-actions">
            <button onClick={getFullResults} className="view-full-btn">
              View Complete Results
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderResults = () => {
    if (!results) return null;

    return (
      <div className="results-section">
        <div className="results-header">
          <h2>Search Results - {results.searchId}</h2>
          <div className="search-meta">
            <p><strong>Keyword:</strong> {formData.keyword}</p>
            <p><strong>Location:</strong> {formData.location}</p>
            <p><strong>Platforms:</strong> {formData.platforms.join(', ')}</p>
            {results.config?.geminiValidationEnabled && (
              <p><strong>AI Validation:</strong> Enabled</p>
            )}
          </div>
        </div>
        
        <div className="stats-overview">
          <div className="stat-card">
            <span className="stat-number">{results.totalLeads}</span>
            <span className="stat-label">Total Leads</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{results.stats?.qualityLeadsGenerated || 0}</span>
            <span className="stat-label">Quality Leads</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{results.stats?.averageQualityScore?.toFixed(1) || 'N/A'}</span>
            <span className="stat-label">Avg Quality Score</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{results.stats?.geminiValidations || 0}</span>
            <span className="stat-label">AI Validated</span>
          </div>
        </div>

        {results.leads && results.leads.length > 0 ? (
          <div className="leads-container">
            <div className="leads-header">
              <h3>Generated Leads ({results.leads.length})</h3>
              <div className="export-actions">
                <button className="export-btn" onClick={() => exportToCSV(results.leads)}>
                  Export to CSV
                </button>
              </div>
            </div>
            
            <div className="leads-list">
              {results.leads.map((lead, index) => {
                const validationIssues = validateLeadData(lead);
                const displayBusinessName = formatBusinessName(lead.businessName);
                const displayWebsite = extractDisplayDomain(lead.website);
                
                return (
                  <div key={index} className="lead-card">
                    {validationIssues.length > 0 && (
                      <div className="validation-warning">
                        <strong>⚠️ Data Quality Issues:</strong>
                        <ul>
                          {validationIssues.map((issue, i) => (
                            <li key={i}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <div className="lead-header">
                      <h4>{displayBusinessName}</h4>
                      <div className="quality-indicators">
                        <span className={`quality-score ${lead.qualityScore >= 80 ? 'high' : lead.qualityScore >= 60 ? 'medium' : 'low'}`}>
                          Quality: {lead.qualityScore}/100
                        </span>
                        {lead.isVerified && (
                          <span className="verified-badge">✓ Verified</span>
                        )}
                        {lead.isHighQuality && (
                          <span className="high-quality-badge">★ High Quality</span>
                        )}
                        {lead.validationScore && (
                          <span className="ai-score">AI Confidence: {Math.round(lead.validationScore * 100)}%</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="contact-info">
                      <div className="contact-row">
                        <strong>Email:</strong> 
                        <span className={lead.email === 'N/A' ? 'na-value' : ''}>
                          {lead.email}
                        </span>
                      </div>
                      <div className="contact-row">
                        <strong>Phone:</strong> 
                        <span className={lead.phone === 'N/A' ? 'na-value' : ''}>
                          {lead.phone}
                        </span>
                      </div>
                      <div className="contact-row">
                        <strong>Website:</strong> 
                        <a href={lead.website} target="_blank" rel="noopener noreferrer" className="website-link">
                          {displayWebsite}
                        </a>
                      </div>
                    </div>
                    
                    {(lead.emails && lead.emails.length > 1) && (
                      <div className="additional-info">
                        <strong>Additional Emails:</strong>
                        <div className="email-list">
                          {lead.emails.slice(1).map((email, i) => (
                            <span key={i} className="email-tag">{email}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {(lead.phones && lead.phones.length > 1) && (
                      <div className="additional-info">
                        <strong>Additional Phones:</strong>
                        <div className="phone-list">
                          {lead.phones.slice(1).map((phone, i) => (
                            <span key={i} className="phone-tag">{phone}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="business-details">
                      <div className="detail-row">
                        <strong>Business Type:</strong> {lead.businessType || 'general'}
                      </div>
                      {lead.description && (
                        <div className="detail-row">
                          <strong>Description:</strong> 
                          <p className="description-text">{lead.description}</p>
                        </div>
                      )}
                    </div>
                    
                    {lead.socialLinks && lead.socialLinks.length > 0 && (
                      <div className="social-links">
                        <strong>Social Links:</strong>
                        <div className="social-list">
                          {lead.socialLinks.map((link, i) => {
                            const domain = extractDisplayDomain(link);
                            return (
                              <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="social-link">
                                {domain}
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    <div className="lead-metadata">
                      <div className="metadata-row">
                        <strong>Source:</strong> {lead.platform}
                        {lead.sourceUrl && (
                          <a href={lead.sourceUrl} target="_blank" rel="noopener noreferrer" className="source-link">
                            View Source
                          </a>
                        )}
                      </div>
                      <div className="metadata-row">
                        <strong>Verification:</strong> {lead.verificationStatus || 'unverified'}
                        {lead.additionalSourcesChecked > 0 && (
                          <span className="sources-checked">({lead.additionalSourcesChecked} sources checked)</span>
                        )}
                      </div>
                      {lead.validationIssues && lead.validationIssues.length > 0 && (
                        <div className="metadata-row">
                          <strong>AI Feedback:</strong>
                          <ul className="ai-feedback">
                            {lead.validationIssues.map((issue, i) => (
                              <li key={i}>{issue}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="no-results">
            <h3>No leads were generated</h3>
            <p>Try different search parameters or check the search logs for more information.</p>
          </div>
        )}
      </div>
    );
  };

  const renderForm = () => (
    <form onSubmit={handleSubmit} className="lead-form">
      <div className="form-group">
        <label htmlFor="keyword">Business Keyword *</label>
        <input
          type="text"
          id="keyword"
          name="keyword"
          value={formData.keyword}
          onChange={handleInputChange}
          placeholder="e.g., plumber, electrician, restaurant"
          required
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="location">Location *</label>
        <input
          type="text"
          id="location"
          name="location"
          value={formData.location}
          onChange={handleInputChange}
          placeholder="e.g., New York, NY 10001"
          required
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label>Platforms to Search *</label>
        <div className="platforms-grid">
          {platformOptions.map(platform => (
            <label key={platform.value} className="platform-checkbox">
              <input
                type="checkbox"
                checked={formData.platforms.includes(platform.value)}
                onChange={() => handlePlatformChange(platform.value)}
                disabled={loading}
              />
              <span>{platform.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="emailDomain">Email Domain Filter (Optional)</label>
        <input
          type="text"
          id="emailDomain"
          name="emailDomain"
          value={formData.emailDomain}
          onChange={handleInputChange}
          placeholder="e.g., gmail.com (without @)"
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="maxResults">Maximum Results</label>
        <input
          type="number"
          id="maxResults"
          name="maxResults"
          value={formData.maxResults}
          onChange={handleInputChange}
          min="1"
          max="100"
          disabled={loading}
        />
      </div>

      <div className="form-group checkbox-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            name="enableGeminiValidation"
            checked={formData.enableGeminiValidation}
            onChange={handleInputChange}
            disabled={loading}
          />
          <span>Enable AI Validation (Recommended)</span>
        </label>
        <small>Uses Gemini AI to validate and correct business information</small>
      </div>

      <button type="submit" disabled={loading} className="generate-btn">
        {loading ? 'Generating Leads...' : 'Generate Leads'}
      </button>
      
      {loading && (
        <div className="loading-info">
          <p>Lead generation is running in the background. This may take several minutes...</p>
          <p>You can close this page and come back later using the Search ID: <strong>{currentSearchId}</strong></p>
        </div>
      )}
    </form>
  );

  const renderHistory = () => (
    <div className="search-history">
      <h3>Recent Searches</h3>
      <p>Search history functionality will be implemented here.</p>
      <div className="history-placeholder">
        <p>This section will show:</p>
        <ul>
          <li>Previous search parameters</li>
          <li>Search results and statistics</li>
          <li>Ability to re-run or modify searches</li>
          <li>Export functionality</li>
        </ul>
      </div>
    </div>
  );

  // Export to CSV function
  const exportToCSV = (leads) => {
    const headers = [
      'Business Name',
      'Email',
      'Phone',
      'Website',
      'Quality Score',
      'Description',
      'Business Type',
      'Source URL',
      'Verification Status'
    ];
    
    const csvContent = [
      headers.join(','),
      ...leads.map(lead => [
        `"${formatBusinessName(lead.businessName).replace(/"/g, '""')}"`,
        `"${lead.email}"`,
        `"${lead.phone}"`,
        `"${lead.website}"`,
        lead.qualityScore,
        `"${(lead.description || '').replace(/"/g, '""')}"`,
        `"${lead.businessType}"`,
        `"${lead.sourceUrl}"`,
        `"${lead.verificationStatus}"`
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `leads-${results.searchId}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="lead-generation">
      <div className="container">
        <div className="header-section">
          <h1>Generate Leads</h1>
          <p>Use advanced search technology to find business leads with verified contact information</p>
        </div>

        <div className="tabs">
          <button 
            className={activeTab === 'form' ? 'active' : ''}
            onClick={() => setActiveTab('form')}
            disabled={loading}
          >
            New Search
          </button>
          <button 
            className={activeTab === 'history' ? 'active' : ''}
            onClick={() => setActiveTab('history')}
            disabled={loading}
          >
            Search History
          </button>
          {results && (
            <button 
              className={activeTab === 'results' ? 'active' : ''}
              onClick={() => setActiveTab('results')}
            >
              Results ({results.totalLeads})
            </button>
          )}
        </div>

        <div className="tab-content">
          {activeTab === 'form' && (
            <>
              {renderForm()}
              {error && (
                <div className="error-message">
                  <h3>Error</h3>
                  <p>{error}</p>
                  {currentSearchId && (
                    <p>Search ID for debugging: {currentSearchId}</p>
                  )}
                </div>
              )}
              {(loading || progress) && renderProgress()}
            </>
          )}

          {activeTab === 'results' && renderResults()}

          {activeTab === 'history' && renderHistory()}
        </div>
      </div>
    </div>
  );
};

export default LeadGeneration;