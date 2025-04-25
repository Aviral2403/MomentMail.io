/* eslint-disable react/prop-types */
import { Link, useParams } from "react-router-dom";
import "./TemplatePreview.css";
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
import { IoMdArrowRoundBack } from "react-icons/io";

const TemplatePreview = () => {
  const { templateSlug } = useParams();
  const currentDate = new Date().toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });

  const getUserEmail = () => {
    const userInfo = localStorage.getItem("user-info");
    if (userInfo) {
      const { email, name } = JSON.parse(userInfo);
      return `${name} <${email}>`;
    }
    return "user@company.com";
  };

  const getUserAvatar = () => {
    const userInfo = localStorage.getItem("user-info");
    if (userInfo) {
      const { image } = JSON.parse(userInfo);
      return image;
    }
    return null;
  };

  const getTemplateContent = (slug) => {
    const userSender = getUserEmail();
    const userAvatar = getUserAvatar();

    // Handle custom template case
    if (slug === "custom-template") {
      try {
        const savedTemplate = localStorage.getItem("custom_email_template");
        if (savedTemplate) {
          const template = JSON.parse(savedTemplate);

          // Get the formatted HTML version from localStorage
          const userEmail =
            JSON.parse(localStorage.getItem("user-info") || "{}")?.email || "";
          const storageKey = `email_template_${userEmail.replace(
            /[^a-zA-Z0-9]/g,
            "_"
          )}_custom-template`;
          const formattedContent = localStorage.getItem(storageKey);

          return {
            content: formattedContent,
            subject: template.name || "Custom Email Template",
            sender: userSender,
            avatar: userAvatar,
          };
        }
      } catch (e) {
        console.error("Error loading custom template:", e);
      }

      // Fallback content if loading fails
      return {
        content: "<p>Your custom template content will appear here.</p>",
        subject: "Custom Email Template",
        sender: userSender,
        avatar: userAvatar,
      };
    }

    // Handle default templates
    switch (slug) {
      case "product-launch":
        return {
          content: FEATURE_UPDATE_TEMPLATE,
          subject: "Introducing Our Latest Innovation!",
          sender: userSender,
          avatar: userAvatar,
        };
      case "flash-sale":
        return {
          content: FLASH_SALE_TEMPLATE,
          subject: " Flash Sale - 24 Hours Only!",
          sender: userSender,
          avatar: userAvatar,
        };
      case "newsletter":
        return {
          content: NEWSLETTER_TEMPLATE,
          subject: "Your Monthly Industry Insights",
          sender: userSender,
          avatar: userAvatar,
        };
      case "invitation":
        return {
          content: WEBINAR_TEMPLATE,
          subject: "Join Us: Exclusive Webinar Event",
          sender: userSender,
          avatar: userAvatar,
        };
      case "feedback":
        return {
          content: FEEDBACK_TEMPLATE,
          subject: "We Value Your Feedback - Quick Survey Request",
          sender: userSender,
          avatar: userAvatar,
        };
      case "social-media":
        return {
          content: SOCIAL_MEDIA_TEMPLATE,
          subject: "Let's Connect on Social Media!",
          sender: userSender,
          avatar: userAvatar,
        };
      // case "job-application":
      //   return {
      //     content: JOB_APPLICATION_TEMPLATE,
      //     subject: "Your Application Status Update",
      //     sender: userSender,
      //     avatar: userAvatar,
      //   };
      // case "health-subscription":
      //   return {
      //     content: HEALTH_SUBSCRIPTION_TEMPLATE,
      //     subject: "Your Monthly Health Box Is Ready",
      //     sender: userSender,
      //     avatar: userAvatar,
      //   };
      default:
        return null;
    }
  };

  const templateData = getTemplateContent(templateSlug);
  if (!templateData) {
    return <div>Template not found</div>;
  }

  const MacbookEmailClient = ({ data }) => (
    <div className="macbook-mockup">
      <div className="macbook-screen">
        <div className="mac-email-client">
          <div className="mac-email-header">
            <div className="mac-header-left">
              <div className="mac-menu-icon"></div>
              <div className="mac-search-bar">
                <input type="text" placeholder="Search mail" disabled />
              </div>
            </div>
          </div>
          <div className="mac-email-content">
            <div className="mac-email-toolbar">
              <div className="mac-toolbar-left">
                <button className="mac-tool-btn">←</button>
                <button className="mac-tool-btn">↩</button>
                <button className="mac-tool-btn">Archive</button>
                <button className="mac-tool-btn">Spam</button>
                <button className="mac-tool-btn">Delete</button>
              </div>
            </div>
            <div className="mac-email-view">
              <div className="mac-email-subject">{data.subject}</div>
              <div className="mac-email-details">
                <div className="mac-sender-info">
                  <div
                    className="mac-sender-avatar"
                    style={{
                      backgroundImage: data.avatar
                        ? `url(${data.avatar})`
                        : "none",
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      backgroundColor: data.avatar ? "transparent" : "#ccc",
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                    }}
                  />
                  <div className="mac-sender-text">
                    <div className="mac-sender-name">{data.sender}</div>
                    <div className="mac-sender-address">to me</div>
                  </div>
                </div>
                <div className="mac-email-time">{currentDate}</div>
              </div>
              <div
                className="mac-email-body"
                dangerouslySetInnerHTML={{ __html: data.content }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const IphoneEmailClient = ({ data }) => {
    // Process the HTML content to make it responsive for mobile view
    const processHTMLForMobile = (html) => {
      // Create a temporary div to parse the HTML
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = html;

      // Apply responsive styles to tables
      const tables = tempDiv.querySelectorAll("table");
      tables.forEach((table) => {
        table.style.width = "100%";
        table.style.maxWidth = "100%";
        table.setAttribute("width", "100%");

        // Remove fixed widths from table cells
        const cells = table.querySelectorAll("td");
        cells.forEach((cell) => {
          if (
            cell.hasAttribute("width") &&
            cell.getAttribute("width").includes("px")
          ) {
            cell.removeAttribute("width");
          }
        });
      });

      // Make images responsive
      const images = tempDiv.querySelectorAll("img");
      images.forEach((img) => {
        img.style.maxWidth = "100%";
        img.style.height = "auto";
        if (img.hasAttribute("width")) {
          img.removeAttribute("width");
        }
      });

      return tempDiv.innerHTML;
    };

    const mobileContent = processHTMLForMobile(data.content);

    return (
      <div className="iphone-mockup">
        <div className="iphone-notch"></div>
        <div className="iphone-screen">
          <div className="iphone-email-client">
            <div className="iphone-email-header">
              <div className="iphone-status-bar">
                <div className="iphone-time">9:41</div>
              </div>
              <div className="iphone-nav-bar">
                <button className="iphone-back-btn">‹</button>
                <div className="iphone-title">Inbox</div>
                <button className="iphone-menu-btn">⋮</button>
              </div>
            </div>
            <div className="iphone-email-view">
              <div className="iphone-email-subject">{data.subject}</div>
              <div className="iphone-email-details">
                <div
                  className="iphone-sender-avatar"
                  style={{
                    backgroundImage: data.avatar
                      ? `url(${data.avatar})`
                      : "none",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundColor: data.avatar ? "transparent" : "#ccc",
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                  }}
                />
                <div className="iphone-sender-info">
                  <div className="iphone-sender-name">{data.sender}</div>
                  <div className="iphone-email-time">{currentDate}</div>
                </div>
              </div>
              <div
                className="iphone-email-body"
                dangerouslySetInnerHTML={{ __html: mobileContent }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="preview-container">
      <div className="back-button-container">
        <Link to="/templates" className="back-button">
          <IoMdArrowRoundBack className="back-icon" />
          <span>Back to Templates</span>
        </Link>
      </div>
      <div className="device-mockups">
        <MacbookEmailClient data={templateData} />
        <IphoneEmailClient data={templateData} />
      </div>
    </div>
  );
};

export default TemplatePreview;