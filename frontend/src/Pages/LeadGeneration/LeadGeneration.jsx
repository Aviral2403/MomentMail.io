import { useState } from 'react';
import { leadAPI } from '../../api';
import './LeadGeneration.css';

const LeadGeneration = () => {
  const [formData, setFormData] = useState({
    keyword: '',
    platforms: ['google', 'linkedin', 'yelp'],
    location: '',
    emailDomain: '',
    maxResults: 20
  });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('form'); // 'form' or 'history'

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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

    try {
      const response = await leadAPI.generateLeads(formData);
      setResults(response);
      setActiveTab('results');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to generate leads');
    } finally {
      setLoading(false);
    }
  };

  const renderResults = () => {
    if (!results) return null;

    return (
      <div className="results-section">
        <h2>Search Results - {results.searchId}</h2>
        <div className="search-meta">
          <p><strong>Keyword:</strong> {results.stats.keyword}</p>
          <p><strong>Location:</strong> {results.stats.location}</p>
          <p><strong>Platforms:</strong> {results.stats.platforms.join(', ')}</p>
        </div>
        
        <div className="stats">
          <p><strong>Leads Generated:</strong> {results.stats.leadsGenerated}</p>
          <p><strong>Total URLs Found:</strong> {results.stats.totalUrlsFound}</p>
          <p><strong>Search API Usage:</strong> {results.stats.searchApiUsage.dailyQueries} / {results.stats.searchApiUsage.maxDailyQueries}</p>
        </div>

        {results.leads && results.leads.length > 0 ? (
          <div className="leads-list">
            <h3>Generated Leads ({results.leads.length})</h3>
            {results.leads.map((lead, index) => (
              <div key={index} className="lead-card">
                <h4>{lead.businessName}</h4>
                <p><strong>Email:</strong> {lead.email}</p>
                <p><strong>Phone:</strong> {lead.phone}</p>
                <p><strong>Website:</strong> <a href={lead.website} target="_blank" rel="noopener noreferrer">{lead.website}</a></p>
                <p><strong>Source:</strong> {lead.platform}</p>
                <p><strong>Status:</strong> <span className={`status-${lead.status}`}>{lead.status}</span></p>
                {lead.socialLinks && lead.socialLinks.length > 0 && (
                  <div>
                    <strong>Social Links:</strong>
                    <ul>
                      {lead.socialLinks.map((link, i) => (
                        <li key={i}><a href={link} target="_blank" rel="noopener noreferrer">{link}</a></li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p>No leads were generated. Try different search parameters.</p>
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
        />
      </div>

      <button type="submit" disabled={loading} className="generate-btn">
        {loading ? 'Generating Leads...' : 'Generate Leads'}
      </button>
    </form>
  );

  return (
    <div className="lead-generation">
      <div className="container">
        <h1>Generate Leads</h1>
        <p>Use Google Search API to find business leads with contact information</p>

        <div className="tabs">
          <button 
            className={activeTab === 'form' ? 'active' : ''}
            onClick={() => setActiveTab('form')}
          >
            New Search
          </button>
          <button 
            className={activeTab === 'history' ? 'active' : ''}
            onClick={() => setActiveTab('history')}
          >
            Search History
          </button>
        </div>

        {activeTab === 'form' && (
          <>
            {renderForm()}
            {error && (
              <div className="error-message">
                <h3>Error</h3>
                <p>{error}</p>
              </div>
            )}
            {results && renderResults()}
          </>
        )}

        {activeTab === 'history' && (
          <div className="search-history">
            <h3>Recent Searches</h3>
            <p>Search history functionality will be implemented here.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadGeneration;