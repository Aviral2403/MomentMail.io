import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./CreateTemplate.css";

const CreateTemplate = () => {
  const [templateContent, setTemplateContent] = useState("");
  const [templateName, setTemplateName] = useState("");
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    // Get user email from local storage
    try {
      const userInfoString = localStorage.getItem("user-info");
      if (userInfoString) {
        const userInfo = JSON.parse(userInfoString);
        if (userInfo && userInfo.email) {
          setUserEmail(userInfo.email);
        }
      }
    } catch (error) {
      console.error("Error getting user info:", error);
    }

    // Try to load saved custom template if it exists
    const savedTemplate = localStorage.getItem("custom_email_template");
    if (savedTemplate) {
      try {
        const parsedTemplate = JSON.parse(savedTemplate);
        setTemplateContent(parsedTemplate.content || "");
        setTemplateName(parsedTemplate.name || "My Custom Template");
      } catch (e) {
        console.error("Error parsing saved template:", e);
      }
    }
  }, []);

  const handleContentChange = (e) => {
    setTemplateContent(e.target.value);
  };

  const handleNameChange = (e) => {
    setTemplateName(e.target.value);
  };

  const handleSave = () => {
    // Save to localStorage
    const templateData = {
      name: templateName,
      content: templateContent,
    };
    localStorage.setItem("custom_email_template", JSON.stringify(templateData));
    
    // Format the content as HTML for compatibility with the existing template system
    const formattedContent = formatContentAsHtml(templateContent, userEmail);
    
    // Store the formatted HTML in localStorage for the template system
    const storageKey = `email_template_${userEmail.replace(/[^a-zA-Z0-9]/g, "_")}_custom-template`;
    localStorage.setItem(storageKey, formattedContent);
  };

  const formatContentAsHtml = (content, senderEmail) => {
    // Convert plain text to simple HTML for compatibility with the template system
    // This preserves line breaks and basic formatting
    const htmlContent = content
    .replace(/\n/g, "<br>")
    .replace(/\s{2,}/g, match => "&nbsp;".repeat(match.length));

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${templateName}</title>
      <style>
        /* Reset all elements to prevent overflow */
        * {
          box-sizing: border-box !important;
          max-width: 100% !important;
          overflow-wrap: break-word !important;
          word-wrap: break-word !important;
        }
        
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          max-width: 100vw !important;
          overflow-x: hidden !important;
        }
        
        /* Base styles */
        body {
          background-color: #f5f8fa;
          font-family: Arial, sans-serif;
          font-size: 16px;
          line-height: 1.5;
          color: #333333;
        }
        
        /* Use div-based layout instead of tables for better responsiveness */
        .email-wrapper {
          width: 100% !important;
          max-width: 100% !important;
          display: block !important;
          padding: 10px !important;
          text-align: center !important;
        }
        
        .email-container {
          width: 100% !important;
          max-width: 600px !important;
          margin: 0 auto !important;
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          overflow: hidden !important;
          display: inline-block !important;
          text-align: left !important;
        }
        
        .content-area {
          padding: 20px 15px !important;
          width: 100% !important;
        }
        
        .email-content {
          font-size: 16px;
          line-height: 1.5;
          color: #333333;
          width: 100% !important;
        }
        
        .email-footer {
          padding: 15px !important;
          text-align: center !important;
          border-top: 1px solid #e1e4e8;
          color: #9ca3af;
          font-size: 12px;
          width: 100% !important;
          background-color: #f9f9fb;
          border-bottom-left-radius: 8px;
          border-bottom-right-radius: 8px;
        }
        
        .footer-text, .sender-email {
          display: inline-block;
        }
        
        .sender-email {
          color: #5d7b9e;
          font-weight: 600;
          margin-left: 4px;
        }
        
        /* Force all images to be responsive */
        img {
          height: auto !important;
          max-width: 100% !important;
          width: auto !important;
        }
        
        /* Make tables responsive */
        table {
          width: 100% !important;
          max-width: 100% !important;
        }
        
        /* Media queries for smaller screens */
        @media only screen and (max-width: 600px) {
          .email-container {
            width: 100% !important;
            max-width: 100% !important;
          }
          
          .content-area {
            padding: 15px 12px !important;
          }
          
          .email-content {
            font-size: 15px !important;
          }
        }
        
        @media only screen and (max-width: 480px) {
          .content-area {
            padding: 12px 10px !important;
          }
          
          .email-content {
            font-size: 14px !important;
          }
          
          .footer-text, .sender-email {
            display: block !important;
          }
          
          .sender-email {
            margin-left: 0 !important;
            margin-top: 4px !important;
          }
        }
        
        @media only screen and (max-width: 425px) {
          .email-container {
            border-radius: 6px !important;
          }
          
          .content-area {
            padding: 10px 8px !important;
          }
          
          .email-content {
            font-size: 13px !important;
          }
          
          .email-footer {
            padding: 12px 8px !important;
            font-size: 11px !important;
          }
        }
        
        @media only screen and (max-width: 320px) {
          .content-area {
            padding: 8px 6px !important;
          }
          
          .email-content {
            font-size: 12px !important;
            line-height: 1.4 !important;
          }
          
          .email-footer {
            padding: 10px 6px !important;
            font-size: 10px !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="email-container">
          <div class="content-area">
            <div class="email-content">
              ${htmlContent}
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

  const handlePreview = () => {
    handleSave();
    navigate(`/templates/custom-template`);
  };

  const handleEdit = () => {
    handleSave();
    navigate(`/templates/custom-template/edit`);
  };

  return (
    <div className="custom-template-card">
      <div className="custom-template-preview">
        <div className="custom-template-header">
          <div className="custom-email-from">
            <div className="custom-label">From:</div>
            <div className="custom-value">{userEmail}</div>
          </div>
          <div className="custom-email-subject">
            <div className="custom-label">Subject:</div>
            <input
              type="text"
              className="custom-subject-input"
              placeholder="Write your subject here..."
              value={templateName}
              onChange={handleNameChange}
            />
          </div>
        </div>
        <div className="custom-template-content">
          <textarea
            className="custom-template-editor"
            placeholder="Write your email content here..."
            value={templateContent}
            onChange={handleContentChange}
          ></textarea>
        </div>
      </div>
      <div className="custom-template-info">
        <p className="custom-template-description">
          <strong className="custom-strong">Didn't find what you were looking for?</strong>{" "}
          Design your own email template from scratch. Write your content and customize it to fit your needs. Save and reuse it for future emails.
        </p>
        <div className="custom-overlay-actions">
          <button className="custom-btn-preview" onClick={handlePreview}>
            Preview
          </button>
          <button className="custom-btn-use" onClick={handleEdit}>
            Edit
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateTemplate;