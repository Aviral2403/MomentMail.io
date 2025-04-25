import "./Workflow.css";

const Workflow = () => {
  return (
    <>
    
    <div className="workflow-container">
      <div className="workflow-cards">
        <div className="workflow-card connect-card">
          <div className="workflow-number">1</div>
          <div className="card-content">
            <h3>
              Connect  <svg className="connect-icon" viewBox="0 0 28 28" width="28" height="28">
                      <path fill="currentColor" d="M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42C17.99 7.86 19 9.81 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.19 1.01-4.14 2.58-5.42L6.17 5.17C4.23 6.82 3 9.26 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.74-1.23-5.18-3.17-6.83z" />
                    </svg>
            </h3>
            <p>
              Seamlessly connect your drive import and select the sheet and its
              column with emails.
            </p>
          </div>
        </div>
        <div className="workflow-card select-card">
          <div className="workflow-number">2</div>
          <div className="card-content">
            <h3>
              Select <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
  <path d="M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2"></path>
  <polyline points="22 4 10 16 6 12"></polyline>
</svg>
            </h3>
            <p>
              Choose from our beautiful templates or create your own custom
              design to match your brand.
            </p>
          </div>
        </div>
        <div className="workflow-card send-card">
          <div className="workflow-number">3</div>
          <div className="card-content">
            <h3>
              Send <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
            </h3>
            <p>
              Review your campaign and send your emails to multiple recipients
              with one click.
            </p>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default Workflow;
