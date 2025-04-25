import { ArrowRight } from "lucide-react";
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
              Connect <ArrowRight />
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
              Select <ArrowRight />
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
              Send <ArrowRight />
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
