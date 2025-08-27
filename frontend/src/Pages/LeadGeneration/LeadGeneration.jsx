import { useState, useEffect } from 'react';
import { 
  generateLeads, 
  getLeadHistory, 
  getLeadDetails, 
  updateLeadNotes,
  deleteSearch 
} from '../../api';
import useTokenRefresh from '../../Hooks/useTokenRefresh';
import LoadingSkeleton from '../../Components/LoadingSkeleton/LoadingSkeleton';
import './LeadGeneration.css';

const LeadGeneration = () => {
  useTokenRefresh();
  const [activeTab, setActiveTab] = useState('generate');
  const [loading, setLoading] = useState(false);
  const [searchData, setSearchData] = useState({
    keyword: '',
    platforms: [],
    location: '',
    emailDomain: ''
  });
  const [generatedLeads, setGeneratedLeads] = useState([]);
  const [searchQuery, setSearchQuery] = useState(null);
  const [searchStats, setSearchStats] = useState(null);
  const [leadHistory, setLeadHistory] = useState([]);
  const [selectedSearch, setSelectedSearch] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [availableTags] = useState([
    'Contacted', 'Converted', 'Unresponsive', 'Follow Up', 'Hot Lead', 'Cold Lead', 'Qualified', 'Not Interested'
  ]);

  const platformOptions = [
    { value: 'google', label: 'Google', icon: '🔍' },
    { value: 'facebook', label: 'Facebook', icon: '📘' },
    { value: 'instagram', label: 'Instagram', icon: '📸' },
    { value: 'linkedin', label: 'LinkedIn', icon: '💼' },
    { value: 'twitter', label: 'Twitter', icon: '🐦' },
    { value: 'yellowpages', label: 'Yellow Pages', icon: '📒' },
    { value: 'yelp', label: 'Yelp', icon: '⭐' },
    { value: 'sulekha', label: 'Sulekha', icon: '🇮🇳' },
    { value: 'fiverr', label: 'Fiverr', icon: '🎨' },
    { value: 'upwork', label: 'Upwork', icon: '💻' },
    { value: 'google_maps', label: 'Google Maps', icon: '🗺️' },
    { value: 'job_boards', label: 'Job Boards', icon: '📋' },
    { value: 'reddit', label: 'Reddit', icon: '👾' },
    { value: 'angieslist', label: 'Angies List', icon: '🏠' },
    { value: 'thumbtack', label: 'Thumbtack', icon: '🔧' },
    { value: 'houzz', label: 'Houzz', icon: '🏡' },
    { value: 'bing', label: 'Bing', icon: '🔍' },
    { value: 'pinterest', label: 'Pinterest', icon: '📌' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSearchData(prev => ({ ...prev, [name]: value }));
  };

  const handlePlatformChange = (platform) => {
    setSearchData(prev => {
      if (prev.platforms.includes(platform)) {
        return {
          ...prev,
          platforms: prev.platforms.filter(p => p !== platform)
        };
      } else {
        return {
          ...prev,
          platforms: [...prev.platforms, platform]
        };
      }
    });
  };

  const handleGenerateLeads = async () => {
    if (!searchData.keyword || searchData.platforms.length === 0) {
      alert('Please enter a keyword and select at least one platform');
      return;
    }

    setLoading(true);
    try {
      const response = await generateLeads(searchData);
      if (response.success) {
        setGeneratedLeads(response.leads);
        setSearchQuery(response.query);
        setSearchStats(response.stats);
      } else {
        throw new Error(response.message || 'Failed to generate leads');
      }
    } catch (error) {
      console.error('Lead generation failed:', error);
      alert(error.message || 'Failed to generate leads. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeadHistory = async (page = 1) => {
    try {
      const response = await getLeadHistory(page, 10);
      setLeadHistory(response.history);
      setCurrentPage(response.pagination.page);
      setTotalPages(response.pagination.pages);
    } catch (error) {
      console.error('Failed to fetch lead history:', error);
    }
  };

  const fetchLeadDetails = async (id) => {
    try {
      const details = await getLeadDetails(id);
      setSelectedSearch(details);
    } catch (error) {
      console.error('Failed to fetch lead details:', error);
    }
  };

  const handleSaveLeadNotes = async (searchId, leadIndex, notes, tags) => {
    try {
      await updateLeadNotes(searchId, leadIndex, { notes, tags });
      // Refresh the selected search details
      if (selectedSearch?._id === searchId) {
        const updatedDetails = await getLeadDetails(searchId);
        setSelectedSearch(updatedDetails);
      }
    } catch (error) {
      console.error('Failed to update lead:', error);
      alert('Failed to update lead. Please try again.');
    }
  };

  const handleDeleteSearch = async (searchId) => {
    if (window.confirm('Are you sure you want to delete this search and all its leads?')) {
      try {
        await deleteSearch(searchId);
        if (selectedSearch?._id === searchId) {
          setSelectedSearch(null);
        }
        fetchLeadHistory(currentPage);
        alert('Search deleted successfully');
      } catch (error) {
        console.error('Failed to delete search:', error);
        alert('Failed to delete search. Please try again.');
      }
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchLeadHistory();
    }
  }, [activeTab]);

  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    return `${seconds}s`;
  };

  return (
    <div className="lead-generation-container">
      <div className="lead-generation-header">
        <h1>Lead Generation</h1>
        <p>Discover and manage potential business leads from multiple sources</p>
      </div>

      <div className="lead-tabs">
        <button 
          className={`tab-button ${activeTab === 'generate' ? 'active' : ''}`}
          onClick={() => setActiveTab('generate')}
        >
          Generate Leads
        </button>
        <button 
          className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Lead History
        </button>
      </div>

      {activeTab === 'generate' ? (
        <div className="generate-section">
          <div className="search-form">
            <div className="form-group">
              <label>Business Keyword*</label>
              <input
                type="text"
                value={searchData.keyword}
                onChange={(e) => handleInputChange({ target: { name: 'keyword', value: e.target.value } })}
                placeholder="e.g. web development, plumber, digital marketing"
              />
            </div>

            <div className="form-group">
              <label>Platforms* (Select at least one)</label>
              <div className="platform-grid">
                {platformOptions.map(platform => (
                  <div key={platform.value} className="platform-item">
                    <input
                      type="checkbox"
                      id={platform.value}
                      checked={searchData.platforms.includes(platform.value)}
                      onChange={() => handlePlatformChange(platform.value)}
                    />
                    <label htmlFor={platform.value}>
                      <span className="platform-icon">{platform.icon}</span>
                      {platform.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  value={searchData.location}
                  onChange={(e) => handleInputChange({ target: { name: 'location', value: e.target.value } })}
                  placeholder="City, State or Country"
                />
              </div>
              <div className="form-group">
                <label>Email Domain Filter</label>
                <input
                  type="text"
                  value={searchData.emailDomain}
                  onChange={(e) => handleInputChange({ target: { name: 'emailDomain', value: e.target.value } })}
                  placeholder="gmail.com (without @)"
                />
              </div>
            </div>

            <button 
              className="generate-btn"
              onClick={handleGenerateLeads}
              disabled={loading || searchData.platforms.length === 0}
            >
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  Generating Leads...
                </>
              ) : (
                'Generate Leads'
              )}
            </button>
          </div>

          {loading && <LoadingSkeleton type="table" rows={5} />}

          {generatedLeads.length > 0 && (
            <div className="results-section">
              <div className="results-header">
                <h2>Generated Leads</h2>
                <div className="search-stats">
                  <span>Found: {searchStats.unique} unique leads</span>
                  <span>Time: {formatTime(searchStats.processingTime)}</span>
                  <span>Sources: {searchQuery.platforms.join(', ')}</span>
                </div>
              </div>

              <div className="results-table-container">
                <table className="results-table">
                  <thead>
                    <tr>
                      <th>Business Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Website</th>
                      <th>Social Links</th>
                      <th>Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generatedLeads.map((lead, index) => (
                      <tr key={`${lead.businessName}-${index}-${lead.source}`}>
                        <td className="business-name">{lead.businessName}</td>
                        <td className="email">
                          {lead.email !== 'N/A' ? (
                            <a href={`mailto:${lead.email}`}>{lead.email}</a>
                          ) : '-'}
                        </td>
                        <td className="phone">
                          {lead.phone !== 'N/A' ? (
                            <a href={`tel:${lead.phone}`}>{lead.phone}</a>
                          ) : '-'}
                        </td>
                        <td className="website">
                          {lead.website !== 'N/A' ? (
                            <a 
                              href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                            >
                              Visit Website
                            </a>
                          ) : '-'}
                        </td>
                        <td className="social-links">
                          {lead.socialLinks && lead.socialLinks.length > 0 ? (
                            <div className="social-links-container">
                              {lead.socialLinks.slice(0, 2).map((link, i) => (
                                <a 
                                  key={i} 
                                  href={link} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="social-link"
                                >
                                  {new URL(link).hostname}
                                </a>
                              ))}
                              {lead.socialLinks.length > 2 && (
                                <span className="more-links">+{lead.socialLinks.length - 2} more</span>
                              )}
                            </div>
                          ) : '-'}
                        </td>
                        <td className="source">{lead.source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="results-actions">
                <button 
                  className="new-search-btn"
                  onClick={() => {
                    setGeneratedLeads([]);
                    setSearchQuery(null);
                    setSearchStats(null);
                  }}
                >
                  Start New Search
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="history-section">
          <div className="history-container">
            <div className="searches-list">
              <div className="searches-header">
                <h2>Search History</h2>
                {leadHistory.length > 0 && (
                  <div className="pagination">
                    <button 
                      onClick={() => fetchLeadHistory(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      ←
                    </button>
                    <span>Page {currentPage} of {totalPages}</span>
                    <button 
                      onClick={() => fetchLeadHistory(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      →
                    </button>
                  </div>
                )}
              </div>
              
              {leadHistory.length === 0 ? (
                <p className="no-searches">No search history found</p>
              ) : (
                <div className="search-cards">
                  {leadHistory.map(search => (
                    <div 
                      key={search._id}
                      className={`search-card ${selectedSearch?._id === search._id ? 'active' : ''}`}
                      onClick={() => fetchLeadDetails(search._id)}
                    >
                      <div className="search-card-header">
                        <h3>{search.searchQuery.keyword}</h3>
                        <button 
                          className="delete-search-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSearch(search._id);
                          }}
                          title="Delete this search"
                        >
                          ×
                        </button>
                      </div>
                      <p className="platforms">
                        {search.searchQuery.platforms.slice(0, 3).join(', ')}
                        {search.searchQuery.platforms.length > 3 && '...'}
                      </p>
                      {search.searchQuery.location && (
                        <p className="location">📍 {search.searchQuery.location}</p>
                      )}
                      <div className="search-meta">
                        <span>{new Date(search.createdAt).toLocaleDateString()}</span>
                        <span>{search.leads.length} leads</span>
                        {search.stats && (
                          <span>{formatTime(search.stats.processingTime)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="leads-details">
              {selectedSearch ? (
                <>
                  <div className="details-header">
                    <h2>
                      Leads from {new Date(selectedSearch.createdAt).toLocaleDateString()}
                    </h2>
                    <div className="search-info">
                      <p><strong>Keyword:</strong> {selectedSearch.searchQuery.keyword}</p>
                      <p><strong>Platforms:</strong> {selectedSearch.searchQuery.platforms.join(', ')}</p>
                      {selectedSearch.searchQuery.location && (
                        <p><strong>Location:</strong> {selectedSearch.searchQuery.location}</p>
                      )}
                      {selectedSearch.searchQuery.emailDomain && (
                        <p><strong>Email Domain:</strong> @{selectedSearch.searchQuery.emailDomain}</p>
                      )}
                      <p><strong>Total Leads:</strong> {selectedSearch.leads.length}</p>
                    </div>
                  </div>

                  <div className="leads-table-container">
                    <table className="leads-details-table">
                      <thead>
                        <tr>
                          <th>Business Name</th>
                          <th>Contact Info</th>
                          <th>Website</th>
                          <th>Social Links</th>
                          <th>Source</th>
                          <th>Tags</th>
                          <th>Notes</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSearch.leads.map((lead, index) => (
                          <tr key={index}>
                            <td className="business-name">{lead.businessName}</td>
                            <td className="contact-info">
                              <div>
                                {lead.email !== 'N/A' && (
                                  <div className="contact-item">
                                    <span className="contact-label">📧</span>
                                    <a href={`mailto:${lead.email}`}>{lead.email}</a>
                                  </div>
                                )}
                                {lead.phone !== 'N/A' && (
                                  <div className="contact-item">
                                    <span className="contact-label">📞</span>
                                    <a href={`tel:${lead.phone}`}>{lead.phone}</a>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="website">
                              {lead.website !== 'N/A' ? (
                                <a 
                                  href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  Visit
                                </a>
                              ) : '-'}
                            </td>
                            <td className="social-links">
                              {lead.socialLinks && lead.socialLinks.length > 0 ? (
                                <div className="social-links-list">
                                  {lead.socialLinks.slice(0, 3).map((link, i) => (
                                    <a
                                      key={i}
                                      href={link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="social-link"
                                    >
                                      {new URL(link).hostname}
                                    </a>
                                  ))}
                                  {lead.socialLinks.length > 3 && (
                                    <span className="more-links">+{lead.socialLinks.length - 3}</span>
                                  )}
                                </div>
                              ) : '-'}
                            </td>
                            <td className="source">{lead.source}</td>
                            <td className="tags">
                              <select
                                multiple
                                value={lead.tags || []}
                                onChange={(e) => {
                                  const options = Array.from(e.target.selectedOptions, option => option.value);
                                  handleSaveLeadNotes(selectedSearch._id, index, lead.notes, options);
                                }}
                                className="tags-select"
                              >
                                {availableTags.map(tag => (
                                  <option key={tag} value={tag}>{tag}</option>
                                ))}
                              </select>
                            </td>
                            <td className="notes">
                              <textarea
                                value={lead.notes || ''}
                                placeholder="Add notes about this lead..."
                                onChange={(e) => {
                                  handleSaveLeadNotes(selectedSearch._id, index, e.target.value, lead.tags);
                                }}
                                className="notes-textarea"
                              />
                            </td>
                            <td className="actions">
                              <button
                                className="save-lead-btn"
                                onClick={() => {
                                  handleSaveLeadNotes(selectedSearch._id, index, lead.notes, lead.tags);
                                }}
                                title="Save changes"
                              >
                                💾
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="no-selection">
                  <div className="no-selection-content">
                    <h3>Select a Search</h3>
                    <p>Choose a search from the left to view and manage its leads</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadGeneration;