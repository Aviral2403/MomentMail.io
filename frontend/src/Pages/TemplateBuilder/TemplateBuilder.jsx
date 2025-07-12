import { useRef, useState, useEffect } from "react";
import EmailEditor from "react-email-editor";
import { saveTemplate, getTemplate, updateTemplate } from "../../api";
import { useNavigate, useParams } from "react-router-dom";
import DOMPurify from "dompurify";
import "./TemplateBuilder.css";

const TemplateBuilder = () => {
  const emailEditorRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templateData, setTemplateData] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    description: "",
    tags: [],
    isPublic: false,
  });
  const [errors, setErrors] = useState({});
  const [newTag, setNewTag] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [editorLoaded, setEditorLoaded] = useState(false);
  const [currentDesign, setCurrentDesign] = useState(null);
  const [editorReady, setEditorReady] = useState(false);
  const [savedDesignData, setSavedDesignData] = useState(null);
  const [exportedHtml, setExportedHtml] = useState(null);
  const navigate = useNavigate();
  const { templateId } = useParams();

  // Handle body overflow when modal opens/closes
  useEffect(() => {
    if (showForm) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showForm]);

  // Enhanced debugging function
  const debugEditorState = (location) => {
    console.log(`[DEBUG ${location}] Editor State:`, {
      editorLoaded,
      editorReady,
      showForm,
      refExists: !!emailEditorRef.current,
      editorExists: !!emailEditorRef.current?.editor,
      currentDesign: !!currentDesign,
      savedDesignData: !!savedDesignData,
      exportedHtml: !!exportedHtml
    });
  };

  // Clear localStorage on component mount for fresh starts
  useEffect(() => {
    console.log("[INIT] Clearing localStorage and initializing component");
    localStorage.removeItem('currentTemplate');
    localStorage.removeItem('templateFormData');
    localStorage.removeItem('currentDesign');
    console.log("[INIT] Editor exists:", !!emailEditorRef.current?.editor);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (templateId) {
      console.log("[TEMPLATE LOAD] Loading template:", templateId);
      const loadTemplate = async () => {
        try {
          const response = await getTemplate(templateId);
          console.log("[TEMPLATE LOAD] Template loaded successfully:", response.template);
          setTemplateData(response.template);
          
          const formData = {
            name: response.template.name,
            subject: response.template.subject,
            description: response.template.description || "",
            tags: response.template.tags || [],
            isPublic: response.template.isPublic || false,
          };
          
          setFormData(formData);
          setLoading(false);
        } catch (error) {
          console.error("[TEMPLATE LOAD] Error loading template:", error);
          navigate("/my-templates", { replace: true });
        }
      };
      loadTemplate();
    } else {
      console.log("[TEMPLATE LOAD] No template ID, creating new template");
      setLoading(false);
    }
  }, [templateId, navigate]);

  const onLoad = () => {
    console.log("[EDITOR LOAD] Load callback triggered");
    setEditorLoaded(true);
    
    // Set a small timeout to ensure editor is fully initialized
    setTimeout(() => {
      console.log("[EDITOR LOAD] Marking editor as fully ready");
      setEditorReady(true);
      
      // Only load template data if we're editing an existing template
      if (templateId && templateData && emailEditorRef.current?.editor) {
        console.log("[EDITOR LOAD] Loading existing template design");
        try {
          emailEditorRef.current.editor.loadDesign(templateData.content);
          console.log("[EDITOR LOAD] Design loaded successfully");
        } catch (error) {
          console.error("[EDITOR LOAD] Error loading design:", error);
        }
      }
      
      debugEditorState("EDITOR_READY");
    }, 500);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const updatedFormData = {
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    };
    setFormData(updatedFormData);
    console.log("[FORM] Form data updated:", { field: name, value: type === "checkbox" ? checked : value });
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      const updatedFormData = {
        ...formData,
        tags: [...formData.tags, newTag.trim()],
      };
      setFormData(updatedFormData);
      setNewTag("");
      console.log("[FORM] Tag added:", newTag.trim());
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    const updatedFormData = {
      ...formData,
      tags: formData.tags.filter((tag) => tag !== tagToRemove),
    };
    setFormData(updatedFormData);
    console.log("[FORM] Tag removed:", tagToRemove);
  };

  const validateForm = () => {
    console.log("[VALIDATION] Validating form data:", formData);
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Template name is required";
    if (!formData.subject.trim()) newErrors.subject = "Email subject is required";
    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    console.log("[VALIDATION] Form validation result:", { isValid, errors: newErrors });
    return isValid;
  };

  const saveDesign = async () => {
    console.log("[SAVE] Starting save process");
    debugEditorState("SAVE_START");
    
    if (!validateForm()) {
      console.log("[SAVE] Validation failed, stopping save process");
      return;
    }

    if (!savedDesignData || !exportedHtml) {
      console.error("[SAVE] No saved design data or exported HTML available");
      console.error("[SAVE] savedDesignData:", !!savedDesignData);
      console.error("[SAVE] exportedHtml:", !!exportedHtml);
      alert("Design data is missing. Please go back to the editor and try again.");
      return;
    }

    setSaving(true);
    console.log("[SAVE] Starting save with pre-saved data");

    try {
      const sanitizedHtml = DOMPurify.sanitize(exportedHtml);
      const templatePayload = {
        ...formData,
        content: savedDesignData,
        html: sanitizedHtml,
      };

      console.log("[SAVE] Sending to API...", {
        name: formData.name,
        subject: formData.subject,
        contentSize: JSON.stringify(savedDesignData).length,
        htmlSize: sanitizedHtml.length,
        isUpdate: !!templateId
      });
      
      let response;
      if (templateId) {
        console.log("[SAVE] Updating existing template:", templateId);
        response = await updateTemplate(templateId, templatePayload);
      } else {
        console.log("[SAVE] Creating new template");
        response = await saveTemplate(templatePayload);
      }

      console.log("[SAVE] API response received:", response);
      
      localStorage.removeItem('currentTemplate');
      localStorage.removeItem('templateFormData');
      localStorage.removeItem('currentDesign');
      setSavedDesignData(null);
      setExportedHtml(null);

      console.log("[SAVE] Save completed successfully, navigating to templates list");
      navigate("/my-templates");
    } catch (error) {
      console.error("[SAVE] Error in save process:", error);
      if (error.response) {
        console.error("[SAVE] Error response:", error.response.data);
        console.error("[SAVE] Error status:", error.response.status);
      }
      alert("Failed to save template. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = (file, done) => {
    console.log("[IMAGE] Starting image upload:", file.name);
    const formData = new FormData();
    formData.append("file", file);
    formData.append(
      "upload_preset",
      import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
    );
    
    fetch(
      `https://api.cloudinary.com/v1_1/${
        import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
      }/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    )
      .then((response) => response.json())
      .then((data) => {
        console.log("[IMAGE] Upload response:", data);
        if (data.secure_url) {
          console.log("[IMAGE] Upload successful:", data.secure_url);
          done({ url: data.secure_url });
        } else {
          throw new Error(data.error?.message || "Upload failed");
        }
      })
      .catch((error) => {
        console.error("[IMAGE] Upload error:", error);
        done({ url: "" });
      });
  };

  const handleNextClick = () => {
    console.log("[NEXT] Button clicked, checking editor state");
    debugEditorState("NEXT_CLICK");
    
    if (!editorReady || !emailEditorRef.current || !emailEditorRef.current.editor) {
      console.error("[NEXT] Editor not ready");
      alert("Editor is not ready. Please wait for the editor to load completely.");
      return;
    }

    console.log("[NEXT] Editor ready, starting save process");
    setSaving(true);

    try {
      console.log("[NEXT] Saving current design...");
      emailEditorRef.current.editor.saveDesign((design) => {
        console.log("[NEXT] Design saved successfully, exporting HTML...");
        
        emailEditorRef.current.editor.exportHtml((data) => {
          console.log("[NEXT] HTML exported successfully");
          
          setSavedDesignData(design);
          setExportedHtml(data.html);
          setCurrentDesign(design);
          
          localStorage.setItem('currentDesign', JSON.stringify(design));
          localStorage.setItem('exportedHtml', data.html);
          
          console.log("[NEXT] Data stored, showing form");
          setShowForm(true);
          setSaving(false);
        });
      });
    } catch (error) {
      console.error("[NEXT] Error in next process:", error);
      alert("Failed to save current design. Please try again.");
      setSaving(false);
    }
  };

  const handleBackToEditor = () => {
    console.log("[BACK] Returning to editor");
    setShowForm(false);
    setErrors({});
    setSaving(false);
    
    setTimeout(() => {
      if (editorReady && emailEditorRef.current && emailEditorRef.current.editor) {
        const savedDesign = localStorage.getItem('currentDesign');
        if (savedDesign) {
          try {
            console.log("[BACK] Loading saved design from localStorage");
            emailEditorRef.current.editor.loadDesign(JSON.parse(savedDesign));
          } catch (error) {
            console.error("[BACK] Error loading saved design:", error);
          }
        } else if (currentDesign) {
          try {
            console.log("[BACK] Loading current design from state");
            emailEditorRef.current.editor.loadDesign(currentDesign);
          } catch (error) {
            console.error("[BACK] Error loading current design:", error);
          }
        }
      }
    }, 100);
  };

  // Cleanup localStorage on component unmount
  useEffect(() => {
    return () => {
      console.log("[CLEANUP] Component unmounting, clearing localStorage");
      localStorage.removeItem('currentTemplate');
      localStorage.removeItem('templateFormData');
      localStorage.removeItem('currentDesign');
      localStorage.removeItem('exportedHtml');
      document.body.style.overflow = 'unset';
    };
  }, []);

  if (loading) {
    return (
      <div className="template-builder-loading">
        <div className="template-builder-spinner"></div>
        <p>Loading template editor...</p>
      </div>
    );
  }

  return (
    <div className="template-builder">
      {/* Always render the main editor content */}
      <header className="template-header">
        <div className="header-content">
          <div className="header-text">
            <h1>{templateId ? "Edit Template" : "Create New Template"}</h1>
            <p>{templateId ? "Modify your existing template" : "Design your email template"}</p>
          </div>
          <button 
            onClick={handleNextClick} 
            className="next-btn"
            disabled={saving}
          >
            {saving ? (
              <>
                <span className="spinner"></span>
                Processing...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
                Next
              </>
            )}
          </button>
        </div>
      </header>

      <div className="editor-container">
        <EmailEditor
          ref={emailEditorRef}
          onLoad={onLoad}
          style={{ height: "100%", width: "100%" }}
          options={{
            appearance: {
              theme: "dark",
              panels: {
                tools: {
                  dock: isMobile ? "top" : "left",
                },
              },
            },
            tools: {
              image: {
                enabled: true,
                position: 1,
                properties: {
                  src: {
                    value: {
                      url: true,
                      upload: true,
                    },
                  },
                },
              },
            },
            features: {
              preview: true,
              stockImages: false,
              undoRedo: true,
              textEditor: {
                spellChecker: true,
                tables: true,
                cleanPaste: true,
                emojis: true,
              },
              customCSS: true,
              sendTestEmail: true,
            },
            image: {
              upload: handleImageUpload,
            },
          }}
        />
      </div>

      {/* Render form modal as overlay */}
      {showForm && (
        <div className="template-form-modal">
          <div className="template-form-container">
            <div className="template-form-header">
              <button onClick={handleBackToEditor} className="template-form-back-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M15 18l-6-6 6-6"/>
                </svg>
                Back to Editor
              </button>
              <h2>Template Details</h2>
            </div>
            
            <div className="template-form-content">
              <div className="template-form-group">
                <label className="template-form-label">
                  Template Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`template-form-input ${errors.name ? 'error' : ''}`}
                  placeholder="Enter template name"
                />
                {errors.name && <span className="template-form-error">{errors.name}</span>}
              </div>

              <div className="template-form-group">
                <label className="template-form-label">
                  Email Subject *
                </label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  className={`template-form-input ${errors.subject ? 'error' : ''}`}
                  placeholder="Enter email subject"
                />
                {errors.subject && <span className="template-form-error">{errors.subject}</span>}
              </div>

              <div className="template-form-group">
                <label className="template-form-label">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="template-form-textarea"
                  placeholder="Enter template description"
                  rows="3"
                />
              </div>

              <div className="template-form-group">
                <label className="template-form-label">
                  Tags
                </label>
                <div className="template-form-tags-input">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                    className="template-form-input"
                    placeholder="Add a tag"
                  />
                  <button type="button" onClick={handleAddTag} className="template-form-add-tag-btn">
                    Add
                  </button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="template-form-tags">
                    {formData.tags.map((tag, index) => (
                      <span key={index} className="template-form-tag">
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="template-form-remove-tag"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="template-form-group">
                <label className="template-form-checkbox">
                  <input
                    type="checkbox"
                    name="isPublic"
                    checked={formData.isPublic}
                    onChange={handleInputChange}
                  />
                  <span className="template-form-checkmark"></span>
                  Make template public
                </label>
              </div>
            </div>

            <div className="template-form-footer">
              <button type="button" onClick={handleBackToEditor} className="secondary-btn">
                Cancel
              </button>
              <button
                type="button"
                onClick={saveDesign}
                disabled={saving}
                className="primary-btn"
              >
                {saving ? (
                  <>
                    <span className="spinner"></span>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                      <polyline points="17,21 17,13 7,13 7,21"></polyline>
                      <polyline points="7,3 7,8 15,8"></polyline>
                    </svg>
                    Save Template
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateBuilder;












