import "./SingleTemplate.css";
import {
  FEATURE_UPDATE_TEMPLATE,
  FLASH_SALE_TEMPLATE,
  NEWSLETTER_TEMPLATE,
  WEBINAR_TEMPLATE,
  FEEDBACK_TEMPLATE,
  SOCIAL_MEDIA_TEMPLATE,
  // JOB_APPLICATION_TEMPLATE,
  // HEALTH_SUBSCRIPTION_TEMPLATE
} from "../../EmailTemplates";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import LoginPrompt from "../../Components/LoginPrompt/LoginPrompt";
import CreateTemplate from "../../Components/CreateTemplate/CreateTemplate";

const SingleTemplate = () => {
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const navigate = useNavigate();
  const templates = [
    {
      id: 1,
      name: "Introduce Your Latest Innovation!",
      content: FEATURE_UPDATE_TEMPLATE,
      description:
        "This email announces the launch of a new product, highlighting its features. It aims to build excitement and encourage early adoption through exclusive offers or demos.",
      category: "Product-Launch",
      slug: "product-launch",
    },
    {
      id: 2,
      name: "Hurry! Limited-Time Offer Inside",
      content: FLASH_SALE_TEMPLATE,
      description:
        "For promoting a limited-time flash sale, creating urgency with exclusive discounts and encouraging immediate purchases to drive quick conversions",
      category: "Sale-Promotion",
      slug: "flash-sale",
    },
    {
      id: 3,
      name: "Stay Updated with the Latest Trends ",
      content: NEWSLETTER_TEMPLATE,
      description:
        "An email that shares company updates, industry insights, and valuable content to keep subscribers engaged and informed by delivering consistent and relevant information to the audience.",
      category: "Newsletter",
      slug: "newsletter",
    },
    {
      id: 4,
      name: "Join Us for an Exclusive Live Webinar",
      content: WEBINAR_TEMPLATE,
      description:
        "This email invites recipients to attend a live webinar, detailing the event's topic, speakers, key takeaways, and registration link.",
      category: "Invitation",
      slug: "invitation",
    },
    {
      id: 5,
      name: "We Value Your Feedback - Quick Survey Request",
      content: FEEDBACK_TEMPLATE,
      description:
        "A strategic email designed to collect valuable customer insights through a concise survey, focusing on improving product features, user experience, and service quality.",
      category: "Feedback",
      slug: "feedback",
    },
    {
      id: 6,
      name: "Let's Connect on Social Media!",
      content: SOCIAL_MEDIA_TEMPLATE,
      description:
        "An engaging email that encourages users to follow and interact with your brand across various social media platforms, highlighting the benefits of joining your online community.",
      category: "Social-Media",
      slug: "social-media",
    },
    // {
    //   id: 7,
    //   name: "Your Application Status Update",
    //   content: JOB_APPLICATION_TEMPLATE,
    //   description:
    //     "A professional email updating candidates on their job application status, providing details about next steps and keeping them engaged in the hiring process.",
    //   category: "Recruitment",
    //   slug: "job-application",
    // },
    //  {
    //   id: 8,
    //   name: "Your Monthly Health Box Is Ready",
    //   content: HEALTH_SUBSCRIPTION_TEMPLATE,
    //   description:
    //     "An email notification for subscription box members with details about their upcoming wellness package, including personalized product information and wellness tips.",
    //   category: "Subscription",
    //   slug: "health-subscription",
    // },
  ];

  const handlePreview = (slug) => {
    return () => {
      navigate(`/templates/${slug}`);
    };
  };

  const handleEdit = (slug) => {
    return () => {
      const userInfo = JSON.parse(localStorage.getItem("user-info") || "{}");
      if (!userInfo.token) {
        // User is not logged in, show login prompt
        setShowLoginPrompt(true);
      } else {
        // User is logged in, proceed to the editor
        navigate(`/templates/${slug}/edit`);
      }
    };
  };

  return (
    <>
      {/* Premade Template Grid */}
      <div className="template-grid">
        {templates.map((template) => (
          <div key={template.id} className="template-card">
            <div className="template-preview">
              <div className="preview-content">
                <div
                  className="email-render"
                  dangerouslySetInnerHTML={{ __html: template.content }}
                />
              </div>
              <div className="preview-fade"></div>
              <div className="preview-overlay">
                <div className="template-category">{template.category}</div>
                <div className="overlay-actions">
                  <button
                    className="btn-preview"
                    onClick={handlePreview(template.slug)}
                  >
                    Preview
                  </button>
                  <button className="btn-use" onClick={handleEdit(template.slug)}>
                    Edit
                  </button>
                </div>
              </div>
            </div>
            <div className="template-info">
              <div className="info-header">
                <h3>{template.name}</h3>
              </div>
              <p className="template-description">{template.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Create Your Own Template Section */}
      <div className="create-template-section">
        <h2 className="create-template-heading">Create Your Own Template</h2>
        <div className="create-template-wrapper">
          <CreateTemplate />
        </div>
      </div>
      
      {showLoginPrompt && (
        <LoginPrompt onClose={() => setShowLoginPrompt(false)} />
      )}
    </>
  );
};

export default SingleTemplate;