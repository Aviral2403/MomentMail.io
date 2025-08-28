const LeadSearch = require("../models/Lead");
const searchApiManager = require("../utils/searchApiManager");
const crawlerManager = require("../utils/CrawlerManager");
const SearchUtils = require("../utils/searchUtils");
const proxyManager = require("../utils/proxyManager");
const { v4: uuidv4 } = require('uuid');

class LeadController {
  async generateLeads(req, res) {
    try {
      const {
        keyword,
        platforms,
        location,
        emailDomain,
        maxResults = 20,
      } = req.body;

      console.log("\n=== STARTING ENHANCED LEAD GENERATION ===");
      console.log("Parameters:", {
        keyword,
        platforms,
        location,
        emailDomain,
        maxResults,
      });

      // Validate input
      if (!keyword || !platforms || !location) {
        return res.status(400).json({
          success: false,
          error: "Missing required parameters: keyword, platforms, location",
        });
      }

      if (!Array.isArray(platforms) || platforms.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Platforms must be a non-empty array",
        });
      }

      // Create search ID for grouping
      const searchId = uuidv4();
      
      // Create initial lead search document
      const leadSearch = new LeadSearch({
        searchId,
        keyword,
        location,
        platforms,
        emailDomain: emailDomain || '',
        maxResults,
        contacts: [],
        stats: {
          totalSearches: 0,
          totalUrlsFound: 0,
          totalUrlsCrawled: 0,
          successfulCrawls: 0,
          leadsGenerated: 0
        },
        searchApiUsage: searchApiManager.getStats()
      });

      await leadSearch.save();
      console.log(`Created lead search document with ID: ${searchId}`);

      // Test and prepare services
      console.log("\n=== TESTING SERVICES ===");
      
      // Test proxy connection
      const proxyWorking = await proxyManager.testProxy();
      console.log(`Proxy status: ${proxyWorking ? 'Working' : 'Failed'}`);

      // Test search API
      const searchApiWorking = await searchApiManager.testConnection();
      console.log(`Search API status: ${searchApiWorking ? 'Working' : 'Failed'}`);
      
      if (!searchApiWorking) {
        return res.status(500).json({
          success: false,
          error: "Google Search API connection failed. Please check your API credentials.",
        });
      }

      // Initialize results tracking
      const allResults = [];
      const searchPromises = [];
      let totalSearches = 0;

      console.log("\n=== EXECUTING SEARCHES ===");

      // Process each platform
      for (const platform of platforms) {
        console.log(`\n--- Processing platform: ${platform} ---`);

        // Generate multiple search queries for this platform
        const queries = SearchUtils.generateMultipleQueries(
          keyword,
          platform,
          location,
          emailDomain
        );
        
        console.log(`Generated ${queries.length} queries for ${platform}:`, queries);

        // Execute searches
        for (const query of queries) {
          const remainingQueries = searchApiManager.getStats().remainingQueries;
          
          if (remainingQueries <= 0) {
            console.log("Daily search quota reached, stopping searches");
            break;
          }

          console.log(`Executing search: "${query}"`);
          totalSearches++;

          searchPromises.push(
            searchApiManager
              .search(query, { num: 10 })
              .then((searchResults) => {
                if (searchResults.success && searchResults.data.items) {
                  const resultCount = searchResults.data.items.length;
                  console.log(`✓ Search successful: ${resultCount} results for "${query}"`);

                  // Extract and validate URLs
                  const urls = searchResults.data.items
                    .map((item) => item.link)
                    .filter((url) => {
                      const isValid = SearchUtils.isValidUrl(url);
                      const isBusiness = SearchUtils.isBusinessWebsite(url);
                      return isValid && isBusiness;
                    });

                  console.log(`Extracted ${urls.length} valid business URLs`);

                  return {
                    platform,
                    query,
                    urls,
                    searchInfo: searchResults.searchInformation,
                  };
                } else {
                  console.log(`✗ No results found for query: "${query}"`);
                  return { platform, query, urls: [], searchInfo: null };
                }
              })
              .catch((error) => {
                console.error(`✗ Search failed for "${query}":`, error.message);
                return { platform, query, urls: [], error: error.message };
              })
          );

          // Add delay between search requests
          await SearchUtils.delay(1500);
        }

        // Break if quota exhausted
        if (searchApiManager.getStats().remainingQueries <= 0) {
          break;
        }
      }

      // Wait for all searches to complete
      console.log(`\nWaiting for ${searchPromises.length} searches to complete...`);
      const searchResults = await Promise.all(searchPromises);
      
      console.log("\n=== SEARCH RESULTS SUMMARY ===");
      console.log(`Completed ${searchResults.length} search queries`);

      // Collect and deduplicate URLs
      const allUrls = [];
      const urlSources = {};
      let totalUrlsFound = 0;

      searchResults.forEach((result) => {
        if (result.urls && result.urls.length > 0) {
          totalUrlsFound += result.urls.length;
          
          result.urls.forEach((url) => {
            const normalizedUrl = SearchUtils.normalizeUrl(url);
            if (!allUrls.includes(normalizedUrl)) {
              allUrls.push(normalizedUrl);
              urlSources[normalizedUrl] = result.platform;
            }
          });
        }
      });

      const uniqueUrlCount = allUrls.length;
      const urlsToCrawl = Math.min(maxResults, uniqueUrlCount);
      
      console.log(`Total URLs found: ${totalUrlsFound}`);
      console.log(`Unique URLs: ${uniqueUrlCount}`);
      console.log(`URLs to crawl: ${urlsToCrawl}`);

      // Update search stats
      leadSearch.stats.totalSearches = totalSearches;
      leadSearch.stats.totalUrlsFound = totalUrlsFound;
      leadSearch.stats.totalUrlsCrawled = urlsToCrawl;
      await leadSearch.save();

      if (urlsToCrawl === 0) {
        return res.json({
          success: true,
          message: "No URLs found to crawl. Try different search parameters.",
          searchId,
          stats: {
            totalSearches: totalSearches,
            totalUrlsFound: totalUrlsFound,
            totalUrlsCrawled: 0,
            successfulCrawls: 0,
            leadsGenerated: 0,
            searchApiUsage: searchApiManager.getStats(),
          },
          leads: [],
        });
      }

      console.log("\n=== STARTING URL CRAWLING ===");
      
      // Crawl URLs and extract contact information
      const crawlResults = await crawlerManager.crawlMultipleUrls(
        allUrls.slice(0, urlsToCrawl),
        { 
          useProxy: proxyWorking, 
          solveCaptcha: true,
          timeout: 30000
        }
      );

      console.log("\n=== PROCESSING CRAWL RESULTS ===");
      
      const successfulCrawls = crawlResults.filter(r => r.success).length;
      console.log(`Successful crawls: ${successfulCrawls}/${crawlResults.length}`);

      // Process successful crawl results and save to database
      const leads = [];
      
      for (const result of crawlResults) {
        if (result.success && result.contactInfo) {
          const contactInfo = result.contactInfo;
          
          // Validate that we have meaningful contact information
          const hasValidEmail = contactInfo.emails && 
            contactInfo.emails.length > 0 && 
            contactInfo.emails[0] !== 'N/A';
          
          const hasValidPhone = contactInfo.phones && 
            contactInfo.phones.length > 0 && 
            contactInfo.phones[0] !== 'N/A';
          
          const hasValidBusiness = contactInfo.businessName && 
            contactInfo.businessName !== 'Unknown Business';

          // Only include leads with at least some valid contact info
          if (hasValidEmail || hasValidPhone || hasValidBusiness) {
            const contactData = {
              businessName: contactInfo.businessName || SearchUtils.extractBusinessNameFromUrl(result.url),
              email: hasValidEmail ? contactInfo.emails[0] : 'N/A',
              emails: contactInfo.emails || ['N/A'],
              phone: hasValidPhone ? contactInfo.phones[0] : 'N/A',
              phones: contactInfo.phones || ['N/A'],
              website: contactInfo.website || result.url,
              socialLinks: contactInfo.socialLinks || [],
              sourceUrl: result.url,
              platform: urlSources[result.url] || "unknown",
              status: "new",
              lastContacted: null,
              notes: ""
            };

            leads.push(contactData);

            // Add contact to the search document
            leadSearch.contacts.push(contactData);
            leadSearch.stats.leadsGenerated += 1;
            leadSearch.stats.successfulCrawls += 1;
            
            console.log(`✓ Extracted lead: ${contactData.businessName}`);
          } else {
            console.log(`Skipping lead with insufficient contact info: ${result.url}`);
          }
        } else if (result.success) {
          console.log(`No contact info extracted from: ${result.url}`);
        } else {
          console.log(`Failed to crawl: ${result.url} - ${result.error}`);
        }
      }

      // Save all contacts to the database
      await leadSearch.save();

      console.log("\n=== FINAL RESULTS ===");
      console.log(`Total leads generated: ${leads.length}`);
      console.log(`Leads saved to database search: ${leadSearch._id}`);

      // Send comprehensive response
      const response = {
        success: true,
        message: `Successfully generated ${leads.length} leads`,
        searchId: leadSearch.searchId,
        stats: {
          totalSearches: totalSearches,
          totalUrlsFound: totalUrlsFound,
          totalUrlsCrawled: urlsToCrawl,
          successfulCrawls: successfulCrawls,
          leadsGenerated: leads.length,
          searchApiUsage: searchApiManager.getStats(),
          proxyStatus: proxyManager.getStats(),
          crawlerStatus: crawlerManager.getStats(),
        },
        leads: leads,
      };

      res.json(response);

    } catch (error) {
      console.error("\n=== LEAD GENERATION ERROR ===");
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      res.status(500).json({
        success: false,
        error: error.message,
        message: "Lead generation failed due to an internal error",
        stats: {
          searchApiUsage: searchApiManager.getStats(),
          proxyStatus: proxyManager.getStats(),
          crawlerStatus: crawlerManager.getStats(),
        }
      });
    }
  }

  async getLeads(req, res) {
    try {
      const { page = 1, limit = 20, status, platform, keyword, searchId } = req.query;
      const filter = {};

      if (searchId) {
        // Get specific search with its contacts
        const leadSearch = await LeadSearch.findOne({ searchId });
        
        if (!leadSearch) {
          return res.status(404).json({
            success: false,
            error: "Search not found"
          });
        }

        // Filter contacts if status or platform provided
        let filteredContacts = leadSearch.contacts;
        if (status && status !== "all") {
          filteredContacts = filteredContacts.filter(contact => contact.status === status);
        }
        if (platform) {
          filteredContacts = filteredContacts.filter(contact => contact.platform === platform);
        }

        return res.json({
          success: true,
          search: {
            id: leadSearch.searchId,
            keyword: leadSearch.keyword,
            location: leadSearch.location,
            platforms: leadSearch.platforms,
            createdAt: leadSearch.createdAt,
            stats: leadSearch.stats
          },
          leads: filteredContacts,
          total: filteredContacts.length,
          totalPages: 1,
          currentPage: 1
        });
      }

      // Get all searches with pagination
      if (keyword) filter.keyword = new RegExp(keyword, "i");
      if (platform) filter.platforms = platform;

      const searches = await LeadSearch.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .select('-contacts'); // Don't include contacts in list view

      const total = await LeadSearch.countDocuments(filter);

      res.json({
        success: true,
        searches,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        total,
      });
    } catch (error) {
      console.error("Error fetching leads:", error);
      res.status(500).json({ 
        success: false,
        error: "Failed to fetch leads" 
      });
    }
  }

  async updateLead(req, res) {
    try {
      const { searchId, contactIndex } = req.params;
      const updateData = req.body;

      const leadSearch = await LeadSearch.findOne({ searchId });
      
      if (!leadSearch) {
        return res.status(404).json({ 
          success: false,
          error: "Lead search not found" 
        });
      }

      if (contactIndex >= leadSearch.contacts.length) {
        return res.status(404).json({ 
          success: false,
          error: "Contact not found" 
        });
      }

      // Update the specific contact
      leadSearch.contacts[contactIndex] = {
        ...leadSearch.contacts[contactIndex],
        ...updateData,
        lastContacted: updateData.status === 'contacted' ? new Date() : leadSearch.contacts[contactIndex].lastContacted
      };

      leadSearch.updatedAt = new Date();
      await leadSearch.save();

      res.json({
        success: true,
        lead: leadSearch.contacts[contactIndex],
        searchId: leadSearch.searchId
      });
    } catch (error) {
      console.error("Error updating lead:", error);
      res.status(500).json({ 
        success: false,
        error: "Failed to update lead" 
      });
    }
  }

  async deleteLeadSearch(req, res) {
    try {
      const { searchId } = req.params;

      const result = await LeadSearch.deleteOne({ searchId });

      if (result.deletedCount === 0) {
        return res.status(404).json({ 
          success: false,
          error: "Lead search not found" 
        });
      }

      res.json({ 
        success: true,
        message: "Lead search deleted successfully" 
      });
    } catch (error) {
      console.error("Error deleting lead search:", error);
      res.status(500).json({ 
        success: false,
        error: "Failed to delete lead search" 
      });
    }
  }

  async getStats(req, res) {
    try {
      const totalSearches = await LeadSearch.countDocuments();
      const totalLeads = await LeadSearch.aggregate([
        { $unwind: "$contacts" },
        { $count: "totalLeads" }
      ]);
      
      const newLeads = await LeadSearch.aggregate([
        { $unwind: "$contacts" },
        { $match: { "contacts.status": "new" } },
        { $count: "count" }
      ]);

      const contactedLeads = await LeadSearch.aggregate([
        { $unwind: "$contacts" },
        { $match: { "contacts.status": "contacted" } },
        { $count: "count" }
      ]);

      const convertedLeads = await LeadSearch.aggregate([
        { $unwind: "$contacts" },
        { $match: { "contacts.status": "converted" } },
        { $count: "count" }
      ]);

      // Get leads by platform
      const leadsByPlatform = await LeadSearch.aggregate([
        { $unwind: "$contacts" },
        { $group: { _id: "$contacts.platform", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);

      // Get searches by keyword
      const searchesByKeyword = await LeadSearch.aggregate([
        { $group: { _id: "$keyword", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]);

      res.json({
        success: true,
        stats: {
          totalSearches,
          totalLeads: totalLeads[0]?.totalLeads || 0,
          newLeads: newLeads[0]?.count || 0,
          contactedLeads: contactedLeads[0]?.count || 0,
          convertedLeads: convertedLeads[0]?.count || 0,
          leadsByPlatform,
          searchesByKeyword,
        },
        services: {
          searchApi: searchApiManager.getStats(),
          crawler: crawlerManager.getStats(),
          proxy: proxyManager.getStats(),
        }
      });
    } catch (error) {
      console.error("Error getting stats:", error);
      res.status(500).json({ 
        success: false,
        error: "Failed to get statistics" 
      });
    }
  }

  async getSearchDetail(req, res) {
    try {
      const { searchId } = req.params;

      const leadSearch = await LeadSearch.findOne({ searchId });
      
      if (!leadSearch) {
        return res.status(404).json({ 
          success: false,
          error: "Search not found" 
        });
      }

      res.json({
        success: true,
        search: leadSearch
      });
    } catch (error) {
      console.error("Error getting search detail:", error);
      res.status(500).json({ 
        success: false,
        error: "Failed to get search details" 
      });
    }
  }
}

module.exports = new LeadController();