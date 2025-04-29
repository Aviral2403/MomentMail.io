import { useState, useEffect } from "react";
import { Editor } from "@tinymce/tinymce-react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { IoMdArrowRoundBack } from "react-icons/io";
import {
  FEATURE_UPDATE_TEMPLATE,
  FLASH_SALE_TEMPLATE,
  NEWSLETTER_TEMPLATE,
  WEBINAR_TEMPLATE,
  FEEDBACK_TEMPLATE,
  SOCIAL_MEDIA_TEMPLATE,
  WELCOME_TEMPLATE,
  ABANDONED_CART_TEMPLATE
} from "../../EmailTemplates";
// import Navbar from "./Navbar/Navbar";
import "./TemplateEditor.css";
import axios from "axios";
import { Toaster, toast } from "react-hot-toast";

const TemplateEditor = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [editorContent, setEditorContent] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  
  const templateMap = {
    "product-launch": FEATURE_UPDATE_TEMPLATE,
    "flash-sale": FLASH_SALE_TEMPLATE,
    newsletter: NEWSLETTER_TEMPLATE,
    invitation: WEBINAR_TEMPLATE,
    feedback: FEEDBACK_TEMPLATE,
    "social-media": SOCIAL_MEDIA_TEMPLATE,
    "welcome-user" : WELCOME_TEMPLATE,
    "abandoned-cart" : ABANDONED_CART_TEMPLATE,
    "custom-template": "",
  };

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  useEffect(() => {
    const userInfo = JSON.parse(localStorage.getItem("user-info") || "{}");
    if (userInfo.driveAccess && userInfo.driveToken) {
      try {
        const tokenData = JSON.parse(atob(userInfo.driveToken.split(".")[1]));
        const isTokenValid = tokenData.exp * 1000 > Date.now();
        setIsDriveConnected(isTokenValid);
        if (!isTokenValid) {
          const updatedUserInfo = { ...userInfo };
          delete updatedUserInfo.driveAccess;
          delete updatedUserInfo.driveToken;
          localStorage.setItem("user-info", JSON.stringify(updatedUserInfo));
        }
      } catch (error) {
        console.error("Error checking drive token:", error);
        setIsDriveConnected(false);
      }
    }
  }, []);

  useEffect(() => {
    try {
      const userInfoString = localStorage.getItem("user-info");
      if (userInfoString) {
        const userInfo = JSON.parse(userInfoString);
        if (userInfo?.email) {
          setUserEmail(userInfo.email);
        }
      }
    } catch (error) {
      console.error("Error getting user info:", error);
    }
  }, []);

  useEffect(() => {
    if (!slug || (slug !== "custom-template" && !templateMap[slug])) {
      navigate("/templates");
      return;
    }
    setTemplateName(getTemplateName(slug));
    if (userEmail) {
      loadTemplate();
    }
  }, [slug, userEmail]);

  const getStorageKey = (templateSlug) => {
    if (userEmail) {
      const sanitizedEmail = userEmail.replace(/[^a-zA-Z0-9]/g, "_");
      return `email_template_${sanitizedEmail}_${templateSlug}`;
    }
    return `email_template_${templateSlug}`;
  };

  const getTemplateName = (slug) => {
    if (slug === "custom-template") {
      try {
        const savedTemplate = localStorage.getItem("custom_email_template");
        if (savedTemplate) {
          const template = JSON.parse(savedTemplate);
          return template.name || "Custom Email Template";
        }
      } catch (e) {
        console.error("Error loading custom template name:", e);
      }
      return "Custom Email Template";
    }

    const names = {
      "product-launch": "Product Launch Template",
      "flash-sale": "Flash Sale Template",
      newsletter: "Newsletter Template",
      invitation: "Webinar Invitation Template",
      feedback: "Feedback & Survey Template",
      "social-media": "Social Media Connection Template",
      "welcome-user" : "Welcome To community Template",
      "abandoned-cart" : "Your Cart Items Feels Lonely , Order Them?"

    };
    return names[slug] || "Email Template";
  };

  const loadTemplate = () => {
    const storageKey = getStorageKey(slug);
    const savedTemplate = localStorage.getItem(storageKey);

    if (savedTemplate) {
      setEditorContent(savedTemplate);

      if (slug === "custom-template") {
        try {
          const customTemplateData = localStorage.getItem("custom_email_template");
          if (customTemplateData) {
            const parsedTemplate = JSON.parse(customTemplateData);
            setEmailSubject(parsedTemplate.name || "Custom Email Template");
          }
        } catch (e) {
          console.error("Error parsing custom template data:", e);
        }
      }
    } else {
      if (slug === "custom-template") {
        const emptyTemplate = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Custom Email Template</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f5f8fa; font-family: Arial, sans-serif;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="min-width: 100%;">
            <tr>
              <td align="center" style="padding: 20px 0;">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                  <tr>
                    <td style="padding: 30px 20px 30px;">
                      <div style="color: #333333; font-size: 16px; line-height: 1.5;">
                        Write your email content here...
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 20px; text-align: center; border-top: 1px solid #e1e4e8; color: #9ca3af; font-size: 12px;">
                      Sent from ${userEmail}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
        `;
        setEditorContent(emptyTemplate);
      } else {
        setEditorContent(templateMap[slug]);
      }
    }
  };

  const handleEditorChange = (content) => {
    setEditorContent(content);
    setSaveStatus("");
  };

  const handleSave = () => {
    try {
      const storageKey = getStorageKey(slug);
      localStorage.setItem(storageKey, editorContent);

      if (slug === "custom-template") {
        try {
          const customTemplateData = localStorage.getItem("custom_email_template");
          let templateData = customTemplateData ? JSON.parse(customTemplateData) : {};

          templateData = {
            ...templateData,
            name: emailSubject || "Custom Email Template",
          };

          localStorage.setItem("custom_email_template", JSON.stringify(templateData));
        } catch (e) {
          console.error("Error updating custom template data:", e);
        }
      }

      setSaveStatus("Saved successfully!");
      setTimeout(() => setSaveStatus(""), 3000);
    } catch (error) {
      setSaveStatus("Error saving template");
      console.error("Error saving template:", error);
    }
  };

  const handleResetTemplate = () => {
    toast((t) => (
      <div className="confirm-toast">
        <p>Are you sure you want to reset to the original template? All changes will be lost.</p>
        <div className="confirm-buttons">
          <button onClick={() => {
            const storageKey = getStorageKey(slug);
            localStorage.removeItem(storageKey);

            if (slug === "custom-template") {
              const emptyTemplate = `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Custom Email Template</title>
              </head>
              <body style="margin: 0; padding: 0; background-color: #f5f8fa; font-family: Arial, sans-serif;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="min-width: 100%;">
                  <tr>
                    <td align="center" style="padding: 20px 0;">
                      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                        <tr>
                          <td style="padding: 30px 20px 30px;">
                            <div style="color: #333333; font-size: 16px; line-height: 1.5;">
                              Write your email content here...
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 20px; text-align: center; border-top: 1px solid #e1e4e8; color: #9ca3af; font-size: 12px;">
                            Sent from ${userEmail}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </body>
              </html>
              `;
              setEditorContent(emptyTemplate);
              localStorage.removeItem("custom_email_template");
              setEmailSubject("Custom Email Template");
            } else {
              setEditorContent(templateMap[slug]);
            }

            setSaveStatus("Template reset!");
            setTimeout(() => setSaveStatus(""), 3000);
            toast.dismiss(t.id);
          }}>
            Yes, Reset
          </button>
          <button onClick={() => toast.dismiss(t.id)}>Cancel</button>
        </div>
      </div>
    ), { duration: Infinity });
  };

  const handleSendClick = () => {
    if (!emailSubject || emailSubject.trim() === "") {
      toast.error("Please enter a subject for the email.");
      return;
    }
    try {
      const storageKey = getStorageKey(slug);
      localStorage.setItem(storageKey, editorContent);

      if (slug === "custom-template") {
        try {
          const customTemplateData = localStorage.getItem("custom_email_template");
          let templateData = customTemplateData ? JSON.parse(customTemplateData) : {};

          templateData = {
            ...templateData,
            name: emailSubject,
          };

          localStorage.setItem("custom_email_template", JSON.stringify(templateData));
        } catch (e) {
          console.error("Error updating custom template name:", e);
        }
      }

      const state = {
        templateContent: editorContent,
        emailSubject,
        recipients: [],
        isScheduled: false
      };

      navigate(`/templates/${slug}/recipients`, { state });
    } catch (error) {
      console.error("Error saving template before navigating:", error);
    }
  };

  const handleScheduleClick = () => {
    if (!emailSubject || emailSubject.trim() === "") {
      toast.error("Please enter a subject for the email.");
      return;
    }
    try {
      const storageKey = getStorageKey(slug);
      localStorage.setItem(storageKey, editorContent);

      if (slug === "custom-template") {
        try {
          const customTemplateData = localStorage.getItem("custom_email_template");
          let templateData = customTemplateData ? JSON.parse(customTemplateData) : {};

          templateData = {
            ...templateData,
            name: emailSubject,
          };

          localStorage.setItem("custom_email_template", JSON.stringify(templateData));
        } catch (e) {
          console.error("Error updating custom template name:", e);
        }
      }

      const state = {
        templateContent: editorContent,
        emailSubject,
        isScheduled: true
      };

      navigate(`/templates/${slug}/schedule`, { state });
    } catch (error) {
      console.error("Error saving template before navigating:", error);
    }
  };

  return (
    <div className="template-editor-page">
      {/* <Navbar /> */}
      <Toaster position="top-center" />
      <main className="template-editor-main">
        <div className="template-editor-container">
          <div className="editor-header">
            <Link to="/templates">
              <span className="back-button">
                <IoMdArrowRoundBack /> Back
              </span>
            </Link>
            <h1 className="template-name">{templateName}</h1>
            <div className="editor-actions">
              {saveStatus && (
                <span className={`save-status ${saveStatus.includes("Error") ? "error" : "success"}`}>
                  {saveStatus}
                </span>
              )}
              <button className="btn-reset" onClick={handleResetTemplate}>
                Reset
              </button>
              <button className="btn-save" onClick={handleSave}>
                Save
              </button>
            </div>
          </div>
          <div className="email-header">
            <div className="email-from">
              <strong>From:</strong> {userEmail}
            </div>
            <input
              type="text"
              className="email-subject"
              placeholder="Write your subject here"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
            />
          </div>
          <div className="editor-wrapper">
            <Editor
              apiKey={import.meta.env.VITE_EDITOR_API_KEY}
              init={{
                height: "100%",
                min_height: 650,
                resize: true,
                menubar: true,
                plugins: [
                  "advlist", "autolink", "lists", "link", "image", "charmap", "preview",
                  "anchor", "searchreplace", "visualblocks", "code", "fullscreen",
                  "insertdatetime", "media", "table", "help", "wordcount"
                ],
                toolbar: "undo redo | blocks | bold italic forecolor | alignleft aligncenter " +
                  "alignright alignjustify | bullist numlist outdent indent | " +
                  "removeformat | image link | help",
                content_style: "body { font-family: Arial,sans-serif; font-size: 14px; padding: 20px; }",
                file_picker_types: "image",
                branding: false,
                automatic_uploads: true,
                images_upload_handler: async (blobInfo) => {
                  return new Promise((resolve, reject) => {
                    const formData = new FormData();
                    formData.append("file", blobInfo.blob());
                    formData.append("upload_preset", uploadPreset);

                    axios.post(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, formData)
                      .then((response) => resolve(response.data.secure_url))
                      .catch((error) => {
                        console.error("Upload error:", error);
                        reject("Image upload failed");
                      });
                  });
                },
              }}
              value={editorContent}
              onEditorChange={handleEditorChange}
            />
          </div>
        </div>
      </main>
      <div className="send-email-actions">
        <button className="btn-schedule" onClick={handleScheduleClick}>
          <svg className="schedule-icon" viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
          </svg>
          Schedule Emails
        </button>
        <button className="btn-send" onClick={handleSendClick}>
          <svg className="send-icon" viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
          Send Emails Now
        </button>
      </div>
    </div>
  );
};

export default TemplateEditor;