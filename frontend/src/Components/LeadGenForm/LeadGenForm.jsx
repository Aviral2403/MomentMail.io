// LeadGenForm.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { leadAPI } from "../../api";
import "./LeadGenForm.css";

const LeadGenForm = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    keyword: "",
    location: "",
    emailDomain: "",
    maxResults: 20,
    platforms: ["google", "linkedin", "facebook"],
    enableGeminiValidation: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Icons + brand colors used in Platforms
  const platformOptions = [
    { value: "google", icon: "fab fa-google", color: "#DB4437" },
    { value: "linkedin", icon: "fab fa-linkedin-in", color: "#0A66C2" },
    { value: "facebook", icon: "fab fa-facebook-f", color: "#1877F2" },
    { value: "instagram", icon: "fab fa-instagram", color: "#E1306C" },
    { value: "twitter", icon: "fab fa-twitter", color: "#1DA1F2" },
    { value: "others", icon: "fas fa-globe", color: "#9CA3AF" },
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const togglePlatform = (platform) => {
    setFormData((prev) => {
      const exists = prev.platforms.includes(platform);
      let updatedPlatforms;

      if (platform === "others") {
        const otherPlatforms = [
          "yelp",
          "yellowpages",
          "sulekha",
          "angieslist",
          "thumbtack",
          "houzz",
          "reddit",
        ];
        if (exists) {
          updatedPlatforms = prev.platforms.filter(
            (p) => !otherPlatforms.includes(p) && p !== "others"
          );
        } else {
          updatedPlatforms = [
            ...prev.platforms.filter((p) => p !== "others"),
            "others",
            ...otherPlatforms,
          ];
        }
      } else {
        updatedPlatforms = exists
          ? prev.platforms.filter((p) => p !== platform)
          : [...prev.platforms, platform];
      }

      return { ...prev, platforms: updatedPlatforms };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const userInfo = JSON.parse(localStorage.getItem("user-info") || "{}");
      const userId = userInfo.id || userInfo.email || userInfo.sub;
      if (!userId) throw new Error("User not authenticated");

      const payload = { ...formData, userId };
      const response = await leadAPI.generateLeads(payload);

      if (response.success && response.searchId) {
        navigate(`/lead-generation/progress/${response.searchId}`, {
          state: { keyword: formData.keyword, location: formData.location },
        });
      } else {
        throw new Error(response.error || "Failed to start search");
      }
    } catch (err) {
      setError(err.message || "Error generating leads");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lg-container">
      {/* Decorative Blobs (kept outside the central safe band) */}
      <div className="blob blob--top-left">
        <img src="/lead-1.png" alt="Lead Generation" />
      </div>
      <div className="blob blob--bottom-right">
        <img src="/lead-2.png" alt="Analytics" />
      </div>

      {/* Scattered brand icons in gutters (never overlap the form) */}
      <div className="decor-icons" aria-hidden="true">
        <i className="fab fa-facebook-f decor-icon decor-icon--fb"></i>
        <i className="fab fa-instagram decor-icon decor-icon--ig"></i>
        <i className="fab fa-linkedin-in decor-icon decor-icon--li"></i>
        <i className="fab fa-twitter decor-icon decor-icon--tw"></i>
        <i className="fas fa-envelope decor-icon decor-icon--mail"></i>
        <i className="fab fa-youtube decor-icon decor-icon--yt"></i>
        <i className="fab fa-pinterest-p decor-icon decor-icon--pin"></i>
        <i className="fab fa-tiktok decor-icon decor-icon--tt"></i>
      </div>

      {/* Main form in the safe band */}
      <main className="lg-form">
        <h1> New Lead Search</h1>

        <form onSubmit={handleSubmit} className="lg-form__card">
          <div className="form-group">
            <label htmlFor="keyword">Keyword</label>
            <input
              type="text"
              id="keyword"
              name="keyword"
              value={formData.keyword}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="location">Location</label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="emailDomain">Email domain (optional)</label>
            <input
              type="text"
              id="emailDomain"
              name="emailDomain"
              value={formData.emailDomain}
              onChange={handleChange}
              placeholder="e.g. gmail.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="maxResults">Max Results</label>
            <input
              type="number"
              id="maxResults"
              name="maxResults"
              value={formData.maxResults}
              onChange={handleChange}
              min={1}
              max={200}
            />
          </div>

          <fieldset className="lg-form__platforms">
            <legend>Platforms</legend>
            <div className="platform-grid">
              {platformOptions.map((opt) => (
                <label key={opt.value} className="platform-checkbox">
                  <input
                    type="checkbox"
                    aria-label={opt.value}
                    checked={
                      formData.platforms.includes(opt.value) ||
                      (opt.value === "others" &&
                        ["yelp", "yellowpages", "sulekha", "angieslist", "thumbtack", "houzz", "reddit"].some(
                          (p) => formData.platforms.includes(p)
                        ))
                    }
                    onChange={() => togglePlatform(opt.value)}
                  />
                  <span className="checkmark" />
                  <i className={opt.icon} style={{ color: opt.color }} />
                </label>
              ))}
            </div>
          </fieldset>

          <label className="lg-form__checkbox" htmlFor="enableGeminiValidation">
            <input
              id="enableGeminiValidation"
              type="checkbox"
              name="enableGeminiValidation"
              checked={formData.enableGeminiValidation}
              onChange={handleChange}
            />
            <span>Enable AI Validation</span>
          </label>

          {error && <p className="lg-form__error">{error}</p>}

          <button type="submit" disabled={loading} className="lg-btn lg-btn--primary">
            {loading ? "Starting..." : "Start Search"}
          </button>
        </form>
      </main>
    </div>
  );
};

export default LeadGenForm;
