import './LoadingSkeleton.css';

const LoadingSkeleton = ({ type, activeTab = 'scheduled' }) => {
  const renderScheduledSkeleton = () => (
    <div className="dashboard-skeleton-data-section">
      {/* Table Skeleton */}
      <div className="dashboard-skeleton-table-wrapper">
        <table className="dashboard-skeleton-emails-table">
          <thead>
            <tr>
              <th><div className="dashboard-skeleton-th"></div></th>
              <th><div className="dashboard-skeleton-th"></div></th>
              <th><div className="dashboard-skeleton-th"></div></th>
              <th><div className="dashboard-skeleton-th"></div></th>
              <th><div className="dashboard-skeleton-th"></div></th>
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, index) => (
              <tr key={index}>
                <td><div className="dashboard-skeleton-td dashboard-skeleton-td-wide"></div></td>
                <td><div className="dashboard-skeleton-td dashboard-skeleton-td-narrow"></div></td>
                <td>
                  <div className="dashboard-skeleton-date-time">
                    <div className="dashboard-skeleton-td dashboard-skeleton-td-medium"></div>
                    <div className="dashboard-skeleton-td dashboard-skeleton-td-small"></div>
                  </div>
                </td>
                <td><div className="dashboard-skeleton-status-badge"></div></td>
                <td><div className="dashboard-skeleton-action-button"></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderHistorySkeleton = () => (
    <div className="dashboard-skeleton-data-section">
      <div className="dashboard-skeleton-cards-grid">
        {[...Array(6)].map((_, index) => (
          <div key={index} className="dashboard-skeleton-history-card">
            <div className="dashboard-skeleton-card-header">
              <div className="dashboard-skeleton-card-title"></div>
              <div className="dashboard-skeleton-status-badge"></div>
            </div>
            <div className="dashboard-skeleton-card-content">
              <div className="dashboard-skeleton-card-row">
                <div className="dashboard-skeleton-card-label"></div>
                <div className="dashboard-skeleton-card-value-small"></div>
              </div>
              <div className="dashboard-skeleton-card-row">
                <div className="dashboard-skeleton-card-label"></div>
                <div className="dashboard-skeleton-card-value-medium"></div>
              </div>
              <div className="dashboard-skeleton-card-row">
                <div className="dashboard-skeleton-card-label"></div>
                <div className="dashboard-skeleton-card-value-small"></div>
              </div>
              <div className="dashboard-skeleton-card-row">
                <div className="dashboard-skeleton-card-label"></div>
                <div className="dashboard-skeleton-card-value-small"></div>
              </div>
              <div className="dashboard-skeleton-email-preview">
                <div className="dashboard-skeleton-preview-content">
                  <div className="dashboard-skeleton-email-template">
                    <div className="dashboard-skeleton-template-line"></div>
                    <div className="dashboard-skeleton-template-line"></div>
                    <div className="dashboard-skeleton-template-line dashboard-skeleton-template-line-short"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCalendarSkeleton = () => (
    <div className="dashboard-skeleton-calendar-view">
      <div className="dashboard-skeleton-calendar-header">
        <div className="dashboard-skeleton-calendar-nav-group">
          <div className="dashboard-skeleton-nav-button"></div>
          <div className="dashboard-skeleton-month-title"></div>
          <div className="dashboard-skeleton-nav-button"></div>
        </div>
        <div className="dashboard-skeleton-calendar-week-nav">
          <div className="dashboard-skeleton-nav-button"></div>
          <div className="dashboard-skeleton-week-indicator"></div>
          <div className="dashboard-skeleton-nav-button"></div>
        </div>
      </div>

      <div className="dashboard-skeleton-horizontal-calendar-container">
        <div className="dashboard-skeleton-horizontal-calendar">
          <div className="dashboard-skeleton-time-column">
            <div className="dashboard-skeleton-time-header"></div>
            {[...Array(8)].map((_, index) => (
              <div key={index} className="dashboard-skeleton-time-slot"></div>
            ))}
          </div>

          {[...Array(7)].map((_, dayIndex) => (
            <div key={dayIndex} className="dashboard-skeleton-day-column">
              <div className="dashboard-skeleton-day-header">
                <div className="dashboard-skeleton-weekday"></div>
                <div className="dashboard-skeleton-day-number"></div>
              </div>
              {[...Array(8)].map((_, timeIndex) => (
                <div key={timeIndex} className="dashboard-skeleton-time-slot-cell">
                  <div className="dashboard-skeleton-time-slot-content">
                    {Math.random() > 0.7 && (
                      <div className="dashboard-skeleton-calendar-event">
                        <div className="dashboard-skeleton-event-time"></div>
                        <div className="dashboard-skeleton-event-title"></div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSkeleton = () => {
    switch (type) {
      case 'homepage':
        return (
          <div className="homepage-skeleton-container">
            <div className="homepage-skeleton-content">
              {/* Hero Section Skeleton */}
              <div className="homepage-skeleton-hero-section">
                <div className="homepage-skeleton-hero-text-wrapper">
                  <div className="homepage-skeleton-hero-title">
                    <div className="homepage-skeleton-text-line homepage-skeleton-title-line-1"></div>
                    <div className="homepage-skeleton-text-line homepage-skeleton-title-line-2"></div>
                  </div>
                  <div className="homepage-skeleton-hero-subtitle">
                    <div className="homepage-skeleton-text-line homepage-skeleton-subtitle-line"></div>
                  </div>
                </div>
              </div>

              {/* Dual Scroll Skeleton */}
              <div className="homepage-skeleton-dual-scroll">
                <div className="homepage-skeleton-scroll-column">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="homepage-skeleton-scroll-item"></div>
                  ))}
                </div>
                <div className="homepage-skeleton-scroll-column">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="homepage-skeleton-scroll-item"></div>
                  ))}
                </div>
              </div>

              {/* Hero Section 2 Skeleton */}
              <div className="homepage-skeleton-hero-section-2">
                <div className="homepage-skeleton-hero-2-text">
                  <div className="homepage-skeleton-text-line homepage-skeleton-hero-2-subtitle"></div>
                  <div className="homepage-skeleton-text-line homepage-skeleton-hero-2-title-1"></div>
                  <div className="homepage-skeleton-text-line homepage-skeleton-hero-2-title-2"></div>
                </div>
              </div>

              {/* Workflow Skeleton */}
              <div className="homepage-skeleton-workflow">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="homepage-skeleton-workflow-card">
                    <div className="homepage-skeleton-workflow-number"></div>
                    <div className="homepage-skeleton-workflow-content">
                      <div className="homepage-skeleton-text-line homepage-skeleton-workflow-title"></div>
                      <div className="homepage-skeleton-text-line homepage-skeleton-workflow-desc-1"></div>
                      <div className="homepage-skeleton-text-line homepage-skeleton-workflow-desc-2"></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Templates Hero Skeleton */}
              <div className="homepage-skeleton-templates-hero">
                <div className="homepage-skeleton-text-line homepage-skeleton-templates-title"></div>
                <div className="homepage-skeleton-text-line homepage-skeleton-templates-subtitle"></div>
              </div>

              {/* Email Marketing AI Skeleton */}
              <div className="homepage-skeleton-email-marketing">
                <div className="homepage-skeleton-email-text">
                  <div className="homepage-skeleton-beta-tag"></div>
                  <div className="homepage-skeleton-text-line homepage-skeleton-email-title-1"></div>
                  <div className="homepage-skeleton-text-line homepage-skeleton-email-title-2"></div>
                  <div className="homepage-skeleton-text-line homepage-skeleton-email-desc"></div>
                  <div className="homepage-skeleton-features">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="homepage-skeleton-text-line homepage-skeleton-feature-item"></div>
                    ))}
                  </div>
                  <div className="homepage-skeleton-button"></div>
                </div>
                <div className="homepage-skeleton-email-image"></div>
              </div>

              {/* Schedule Email Skeleton */}
              <div className="homepage-skeleton-schedule-email">
                <div className="homepage-skeleton-schedule-image"></div>
                <div className="homepage-skeleton-schedule-text">
                  <div className="homepage-skeleton-text-line homepage-skeleton-schedule-title-1"></div>
                  <div className="homepage-skeleton-text-line homepage-skeleton-schedule-title-2"></div>
                  <div className="homepage-skeleton-text-line homepage-skeleton-schedule-desc-1"></div>
                  <div className="homepage-skeleton-text-line homepage-skeleton-schedule-desc-2"></div>
                  <div className="homepage-skeleton-text-line homepage-skeleton-schedule-desc-3"></div>
                </div>
              </div>

              {/* Features Grid Skeleton */}
              <div className="homepage-skeleton-features-grid">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="homepage-skeleton-feature-item">
                    <div className="homepage-skeleton-text-line homepage-skeleton-feature-title"></div>
                    <div className="homepage-skeleton-text-line homepage-skeleton-feature-desc-1"></div>
                    <div className="homepage-skeleton-text-line homepage-skeleton-feature-desc-2"></div>
                    <div className="homepage-skeleton-text-line homepage-skeleton-feature-desc-3"></div>
                  </div>
                ))}
              </div>

              {/* Tagline Skeleton */}
              <div className="homepage-skeleton-tagline">
                <div className="homepage-skeleton-text-line homepage-skeleton-tagline-text"></div>
              </div>

              {/* CTA Section Skeleton */}
              <div className="homepage-skeleton-cta">
                <div className="homepage-skeleton-cta-button"></div>
                <div className="homepage-skeleton-text-line homepage-skeleton-cta-subtitle"></div>
              </div>
            </div>
          </div>
        );

      case 'templates':
        return (
          <div className="templates-skeleton-page">
      {/* Drive Connect Skeleton */}
      <div className="templates-skeleton-drive-connect">
        <div className="templates-skeleton-connect-bg-text"></div>
        <div className="templates-skeleton-instruction"></div>
        <div className="templates-skeleton-connect-button"></div>
      </div>

      {/* Rolling Gallery Skeleton */}
      <div className="templates-skeleton-gallery">
        <div className="templates-skeleton-gallery-container">
          <div className="templates-skeleton-gallery-item"></div>
          <div className="templates-skeleton-gallery-item"></div>
          <div className="templates-skeleton-gallery-item"></div>
        </div>
      </div>

      {/* Template Library Hero Section Skeleton */}
      <div className="templates-skeleton-lib-container">
        <div className="templates-skeleton-lib-content">
          <div className="templates-skeleton-lib-image"></div>
          <div className="templates-skeleton-lib-text">
            <div className="templates-skeleton-lib-heading"></div>
            <div className="templates-skeleton-lib-heading-line2"></div>
            <div className="templates-skeleton-lib-description"></div>
            <div className="templates-skeleton-lib-description-line2"></div>
          </div>
        </div>
      </div>

      {/* Choose/Create Lines Skeleton */}
      <div className="templates-skeleton-choose-create">
        <div className="templates-skeleton-choose-line">
          <div className="templates-skeleton-line-text"></div>
        </div>
        <div className="templates-skeleton-create-line">
          <div className="templates-skeleton-line-text"></div>
        </div>
      </div>

      {/* Template Grid Skeleton */}
      <div className="templates-skeleton-grid">
        {[...Array(8)].map((_, index) => (
          <div key={index} className="templates-skeleton-card">
            <div className="templates-skeleton-preview">
              <div className="templates-skeleton-preview-content"></div>
              <div className="templates-skeleton-category"></div>
              <div className="templates-skeleton-actions">
                <div className="templates-skeleton-btn"></div>
                <div className="templates-skeleton-btn"></div>
              </div>
            </div>
            <div className="templates-skeleton-info">
              <div className="templates-skeleton-title"></div>
              <div className="templates-skeleton-description-line1"></div>
              <div className="templates-skeleton-description-line2"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Your Own Template Skeleton */}
      <div className="templates-skeleton-create-section">
        <div className="templates-skeleton-create-heading"></div>
        <div className="templates-skeleton-custom-card">
          <div className="templates-skeleton-custom-preview">
            <div className="templates-skeleton-custom-header">
              <div className="templates-skeleton-from-field"></div>
              <div className="templates-skeleton-subject-field"></div>
            </div>
            <div className="templates-skeleton-custom-content"></div>
          </div>
          <div className="templates-skeleton-custom-info">
            <div className="templates-skeleton-custom-description"></div>
            <div className="templates-skeleton-custom-description-line2"></div>
            <div className="templates-skeleton-custom-actions">
              <div className="templates-skeleton-custom-btn"></div>
              <div className="templates-skeleton-custom-btn"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Message Skeleton */}
      <div className="templates-skeleton-message">
        <div className="templates-skeleton-message-line"></div>
        <div className="templates-skeleton-message-line"></div>
      </div>
    </div>
        );

      case 'template-editor':
        return (
          <div className="template-editor-page">
          <main className="template-editor-main">
            <div className="template-editor-container">
              {/* Header Skeleton */}
              <div className="editor-skeleton-header">
                <div className="editor-skeleton-back-button"></div>
                <div className="editor-skeleton-title"></div>
                <div className="editor-skeleton-actions">
                  <div className="editor-skeleton-button"></div>
                  <div className="editor-skeleton-button"></div>
                </div>
              </div>
    
              {/* Email Header Skeleton */}
              <div className="editor-skeleton-email-header">
                <div className="editor-skeleton-from-field"></div>
                <div className="editor-skeleton-subject-field"></div>
              </div>
    
              {/* Editor Skeleton */}
              <div className="editor-skeleton-wrapper">
                {/* Toolbar Skeleton */}
                <div className="editor-skeleton-toolbar">
                  <div className="editor-skeleton-toolbar-group">
                    <div className="editor-skeleton-toolbar-button"></div>
                    <div className="editor-skeleton-toolbar-button"></div>
                    
                  </div>
                  <div className="editor-skeleton-toolbar-group">
                    <div className="editor-skeleton-toolbar-button"></div>
                    <div className="editor-skeleton-toolbar-button"></div>
                  </div>
                  <div className="editor-skeleton-toolbar-group">
                    <div className="editor-skeleton-toolbar-button"></div>
                    <div className="editor-skeleton-toolbar-button"></div>
                    
                  </div>
                </div>
    
                {/* Content Area Skeleton */}
                <div className="editor-skeleton-content">
                  <div className="editor-skeleton-content-line editor-skeleton-line-full"></div>
                  <div className="editor-skeleton-content-line editor-skeleton-line-60"></div>
                  <div className="editor-skeleton-content-line editor-skeleton-line-full"></div>
                  <div className="editor-skeleton-content-line editor-skeleton-line-90"></div>
                  <div className="editor-skeleton-content-line editor-skeleton-line-full"></div>
                  <div className="editor-skeleton-content-line editor-skeleton-line-50"></div>
                  <div className="editor-skeleton-content-line editor-skeleton-line-30"></div>
                  <div className="editor-skeleton-content-line editor-skeleton-line-full"></div>
                  <div className="editor-skeleton-content-line editor-skeleton-line-65"></div>
                  <div className="editor-skeleton-content-line editor-skeleton-line-80"></div>
                </div>
              </div>
            </div>
          </main>
    
          {/* Send Email Actions Skeleton */}
          <div className="editor-skeleton-send-actions">
            <div className="editor-skeleton-send-button"></div>
            <div className="editor-skeleton-send-button"></div>
          </div>
        </div>
        );

      case 'template-preview':
        return (
          <div className="preview-skeleton-container">
      {/* Back Button Skeleton */}
      <div className="preview-skeleton-back-button-container">
        <div className="preview-skeleton-back-button">
          <div className="preview-skeleton-back-icon"></div>
          <div className="preview-skeleton-back-text"></div>
        </div>
      </div>

      {/* Device Mockups Container */}
      <div className="preview-skeleton-device-mockups">
        {/* MacBook Skeleton */}
        <div className="preview-skeleton-macbook-mockup">
          <div className="preview-skeleton-macbook-screen">
            <div className="preview-skeleton-mac-email-client">
              {/* Mac Email Header */}
              <div className="preview-skeleton-mac-email-header">
                <div className="preview-skeleton-mac-header-left">
                  <div className="preview-skeleton-mac-menu-icon"></div>
                  <div className="preview-skeleton-mac-search-bar"></div>
                </div>
              </div>
              
              {/* Mac Email Content */}
              <div className="preview-skeleton-mac-email-content">
                {/* Toolbar */}
                <div className="preview-skeleton-mac-email-toolbar">
                  <div className="preview-skeleton-mac-toolbar-left">
                    <div className="preview-skeleton-mac-tool-btn"></div>
                    <div className="preview-skeleton-mac-tool-btn"></div>
                    <div className="preview-skeleton-mac-tool-btn"></div>
                    <div className="preview-skeleton-mac-tool-btn"></div>
                    <div className="preview-skeleton-mac-tool-btn"></div>
                  </div>
                </div>
                
                {/* Email View */}
                <div className="preview-skeleton-mac-email-view">
                  {/* Subject */}
                  <div className="preview-skeleton-mac-email-subject"></div>
                  
                  {/* Email Details */}
                  <div className="preview-skeleton-mac-email-details">
                    <div className="preview-skeleton-mac-sender-info">
                      <div className="preview-skeleton-mac-sender-avatar"></div>
                      <div className="preview-skeleton-mac-sender-text">
                        <div className="preview-skeleton-mac-sender-name"></div>
                        <div className="preview-skeleton-mac-sender-address"></div>
                      </div>
                    </div>
                    <div className="preview-skeleton-mac-email-time"></div>
                  </div>
                  
                  {/* Email Body */}
                  <div className="preview-skeleton-mac-email-body">
                    <div className="preview-skeleton-text-line preview-skeleton-line-long"></div>
                    <div className="preview-skeleton-text-line preview-skeleton-line-medium"></div>
                    <div className="preview-skeleton-text-line preview-skeleton-line-short"></div>
                    <div className="preview-skeleton-text-line preview-skeleton-line-long"></div>
                    <div className="preview-skeleton-text-line preview-skeleton-line-medium"></div>
                    <div className="preview-skeleton-image-placeholder"></div>
                    <div className="preview-skeleton-text-line preview-skeleton-line-long"></div>
                    <div className="preview-skeleton-text-line preview-skeleton-line-short"></div>
                    <div className="preview-skeleton-button-placeholder"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* iPhone Skeleton */}
        <div className="preview-skeleton-iphone-mockup">
          <div className="preview-skeleton-iphone-notch"></div>
          <div className="preview-skeleton-iphone-screen">
            <div className="preview-skeleton-iphone-email-client">
              {/* iPhone Email Header */}
              <div className="preview-skeleton-iphone-email-header">
                <div className="preview-skeleton-iphone-status-bar">
                  <div className="preview-skeleton-iphone-time"></div>
                </div>
                <div className="preview-skeleton-iphone-nav-bar">
                  <div className="preview-skeleton-iphone-back-btn"></div>
                  <div className="preview-skeleton-iphone-title"></div>
                  <div className="preview-skeleton-iphone-menu-btn"></div>
                </div>
              </div>
              
              {/* iPhone Email View */}
              <div className="preview-skeleton-iphone-email-view">
                {/* Subject */}
                <div className="preview-skeleton-iphone-email-subject"></div>
                
                {/* Email Details */}
                <div className="preview-skeleton-iphone-email-details">
                  <div className="preview-skeleton-iphone-sender-avatar"></div>
                  <div className="preview-skeleton-iphone-sender-info">
                    <div className="preview-skeleton-iphone-sender-name"></div>
                    <div className="preview-skeleton-iphone-email-time"></div>
                  </div>
                </div>
                
                {/* Email Body */}
                <div className="preview-skeleton-iphone-email-body">
                  <div className="preview-skeleton-text-line preview-skeleton-line-long"></div>
                  <div className="preview-skeleton-text-line preview-skeleton-line-medium"></div>
                  <div className="preview-skeleton-text-line preview-skeleton-line-short"></div>
                  <div className="preview-skeleton-text-line preview-skeleton-line-long"></div>
                  <div className="preview-skeleton-image-placeholder preview-skeleton-mobile-image"></div>
                  <div className="preview-skeleton-text-line preview-skeleton-line-medium"></div>
                  <div className="preview-skeleton-text-line preview-skeleton-line-short"></div>
                  <div className="preview-skeleton-button-placeholder preview-skeleton-mobile-button"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
        );

      case 'dashboard':
        return (
          <div className="dashboard-skeleton-page-container">
            {/* Navbar Skeleton */}
            <div className="dashboard-skeleton-navbar">
              <div className="dashboard-skeleton-navbar-brand"></div>
              <div className="dashboard-skeleton-navbar-menu">
                <div className="dashboard-skeleton-navbar-item"></div>
                <div className="dashboard-skeleton-navbar-item"></div>
                <div className="dashboard-skeleton-navbar-item"></div>
              </div>
            </div>

            <main className="dashboard-skeleton-main-content">
              <div className="dashboard-skeleton-inner-container">
                {/* Title Skeleton */}
                <div className="dashboard-skeleton-page-title"></div>

                {/* Tabs Skeleton */}
                <div className="dashboard-skeleton-tabs-container">
                  <div className={`dashboard-skeleton-tab-button ${activeTab === 'scheduled' ? 'dashboard-skeleton-tab-active' : ''}`}></div>
                  <div className={`dashboard-skeleton-tab-button ${activeTab === 'history' ? 'dashboard-skeleton-tab-active' : ''}`}></div>
                  <div className={`dashboard-skeleton-tab-button ${activeTab === 'calendar' ? 'dashboard-skeleton-tab-active' : ''}`}></div>
                </div>

                {/* Content based on active tab */}
                {activeTab === 'scheduled' && renderScheduledSkeleton()}
                {activeTab === 'history' && renderHistorySkeleton()}
                {activeTab === 'calendar' && renderCalendarSkeleton()}
              </div>
            </main>
          </div>
        );

      case 'ask-ai':
        return (
          <div className="chatbot-skeleton-container">
      {/* Header Skeleton */}
      <div className="chatbot-skeleton-header">
        <div className="chatbot-skeleton-header-left">
          <div className="chatbot-skeleton-back-button"></div>
          <div className="chatbot-skeleton-title"></div>
        </div>
        <div className="chatbot-skeleton-clear-button"></div>
      </div>

      {/* Messages Container Skeleton */}
      <div className="chatbot-skeleton-messages-container">
        {/* Welcome Message Skeleton */}
        <div className="chatbot-skeleton-message chatbot-skeleton-assistant-message">
          <div className="chatbot-skeleton-message-bubble">
            <div className="chatbot-skeleton-text-line chatbot-skeleton-title-line"></div>
            <div className="chatbot-skeleton-text-line chatbot-skeleton-medium-line"></div>
            <div className="chatbot-skeleton-text-line chatbot-skeleton-short-line"></div>
            <div className="chatbot-skeleton-text-line chatbot-skeleton-medium-line"></div>
            <div className="chatbot-skeleton-text-line chatbot-skeleton-short-line"></div>
            <div className="chatbot-skeleton-text-line chatbot-skeleton-long-line"></div>
          </div>
        </div>

        {/* User Message Skeleton */}
        <div className="chatbot-skeleton-message chatbot-skeleton-user-message">
          <div className="chatbot-skeleton-message-bubble chatbot-skeleton-user-bubble">
            <div className="chatbot-skeleton-text-line chatbot-skeleton-medium-line"></div>
          </div>
        </div>

        {/* Assistant Response Skeleton */}
        <div className="chatbot-skeleton-message chatbot-skeleton-assistant-message">
          <div className="chatbot-skeleton-message-bubble">
            <div className="chatbot-skeleton-text-line chatbot-skeleton-title-line"></div>
            <div className="chatbot-skeleton-text-line chatbot-skeleton-long-line"></div>
            <div className="chatbot-skeleton-text-line chatbot-skeleton-medium-line"></div>
            <div className="chatbot-skeleton-text-line chatbot-skeleton-short-line"></div>
            <div className="chatbot-skeleton-text-line chatbot-skeleton-long-line"></div>
            <div className="chatbot-skeleton-text-line chatbot-skeleton-medium-line"></div>
          </div>
        </div>

        {/* Another User Message */}
        <div className="chatbot-skeleton-message chatbot-skeleton-user-message">
          <div className="chatbot-skeleton-message-bubble chatbot-skeleton-user-bubble">
            <div className="chatbot-skeleton-text-line chatbot-skeleton-short-line"></div>
          </div>
        </div>
      </div>

      {/* Suggestions Skeleton */}
      <div className="chatbot-skeleton-suggestions-container">
        <div className="chatbot-skeleton-suggestion-button"></div>
        <div className="chatbot-skeleton-suggestion-button"></div>
        <div className="chatbot-skeleton-suggestion-button chatbot-skeleton-hide-mobile"></div>
        <div className="chatbot-skeleton-suggestion-button chatbot-skeleton-hide-mobile"></div>
        <div className="chatbot-skeleton-suggestion-button chatbot-skeleton-hide-small"></div>
        <div className="chatbot-skeleton-suggestion-button chatbot-skeleton-hide-small"></div>
      </div>

      {/* Input Container Skeleton */}
      <div className="chatbot-skeleton-input-container">
        <div className="chatbot-skeleton-chat-input"></div>
        <div className="chatbot-skeleton-send-button"></div>
      </div>
    </div>
        );

      default:
        return <div className="skeleton skeleton-default"></div>;
    }
  };

  return renderSkeleton();
};

export default LoadingSkeleton;
