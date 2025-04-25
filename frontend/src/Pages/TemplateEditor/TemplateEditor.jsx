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
  // JOB_APPLICATION_TEMPLATE,
  // HEALTH_SUBSCRIPTION_TEMPLATE
} from "../../EmailTemplates";
import Navbar from "../../Components/Navbar/Navbar";
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
  const [isDriveConnected, setisDriveConnected] = useState(false);
  const templateMap = {
    "product-launch": FEATURE_UPDATE_TEMPLATE,
    "flash-sale": FLASH_SALE_TEMPLATE,
    newsletter: NEWSLETTER_TEMPLATE,
    invitation: WEBINAR_TEMPLATE,
    feedback: FEEDBACK_TEMPLATE,
    "social-media": SOCIAL_MEDIA_TEMPLATE,
    // "job-application": JOB_APPLICATION_TEMPLATE,
    // "health-subscription": HEALTH_SUBSCRIPTION_TEMPLATE,
    "custom-template": "", // This will be loaded from localStorage
  };

  // Access environment variables
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  useEffect(() => {
    const userInfo = JSON.parse(localStorage.getItem("user-info") || "{}");
    if (userInfo.driveAccess && userInfo.driveToken) {
      const tokenData = JSON.parse(atob(userInfo.driveToken.split(".")[1]));
      const isTokenValid = tokenData.exp * 1000 > Date.now();
      setisDriveConnected(isTokenValid);
      if (!isTokenValid) {
        const updatedUserInfo = { ...userInfo };
        delete updatedUserInfo.driveAccess;
        delete updatedUserInfo.driveToken;
        localStorage.setItem("user-info", JSON.stringify(updatedUserInfo));
      }
    }
  }, []);

  useEffect(() => {
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
      // "job-application": "Job Application Status Template",
      // "health-subscription": "Health Subscription Box Template",
    };
    return names[slug] || "Email Template";
  };

  const loadTemplate = () => {
    const storageKey = getStorageKey(slug);
    const savedTemplate = localStorage.getItem(storageKey);

    if (savedTemplate) {
      setEditorContent(savedTemplate);

      // For custom template, also update email subject from the saved template name
      if (slug === "custom-template") {
        try {
          const customTemplateData = localStorage.getItem(
            "custom_email_template"
          );
          if (customTemplateData) {
            const parsedTemplate = JSON.parse(customTemplateData);
            setEmailSubject(parsedTemplate.name || "Custom Email Template");
          }
        } catch (e) {
          console.error("Error parsing custom template data:", e);
        }
      }
    } else {
      // For custom template with no saved content
      if (slug === "custom-template") {
        // Create a basic template
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
                  <!-- Content -->
                  <tr>
                    <td style="padding: 30px 20px 30px;">
                      <div style="color: #333333; font-size: 16px; line-height: 1.5;">
                        Write your email content here...
                      </div>
                    </td>
                  </tr>
                  <!-- Footer -->
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

      // For custom template, also update the template name and content in the custom template storage
      if (slug === "custom-template") {
        try {
          const customTemplateData = localStorage.getItem(
            "custom_email_template"
          );
          let templateData = customTemplateData
            ? JSON.parse(customTemplateData)
            : {};

          templateData = {
            ...templateData,
            name: emailSubject || "Custom Email Template",
          };

          localStorage.setItem(
            "custom_email_template",
            JSON.stringify(templateData)
          );
        } catch (e) {
          console.error("Error updating custom template data:", e);
        }
      }

      setSaveStatus("Saved successfully!");
      setTimeout(() => {
        setSaveStatus("");
      }, 3000);
    } catch (error) {
      setSaveStatus("Error saving template. Please try again.");
      console.error("Error saving template:", error);
    }
  };

  const handleResetTemplate = () => {
    toast(
      (t) => (
        <div className="confirm-toast">
          <p>
            Are you sure you want to reset to the original template? All your
            changes will be lost.
          </p>
          <div className="confirm-buttons">
            <button
              onClick={() => {
                const storageKey = getStorageKey(slug);
                localStorage.removeItem(storageKey);

                if (slug === "custom-template") {
                  // For custom template, load the empty template
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
                          <!-- Content -->
                          <tr>
                            <td style="padding: 30px 20px 30px;">
                              <div style="color: #333333; font-size: 16px; line-height: 1.5;">
                                Write your email content here...
                              </div>
                            </td>
                          </tr>
                          <!-- Footer -->
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

                  // Also reset the custom template data
                  localStorage.removeItem("custom_email_template");
                  setEmailSubject("Custom Email Template");
                } else {
                  setEditorContent(templateMap[slug]);
                }

                setSaveStatus("Template reset to original!");
                setTimeout(() => {
                  setSaveStatus("");
                }, 3000);
                toast.dismiss(t.id);
              }}
            >
              Yes, Reset
            </button>
            <button onClick={() => toast.dismiss(t.id)}>Cancel</button>
          </div>
        </div>
      ),
      { duration: Infinity }
    );
  };

  const handleSendClick = () => {
    if (!emailSubject || emailSubject.trim() === "") {
      toast.error("Please enter a subject for the email.");
      return;
    }
    try {
      const storageKey = getStorageKey(slug);
      localStorage.setItem(storageKey, editorContent);

      // For custom template, also update the template name
      if (slug === "custom-template") {
        try {
          const customTemplateData = localStorage.getItem(
            "custom_email_template"
          );
          let templateData = customTemplateData
            ? JSON.parse(customTemplateData)
            : {};

          templateData = {
            ...templateData,
            name: emailSubject,
          };

          localStorage.setItem(
            "custom_email_template",
            JSON.stringify(templateData)
          );
        } catch (e) {
          console.error("Error updating custom template name:", e);
        }
      }
    } catch (error) {
      console.error("Error saving template before navigating:", error);
    }

    // Log the email content to verify it contains Cloudinary URLs
    console.log("Email Content:", editorContent);

    const state = {
      templateContent: editorContent,
      emailSubject,
      recipients: [],
    };

    console.log("Navigating with state:", state);
    navigate(`/templates/${slug}/recipients`, { state });
  };

  return (
    <div className="template-editor-page">
      <Navbar />
      <Toaster position="top-center" />
      <main className="template-editor-main">
        <div className="template-editor-container">
          <div className="editor-header">
            <Link to='/templates'>
            <span className="back-button">
              <IoMdArrowRoundBack />{""}Back
              
            </span>
            </Link>
            <h1 className="template-name">{templateName}</h1>
            <div className="editor-actions">
              {saveStatus && (
                <span
                  className={`save-status ${
                    saveStatus.includes("Error") ? "error" : "success"
                  }`}
                >
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
                autoresize_bottom_margin: 50 /* Add bottom margin for better scrolling */,
                plugins: [
                  "advlist",
                  "autolink",
                  "lists",
                  "link",
                  "image",
                  "charmap",
                  "preview",
                  "anchor",
                  "searchreplace",
                  "visualblocks",
                  "code",
                  "fullscreen",
                  "insertdatetime",
                  "media",
                  "table",
                  "help",
                  "wordcount",
                ],
                toolbar_mode: "wrap", // This setting helps with wrapping on smaller screens
                toolbar_location: "top",
                toolbar_sticky: true,
                toolbar:
                  "undo redo | blocks | " +
                  "bold italic forecolor | alignleft aligncenter " +
                  "alignright alignjustify | bullist numlist outdent indent | " +
                  "removeformat | image link | help",
                content_style:
                  "body { font-family: Arial,sans-serif; font-size: 14px; padding: 20px; }",
                file_picker_types: "image",
                branding: false,
                automatic_uploads: true,
                convert_urls: false,
                relative_urls: false,
                remove_script_host: false,
                statusbar: true,
                // Apply custom toolbar CSS classes to help with wrapping
                setup: function (editor) {
                  editor.on("init", function () {
                    const isSmallScreen = window.matchMedia(
                      "(max-width: 1024px)"
                    ).matches;
                    if (isSmallScreen) {
                      const toolbar = document.querySelector(
                        ".tox-toolbar__primary"
                      );
                      if (toolbar) {
                        toolbar.style.flexWrap = "wrap";
                      }
                    }

                    // Add padding to bottom of editor content for better scrolling
                    const editorBody = editor.getBody();
                    if (editorBody) {
                      editorBody.style.paddingBottom = "100px";
                    }
                  });

                  // Handle window resize
                  window.addEventListener("resize", function () {
                    const toolbar = document.querySelector(
                      ".tox-toolbar__primary"
                    );
                    if (toolbar) {
                      const isSmallScreen = window.matchMedia(
                        "(max-width: 1024px)"
                      ).matches;
                      toolbar.style.flexWrap = isSmallScreen ? "wrap" : "";
                    }
                  });

                  // Ensure scrolling works to the bottom
                  editor.on("NodeChange", function () {
                    const editorBody = editor.getBody();
                    const editorContainer = editor.getContainer();

                    // Make sure there's enough space at the bottom
                    if (editorBody && editorContainer) {
                      const lastElement = editorBody.lastChild;
                      if (lastElement) {
                        const paddingBottom = Math.max(
                          100,
                          window.innerHeight / 4
                        );
                        editorBody.style.paddingBottom = paddingBottom + "px";
                      }
                    }
                  });
                },
                images_upload_handler: async function (blobInfo, progress) {
                  return new Promise((resolve, reject) => {
                    const formData = new FormData();
                    formData.append("file", blobInfo.blob());
                    formData.append("upload_preset", uploadPreset);

                    axios
                      .post(
                        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
                        formData
                      )
                      .then((response) => {
                        console.log("Cloudinary response:", response.data);
                        // Return just the URL string directly
                        resolve(response.data.secure_url);
                      })
                      .catch((error) => {
                        console.error("Upload error:", error);
                        reject("Image upload failed: " + error.message);
                      });
                  });
                },
                // Allow direct image URLs to work without modification
                urlconverter_callback: function (url, node, on_save, name) {
                  return url;
                },
              }}
              value={editorContent}
              onEditorChange={handleEditorChange}
            />
          </div>
        </div>
      </main>
      <div className="send-email-btn">
        <button onClick={handleSendClick}>Send Emails</button>
      </div>
    </div>
  );
};

export default TemplateEditor;
