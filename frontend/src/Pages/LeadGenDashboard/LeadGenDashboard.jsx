/* eslint-disable react/prop-types */
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { leadAPI } from "../../api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
  Cell,
} from "recharts";
import "./LeadGenDashboard.css";
import AnimatedStatsOverview from "../../Components/AnimatedStatsOverview/AnimatedStatsOverview";

const CHART_COLORS = {
  primary: "#6aa6ff",
  secondary: "#8884d8",
  success: "#82ca9d",
  warning: "#ffc658",
  danger: "#ff6b6b",
  info: "#17a2b8",
  purple: "#a066ff",
  orange: "#ff8042",
  gray: "#cccccc",
};

const LeadGenDashboard = () => {
  const navigate = useNavigate();
  const [searches, setSearches] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const [hoveredBarIndex, setHoveredBarIndex] = useState(null);
  const [hoveredChartId, setHoveredChartId] = useState(null);

  // New state for data aggregation and time filtering
  const [timeFilter, setTimeFilter] = useState("all"); // 'all', '7d', '30d', '90d'
  const [aggregation, setAggregation] = useState("daily"); // 'hourly', 'daily', 'weekly', 'monthly'

  const handleBarMouseEnter = (data, index, chartId) => {
    setHoveredBarIndex(index);
    setHoveredChartId(chartId);
  };

  const handleBarMouseLeave = () => {
    setHoveredBarIndex(null);
    setHoveredChartId(null);
  };

  const getBarOpacity = (index, chartId) => {
    if (hoveredChartId !== chartId || hoveredBarIndex === null) {
      return 1; // Default opacity when no hover
    }
    return hoveredBarIndex === index ? 1 : 0.3; // Active bar: full opacity, others: faded
  };

  // Add this function to format numbers with commas
  const formatNumber = (num) => {
    if (num === undefined || num === null) return "0";
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  // Fixed validation functions
  const isValidEmail = (email) => {
    if (!email || typeof email !== "string") return false;
    const trimmed = email.trim().toLowerCase();

    // Check for invalid values
    const invalidValues = ["n/a", "na", "", "null", "undefined", "none"];
    if (invalidValues.includes(trimmed)) return false;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(trimmed) && trimmed.length >= 5;
  };

  const isValidPhone = (phone) => {
    if (!phone || typeof phone !== "string") return false;
    const trimmed = phone.trim().toLowerCase();

    // Check for invalid values
    const invalidValues = [
      "n/a",
      "na",
      "",
      "null",
      "undefined",
      "none",
      "0000000000",
      "000000000",
      "00000000",
    ];
    if (invalidValues.includes(trimmed)) return false;

    // Remove common phone formatting and check length
    const cleanPhone = trimmed.replace(/[\s\-\(\)\+]/g, "");
    return (
      cleanPhone.length >= 7 &&
      cleanPhone.length <= 15 &&
      /^\d+$/.test(cleanPhone)
    );
  };

  const isValidSocialLink = (social) => {
    if (!social || typeof social !== "string") return false;
    const trimmed = social.trim().toLowerCase();

    // Check for invalid values
    const invalidValues = ["n/a", "na", "", "null", "undefined", "none"];
    if (invalidValues.includes(trimmed)) return false;

    // Check if it's a valid URL and contains social media domains
    const socialDomains = [
      "facebook.com",
      "instagram.com",
      "linkedin.com",
      "twitter.com",
      "x.com",
      "youtube.com",
    ];
    return (
      trimmed.startsWith("http") &&
      socialDomains.some((domain) => trimmed.includes(domain))
    );
  };

  // Fixed contact validation function
  const validateContact = (contact) => {
    const validation = {
      hasValidEmail: false,
      hasValidPhone: false,
      hasValidSocial: false,
    };

    // Check primary email
    if (isValidEmail(contact.email)) {
      validation.hasValidEmail = true;
    }

    // Check emails array
    if (
      !validation.hasValidEmail &&
      contact.emails &&
      Array.isArray(contact.emails)
    ) {
      validation.hasValidEmail = contact.emails.some((email) =>
        isValidEmail(email)
      );
    }

    // Check primary phone
    if (isValidPhone(contact.phone)) {
      validation.hasValidPhone = true;
    }

    // Check phones array
    if (
      !validation.hasValidPhone &&
      contact.phones &&
      Array.isArray(contact.phones)
    ) {
      validation.hasValidPhone = contact.phones.some((phone) =>
        isValidPhone(phone)
      );
    }

    // Check social links
    if (contact.socialLinks && Array.isArray(contact.socialLinks)) {
      validation.hasValidSocial = contact.socialLinks.some((social) =>
        isValidSocialLink(social)
      );
    }

    return validation;
  };

  const fetchData = async (page = 1) => {
    try {
      setLoading(true);
      console.log("Fetching dashboard data...");

      // Get user info for userId
      const userInfo = JSON.parse(localStorage.getItem("user-info") || "{}");
      const userId = userInfo.email || userInfo.userId;

      const [listRes, statsRes] = await Promise.all([
        leadAPI.getLeads({ page, limit: 10, userId }),
        leadAPI.getStats({ days: 30, userId }),
      ]);

      console.log("List response:", listRes);
      console.log("Stats response:", statsRes);

      if (listRes.error) throw new Error(listRes.error);
      if (statsRes.error) throw new Error(statsRes.error);

      // Handle searches data - it should be in searches array
      const searchData = listRes.searches || listRes.data || [];
      if (!Array.isArray(searchData)) {
        console.warn("Expected searches array but got:", searchData);
        setSearches([]);
      } else {
        setSearches(searchData);
      }

      // Handle pagination
      setPagination(listRes.pagination || null);

      // Handle stats
      setStats(statsRes.stats || statsRes);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError(err.message || "Error loading dashboard");
      setSearches([]); // Ensure it's always an array
    } finally {
      setLoading(false);
    }
  };

  const deleteSearch = async (searchId) => {
    if (!window.confirm("Delete this search and all its data?")) return;

    try {
      await leadAPI.deleteLeadSearch(searchId);
      console.log("Search deleted:", searchId);

      // Remove from local state
      setSearches((prev) => prev.filter((s) => s.searchId !== searchId));

      // Refresh stats
      fetchData(currentPage);

      // Show success message
      alert("Search deleted successfully!");
    } catch (err) {
      console.error("Delete error:", err);
      alert("Error deleting search: " + err.message);
    }
  };

  const viewSearchResults = (search) => {
    navigate(`/lead-generation/results/${search.searchId}`, {
      state: {
        keyword: search.keyword,
        location: search.location,
        fromDashboard: true,
      },
    });
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      completed: "lg-badge lg-badge--success",
      running: "lg-badge lg-badge--warning",
      failed: "lg-badge lg-badge--danger",
      pending: "lg-badge lg-badge--info",
    };

    return (
      <span className={statusClasses[status] || "lg-badge lg-badge--default"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (milliseconds) => {
    if (!milliseconds) return "N/A";
    const seconds = Math.floor(milliseconds / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  // Enhanced data filtering and aggregation
  const filteredSearches = useMemo(() => {
    if (!Array.isArray(searches) || searches.length === 0) return [];

    let filtered = [...searches];

    // Apply time filter
    if (timeFilter !== "all") {
      const now = new Date();
      const filterDays = {
        "7d": 7,
        "30d": 30,
        "90d": 90,
      };

      const daysBack = filterDays[timeFilter];
      const cutoffDate = new Date(now - daysBack * 24 * 60 * 60 * 1000);

      filtered = filtered.filter(
        (search) => new Date(search.createdAt) >= cutoffDate
      );
    }

    return filtered.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  }, [searches, timeFilter]);

  // Enhanced chart data generation with aggregation
  const aggregatedChartData = useMemo(() => {
    if (!Array.isArray(filteredSearches) || filteredSearches.length === 0)
      return [];

    // Group data by aggregation period
    const groupedData = new Map();

    filteredSearches.forEach((search) => {
      if (!search.createdAt || search.stats?.leadsGenerated === undefined)
        return;

      const date = new Date(search.createdAt);
      let key;

      switch (aggregation) {
        case "hourly":
          key = `${date.toDateString()} ${date.getHours()}:00`;
          break;
        case "daily":
          key = date.toDateString();
          break;
        case "weekly":
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = `Week of ${weekStart.toDateString()}`;
          break;
        case "monthly":
          key = `${date.getFullYear()}-${date.getMonth() + 1}`;
          break;
        default:
          key = date.toDateString();
      }

      if (!groupedData.has(key)) {
        groupedData.set(key, {
          date: key,
          period: key,
          leadsFound: 0,
          qualityLeads: 0,
          searches: 0,
          searchIds: [],
        });
      }

      const group = groupedData.get(key);
      group.leadsFound += search.stats.leadsGenerated || 0;
      group.qualityLeads += search.stats.qualityLeadsGenerated || 0;
      group.searches += 1;
      group.searchIds.push(search.searchId);
    });

    const result = Array.from(groupedData.values()).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    console.log(
      `Generated ${result.length} data points for ${aggregation} aggregation`
    );
    return result;
  }, [filteredSearches, aggregation]);

  // Enhanced performance chart data with aggregation
  const aggregatedPerformanceData = useMemo(() => {
    if (!Array.isArray(filteredSearches) || filteredSearches.length === 0)
      return [];

    // Group performance data by aggregation period
    const groupedData = new Map();

    filteredSearches.forEach((search, index) => {
      if (!search.createdAt || !search.stats) return;

      const date = new Date(search.createdAt);
      let key;

      switch (aggregation) {
        case "hourly":
          key = `${date.toDateString()} ${date.getHours()}:00`;
          break;
        case "daily":
          key = date.toDateString();
          break;
        case "weekly":
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = `Week of ${weekStart.toDateString()}`;
          break;
        case "monthly":
          key = `${date.getFullYear()}-${date.getMonth() + 1}`;
          break;
        default:
          key = date.toDateString();
      }

      if (!groupedData.has(key)) {
        groupedData.set(key, {
          period: key,
          date: key,
          totalUrlsCrawled: 0,
          successfulCrawls: 0,
          searches: 0,
          searchDetails: [],
        });
      }

      const group = groupedData.get(key);
      group.totalUrlsCrawled += search.stats.totalUrlsCrawled || 0;
      group.successfulCrawls += search.stats.successfulCrawls || 0;
      group.searches += 1;
      group.searchDetails.push({
        keyword: search.keyword,
        location: search.location,
        searchId: search.searchId,
      });
    });

    return Array.from(groupedData.values()).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
  }, [filteredSearches, aggregation]);

  // Enhanced execution time data with aggregation
  const aggregatedExecutionTimeData = useMemo(() => {
    if (!Array.isArray(filteredSearches) || filteredSearches.length === 0)
      return [];

    const groupedData = new Map();

    filteredSearches.forEach((search) => {
      if (!search.createdAt || !search.performance) return;

      const date = new Date(search.createdAt);
      let key;

      switch (aggregation) {
        case "hourly":
          key = `${date.toDateString()} ${date.getHours()}:00`;
          break;
        case "daily":
          key = date.toDateString();
          break;
        case "weekly":
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = `Week of ${weekStart.toDateString()}`;
          break;
        case "monthly":
          key = `${date.getFullYear()}-${date.getMonth() + 1}`;
          break;
        default:
          key = date.toDateString();
      }

      if (!groupedData.has(key)) {
        groupedData.set(key, {
          period: key,
          date: key,
          searchTime: 0,
          crawlTime: 0,
          verificationTime: 0,
          searches: 0,
          searchDetails: [],
        });
      }

      const group = groupedData.get(key);
      const perf = search.performance || {};
      group.searchTime += perf.searchTime || 0;
      group.crawlTime += perf.crawlTime || 0;
      group.verificationTime += perf.verificationTime || 0;
      group.searches += 1;
      group.searchDetails.push({
        keyword: search.keyword,
        location: search.location,
      });
    });

    // Average the times by number of searches in the period
    return Array.from(groupedData.values())
      .map((group) => ({
        ...group,
        searchTime: Math.round(group.searchTime / group.searches),
        crawlTime: Math.round(group.crawlTime / group.searches),
        verificationTime: Math.round(group.verificationTime / group.searches),
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [filteredSearches, aggregation]);

  const aggregatedStats = useMemo(() => {
    if (!Array.isArray(searches) || searches.length === 0) {
      return (
        stats || {
          totalSearches: 0,
          totalLeads: 0,
          totalQualityLeads: 0,
          totalUrlsCrawled: 0,
          totalSuccessfulCrawls: 0,
          totalGeminiValidations: 0,
          successRate: 0,
        }
      );
    }

    // Calculate totals from individual searches
    const totals = searches.reduce(
      (acc, search) => {
        const searchStats = search.stats || {};

        return {
          totalSearches: acc.totalSearches + 1,
          totalLeads: acc.totalLeads + (searchStats.leadsGenerated || 0),
          totalQualityLeads:
            acc.totalQualityLeads + (searchStats.qualityLeadsGenerated || 0),
          totalUrlsCrawled:
            acc.totalUrlsCrawled + (searchStats.totalUrlsCrawled || 0),
          totalSuccessfulCrawls:
            acc.totalSuccessfulCrawls + (searchStats.successfulCrawls || 0),
          totalGeminiValidations:
            acc.totalGeminiValidations +
            (searchStats.totalGeminiValidations || 0),
          totalQueriesUsed:
            acc.totalQueriesUsed + (search.searchApiUsage?.queriesUsed || 0),
        };
      },
      {
        totalSearches: 0,
        totalLeads: 0,
        totalQualityLeads: 0,
        totalUrlsCrawled: 0,
        totalSuccessfulCrawls: 0,
        totalGeminiValidations: 0,
        totalQueriesUsed: 0,
      }
    );

    // Calculate success rate
    const successRate =
      totals.totalUrlsCrawled > 0
        ? Math.round(
            (totals.totalSuccessfulCrawls / totals.totalUrlsCrawled) * 100
          )
        : 0;

    return {
      ...totals,
      successRate,
    };
  }, [searches, stats]);

  // FIXED: Enhanced contact completeness data with proper validation
  const aggregatedContactCompletenessData = useMemo(() => {
    if (!Array.isArray(filteredSearches) || filteredSearches.length === 0)
      return [];

    const groupedData = new Map();

    filteredSearches.forEach((search) => {
      if (!search.createdAt) return;

      const date = new Date(search.createdAt);
      let key;

      switch (aggregation) {
        case "hourly":
          key = `${date.toDateString()} ${date.getHours()}:00`;
          break;
        case "daily":
          key = date.toDateString();
          break;
        case "weekly":
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = `Week of ${weekStart.toDateString()}`;
          break;
        case "monthly":
          key = `${date.getFullYear()}-${date.getMonth() + 1}`;
          break;
        default:
          key = date.toDateString();
      }

      if (!groupedData.has(key)) {
        groupedData.set(key, {
          period: key,
          date: key,
          emailsFound: 0,
          emailsMissing: 0,
          phonesFound: 0,
          phonesMissing: 0,
          socialsFound: 0,
          socialsMissing: 0,
          totalContacts: 0,
          searches: 0,
          searchDetails: [],
        });
      }

      const group = groupedData.get(key);
      const contacts = search.contacts || [];

      let emailsFound = 0,
        phonesFound = 0,
        socialsFound = 0;

      // Use the fixed validation function for each contact
      contacts.forEach((contact) => {
        const validation = validateContact(contact);

        if (validation.hasValidEmail) emailsFound++;
        if (validation.hasValidPhone) phonesFound++;
        if (validation.hasValidSocial) socialsFound++;
      });

      group.emailsFound += emailsFound;
      group.emailsMissing += contacts.length - emailsFound;
      group.phonesFound += phonesFound;
      group.phonesMissing += contacts.length - phonesFound;
      group.socialsFound += socialsFound;
      group.socialsMissing += contacts.length - socialsFound;
      group.totalContacts += contacts.length;
      group.searches += 1;

      group.searchDetails.push({
        keyword: search.keyword,
        location: search.location,
        searchId: search.searchId,
        contactsCount: contacts.length,
        emailsFound,
        phonesFound,
        socialsFound,
      });
    });

    const result = Array.from(groupedData.values()).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    // Debug logging
    console.log(
      "Contact completeness data:",
      result.map((r) => ({
        period: r.period,
        totalContacts: r.totalContacts,
        emailsFound: r.emailsFound,
        emailsMissing: r.emailsMissing,
        phonesFound: r.phonesFound,
        phonesMissing: r.phonesMissing,
        socialsFound: r.socialsFound,
        socialsMissing: r.socialsMissing,
        searchDetails: r.searchDetails,
      }))
    );

    return result;
  }, [filteredSearches, aggregation]);

  // API Usage data with aggregation
  const aggregatedApiUsageData = useMemo(() => {
    if (!Array.isArray(filteredSearches) || filteredSearches.length === 0)
      return [];

    const groupedData = new Map();

    filteredSearches.forEach((search) => {
      if (!search.createdAt) return;

      const date = new Date(search.createdAt);
      let key;

      switch (aggregation) {
        case "hourly":
          key = `${date.toDateString()} ${date.getHours()}:00`;
          break;
        case "daily":
          key = date.toDateString();
          break;
        case "weekly":
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = `Week of ${weekStart.toDateString()}`;
          break;
        case "monthly":
          key = `${date.getFullYear()}-${date.getMonth() + 1}`;
          break;
        default:
          key = date.toDateString();
      }

      if (!groupedData.has(key)) {
        groupedData.set(key, {
          period: key,
          date: key,
          queriesUsed: 0,
          searches: 0,
          searchDetails: [],
        });
      }

      const group = groupedData.get(key);
      group.queriesUsed += search.searchApiUsage?.queriesUsed || 0;
      group.searches += 1;
      group.searchDetails.push({
        keyword: search.keyword,
        location: search.location,
        searchId: search.searchId,
      });
    });

    return Array.from(groupedData.values()).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
  }, [filteredSearches, aggregation]);

  // Helper function to determine X-axis tick interval based on data length and screen size
  const getXAxisInterval = (dataLength) => {
    const isMobile = window.innerWidth < 768;
    const isTablet = window.innerWidth < 1024;

    if (isMobile) {
      // Show fewer ticks on mobile
      if (dataLength <= 3) return 0;
      if (dataLength <= 6) return 1;
      if (dataLength <= 12) return 2;
      return Math.ceil(dataLength / 4);
    } else if (isTablet) {
      // Show moderate ticks on tablet
      if (dataLength <= 6) return 0;
      if (dataLength <= 12) return 1;
      return Math.ceil(dataLength / 6);
    } else {
      // Show more ticks on desktop
      if (dataLength <= 10) return 0;
      return Math.ceil(dataLength / 8);
    }
  };

  // Helper function to get appropriate font size based on screen size
  const getResponsiveFontSize = () => {
    if (window.innerWidth < 480) return 9;
    if (window.innerWidth < 768) return 10;
    return 11;
  };

  // Custom tooltip component for aggregated data
  const CustomTooltip = ({ active, payload, label, aggregation }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;

      const tooltipStyle = {
        backgroundColor: "#1a1a1a",
        border: "1px solid #2555eb",
        borderRadius: "8px",
        padding: "12px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
        maxWidth: "280px",
        zIndex: 1000,
        position: "relative",
        fontSize: "12px",
      };

      return (
        <div style={tooltipStyle}>
          <p
            style={{
              color: "#ffffff",
              margin: "0 0 8px 0",
              fontWeight: "bold",
            }}
          >
            {aggregation === "daily"
              ? new Date(label).toLocaleDateString()
              : label}
          </p>
          {payload.map((entry, index) => (
            <p
              key={index}
              style={{
                color: entry.color || entry.fill || CHART_COLORS.primary,
                margin: "4px 0",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: "12px",
                  height: "12px",
                  backgroundColor:
                    entry.color || entry.fill || CHART_COLORS.primary,
                  marginRight: "8px",
                  borderRadius: "2px",
                }}
              ></span>
              {`${entry.name}: ${entry.value}`}
            </p>
          ))}
          {data.searches && (
            <p
              style={{
                color: "#b0b0b0",
                margin: "8px 0 0 0",
                fontSize: "11px",
                borderTop: "1px solid #333",
                paddingTop: "8px",
              }}
            >
              {`${data.searches} search${
                data.searches !== 1 ? "es" : ""
              } in this period`}
            </p>
          )}
          {data.searchDetails && data.searchDetails.length > 0 && (
            <div style={{ marginTop: "8px", fontSize: "10px", color: "#999" }}>
              <p style={{ margin: "4px 0" }}>Search details:</p>
              {data.searchDetails.slice(0, 2).map((detail, idx) => (
                <p key={idx} style={{ margin: "2px 0", fontSize: "10px" }}>
                  • {detail.keyword} in {detail.location}
                  {detail.emailsFound !== undefined && (
                    <span>
                      {" "}
                      (E:{detail.emailsFound} P:{detail.phonesFound} S:
                      {detail.socialsFound})
                    </span>
                  )}
                </p>
              ))}
              {data.searchDetails.length > 2 && (
                <p
                  style={{
                    margin: "4px 0",
                    fontSize: "10px",
                    fontWeight: "bold",
                    color: "#ffffff",
                  }}
                >
                  +{data.searchDetails.length - 2} more searches
                </p>
              )}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  useEffect(() => {
    fetchData(currentPage);
  }, [currentPage]);

  if (loading) {
    return (
      <main className="lg-dashboard">
        <div className="lg-dashboard__loading">
          <h1>Loading Dashboard...</h1>
          <p>Fetching your lead generation history...</p>
        </div>
      </main>
    );
  }

  if (error && (!searches || searches.length === 0)) {
    return (
      <main className="lg-dashboard">
        <div className="lg-dashboard__error">
          <h1>Dashboard Error</h1>
          <p className="lg-dashboard__error-message">{error}</p>
          <button
            className="lg-btn lg-btn--primary"
            onClick={() => fetchData(1)}
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="lg-dashboard">
      <div className="lg-dashboard__header">
        <h1>Lead Generation Dashboard</h1>
        <button
          className="lg-btn lg-btn--primary"
          onClick={() => navigate("/lead-generation/start")}
        >
          New Search
        </button>
      </div>


      {/* Stats Overview */}
      {(stats || aggregatedStats) && (
        <AnimatedStatsOverview
          stats={stats}
          aggregatedStats={aggregatedStats}
          formatNumber={formatNumber}
        />
      )}


      {/* Dashboard Filters */}
      <div className="lg-dashboard__filters">
        <div className="lg-dashboard__filter-group">
          <label>Time Range:</label>
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="lg-dashboard__filter-select"
          >
            <option value="all">All Time</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>

        <div className="lg-dashboard__filter-group">
          <label>Aggregation:</label>
          <select
            value={aggregation}
            onChange={(e) => setAggregation(e.target.value)}
            className="lg-dashboard__filter-select"
          >
            <option value="hourly">Hourly</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
      </div>

      {/* Enhanced Charts with Fully Responsive Design */}
      {filteredSearches.length > 0 && (
        <section className="lg-dashboard__charts">
          <div className="lg-dashboard__charts-grid">
            {/* Chart 1: Leads Over Time (Line Chart) */}
            <div className="lg-dashboard__chart-container">
              <h2>Leads Over Time ({aggregation})</h2>
              <div className="lg-dashboard__chart-wrapper">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={aggregatedChartData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis
                      dataKey="period"
                      stroke="#b0b0b0"
                      fontSize={getResponsiveFontSize()}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      interval={getXAxisInterval(aggregatedChartData.length)}
                    />
                    <YAxis
                      stroke="#b0b0b0"
                      fontSize={getResponsiveFontSize()}
                    />
                    <Tooltip
                      content={<CustomTooltip aggregation={aggregation} />}
                      cursor={{
                        fill: "rgba(26, 26, 26, 0.03)",
                        stroke: "transparent",
                        strokeWidth: 0,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="leadsFound"
                      stroke="#6aa6ff"
                      strokeWidth={3}
                      name="Total Leads"
                      dot={{ fill: "#6aa6ff", strokeWidth: 2, r: 3 }}
                      activeDot={{ r: 5, stroke: "#6aa6ff", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            {/* Chart 2: Fixed Leads by Period (Bar Chart) - replace your existing chart 2 */}
            <div className="lg-dashboard__chart-container">
              <h2>Leads by Period ({aggregation})</h2>
              <div className="lg-dashboard__chart-wrapper">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={aggregatedChartData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
                    barCategoryGap="10%"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis
                      dataKey="period"
                      stroke="#b0b0b0"
                      fontSize={getResponsiveFontSize()}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      interval={getXAxisInterval(aggregatedChartData.length)}
                    />
                    <YAxis
                      stroke="#b0b0b0"
                      fontSize={getResponsiveFontSize()}
                    />
                    <Tooltip
                      content={<CustomTooltip aggregation={aggregation} />}
                      cursor={{
                        fill: "rgba(26, 26, 26, 0.1)",
                        stroke: "transparent",
                        strokeWidth: 0,
                      }}
                    />
                    <Bar
                      dataKey="leadsFound"
                      name="Total Leads"
                      fill={CHART_COLORS.primary}
                      radius={[3, 3, 0, 0]}
                      maxBarSize={35}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            {/* Chart 3: Search Performance Metrics (Line Chart) */}
            <div className="lg-dashboard__chart-container">
              <h2>Search Performance Metrics ({aggregation})</h2>
              <div className="lg-dashboard__chart-wrapper">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={aggregatedPerformanceData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis
                      dataKey="period"
                      stroke="#b0b0b0"
                      fontSize={getResponsiveFontSize()}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      interval={getXAxisInterval(
                        aggregatedPerformanceData.length
                      )}
                    />
                    <YAxis
                      stroke="#b0b0b0"
                      fontSize={getResponsiveFontSize()}
                    />
                    <Tooltip
                      content={<CustomTooltip aggregation={aggregation} />}
                      cursor={{
                        fill: "rgba(26, 26, 26, 0.03)",
                        stroke: "transparent",
                        strokeWidth: 0,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="totalUrlsCrawled"
                      stroke="#8884d8"
                      strokeWidth={2}
                      name="Total URLs Crawled"
                      dot={{ fill: "#8884d8", strokeWidth: 2, r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="successfulCrawls"
                      stroke="#82ca9d"
                      strokeWidth={2}
                      name="Successful Crawls"
                      dot={{ fill: "#82ca9d", strokeWidth: 2, r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            {/* Chart 4: API Usage by Period (Bar Chart) */}
            <div className="lg-dashboard__chart-container">
              <h2>API Usage by Period ({aggregation})</h2>
              <div className="lg-dashboard__chart-wrapper">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={aggregatedApiUsageData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
                    barCategoryGap="25%"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis
                      dataKey="period"
                      stroke="#b0b0b0"
                      fontSize={getResponsiveFontSize()}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      interval={getXAxisInterval(aggregatedApiUsageData.length)}
                    />
                    <YAxis
                      stroke="#b0b0b0"
                      fontSize={getResponsiveFontSize()}
                    />
                    <Tooltip
                      content={<CustomTooltip aggregation={aggregation} />}
                      cursor={{
                        fill: "rgba(26, 26, 26, 0.1)",
                        stroke: "transparent",
                        strokeWidth: 0,
                      }}
                    />
                    <Bar
                      dataKey="queriesUsed"
                      name="Queries Used"
                      fill={CHART_COLORS.orange}
                      radius={[3, 3, 0, 0]}
                      maxBarSize={35}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            {/* Chart 5: Fixed Execution Time Breakdown - replace your existing execution time chart */}
            <div className="lg-dashboard__chart-container">
              <h2>Execution Time Breakdown ({aggregation})</h2>
              <div className="lg-dashboard__chart-wrapper">
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart
                    data={aggregatedExecutionTimeData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
                    barCategoryGap="25%"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis
                      dataKey="period"
                      stroke="#b0b0b0"
                      fontSize={getResponsiveFontSize()}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      interval={getXAxisInterval(
                        aggregatedExecutionTimeData.length
                      )}
                    />
                    <YAxis
                      stroke="#b0b0b0"
                      fontSize={getResponsiveFontSize()}
                    />
                    <Tooltip
                      content={<CustomTooltip aggregation={aggregation} />}
                      cursor={{
                        fill: "rgba(26, 26, 26, 0.1)",
                        stroke: "transparent",
                        strokeWidth: 0,
                      }}
                    />
                    <Legend
                      layout="horizontal"
                      verticalAlign="bottom"
                      align="center"
                      wrapperStyle={{
                        fontSize: getResponsiveFontSize(),
                        paddingTop: "2rem",
                        color: "#b0b0b0",
                      }}
                    />
                    <Bar
                      dataKey="searchTime"
                      stackId="a"
                      name="Search Time"
                      fill={CHART_COLORS.secondary}
                      maxBarSize={30}
                    />
                    <Bar
                      dataKey="crawlTime"
                      stackId="a"
                      name="Crawl Time"
                      fill={CHART_COLORS.success}
                      maxBarSize={30}
                    />
                    <Bar
                      dataKey="verificationTime"
                      stackId="a"
                      name="Verification Time"
                      fill={CHART_COLORS.warning}
                      maxBarSize={30}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 6: Fixed Contact Information Completeness with stacking and hover effects - replace your existing contact completeness chart */}
            <div className="lg-dashboard__chart-container">
              <h2>Contact Information Completeness ({aggregation})</h2>
              <div className="lg-dashboard__chart-wrapper">
                <ResponsiveContainer width="100%" height={375}>
                  <BarChart
                    data={aggregatedContactCompletenessData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
                    barCategoryGap="30%"
                    onMouseLeave={handleBarMouseLeave}
                    onMouseMove={(e) => {
                      if (e && e.activeTooltipIndex !== undefined) {
                        if (hoveredBarIndex !== e.activeTooltipIndex) {
                          setHoveredBarIndex(e.activeTooltipIndex);
                          setHoveredChartId("contact-completeness");
                        }
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis
                      dataKey="period"
                      stroke="#b0b0b0"
                      fontSize={getResponsiveFontSize()}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      interval={getXAxisInterval(
                        aggregatedContactCompletenessData.length
                      )}
                    />
                    <YAxis
                      stroke="#b0b0b0"
                      fontSize={getResponsiveFontSize()}
                    />
                    <Tooltip
                      content={<CustomTooltip aggregation={aggregation} />}
                      cursor={{
                        fill: "rgba(26, 26, 26, 0.1)",
                        stroke: "transparent",
                        strokeWidth: 0,
                      }}
                    />
                    <Legend
                      layout="horizontal"
                      verticalAlign="bottom"
                      align="center"
                      wrapperStyle={{
                        fontSize: getResponsiveFontSize(),
                        paddingTop: "2rem",
                        color: "#b0b0b0",
                      }}
                    />
                    <Bar
                      dataKey="emailsFound"
                      stackId="emails"
                      name="Emails Found"
                      fill={CHART_COLORS.primary}
                      maxBarSize={30}
                    />
                    <Bar
                      dataKey="emailsMissing"
                      stackId="emails"
                      name="Emails Missing"
                      fill={CHART_COLORS.danger}
                      maxBarSize={30}
                    />
                    <Bar
                      dataKey="socialsFound"
                      stackId="socials"
                      name="Socials Found"
                      fill={CHART_COLORS.purple}
                      maxBarSize={30}
                    />
                    <Bar
                      dataKey="socialsMissing"
                      stackId="socials"
                      name="Socials Missing"
                      fill={CHART_COLORS.gray}
                      maxBarSize={30}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Search History */}
      <section className="lg-dashboard__list">
        <div className="lg-dashboard__list-header">
          <h2>Recent Searches</h2>
          <p>
            {searches.length} search{searches.length !== 1 ? "es" : ""} found
          </p>
        </div>

        {searches.length === 0 ? (
          <div className="lg-dashboard__empty">
            <p>No searches found. Start your first lead generation search!</p>
            <button
              className="lg-btn lg-btn--primary"
              onClick={() => navigate("/lead-generation/start")}
            >
              Start First Search
            </button>
          </div>
        ) : (
          <>
            <div className="lg-dashboard__table-container">
              <table className="lg-dashboard__table">
                <thead>
                  <tr>
                    <th>Search Query</th>
                    <th>Status</th>
                    <th>Leads Found</th>
                    <th>Contact Info</th>
                    <th>Duration</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {searches.map((search) => {
                    // Calculate contact completeness for each search
                    const contacts = search.contacts || [];
                    let emailsFound = 0,
                      phonesFound = 0,
                      socialsFound = 0;

                    contacts.forEach((contact) => {
                      const validation = validateContact(contact);
                      if (validation.hasValidEmail) emailsFound++;
                      if (validation.hasValidPhone) phonesFound++;
                      if (validation.hasValidSocial) socialsFound++;
                    });

                    return (
                      <tr key={search.searchId || search._id}>
                        <td>
                          <div className="lg-dashboard__search-info">
                            <strong>{search.keyword}</strong>
                            <span className="lg-dashboard__location">
                              in {search.location}
                            </span>
                          </div>
                        </td>
                        <td>{getStatusBadge(search.status)}</td>
                        <td>
                          <span className="lg-dashboard__leads-count">
                            {formatNumber(
                              search.stats?.leadsGenerated ||
                                search.contacts?.length ||
                                0
                            )}
                          </span>
                        </td>
                        <td>
                          <div
                            className="lg-dashboard__contact-info"
                            style={{ fontSize: "12px" }}
                          >
                            <div style={{ color: "#6aa6ff" }}>
                              Emails: {emailsFound}/{contacts.length}
                            </div>
                            <div style={{ color: "#a066ff" }}>
                              Socials: {socialsFound}/{contacts.length}
                            </div>
                          </div>
                        </td>

                        <td>
                          {formatDuration(
                            search.performance?.totalExecutionTime
                          )}
                        </td>
                        <td>{formatDate(search.createdAt)}</td>
                        <td>
                          <div className="lg-dashboard__actions">
                            <button
                              className="lg-btn lg-btn--small lg-btn--primary"
                              onClick={() => viewSearchResults(search)}
                              disabled={search.status !== "completed"}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                width={24}
                                height={24}
                              >
                                <rect x="3" y="3" width="7" height="7"></rect>
                                <rect x="14" y="3" width="7" height="7"></rect>
                                <rect x="14" y="14" width="7" height="7"></rect>
                                <rect x="3" y="14" width="7" height="7"></rect>
                              </svg>
                            </button>
                            <button
                              className="lg-btn lg-btn--small lg-btn--danger"
                              onClick={() => deleteSearch(search.searchId)}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="lg-dashboard__pagination">
                <button
                  className="lg-btn lg-btn--ghost"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1}
                >
                  Previous
                </button>

                <span className="lg-dashboard__page-info">
                  Page {currentPage} of {pagination.totalPages}
                </span>

                <button
                  className="lg-btn lg-btn--ghost"
                  onClick={() =>
                    setCurrentPage((prev) =>
                      Math.min(pagination.totalPages, prev + 1)
                    )
                  }
                  disabled={currentPage === pagination.totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
};

export default LeadGenDashboard;
