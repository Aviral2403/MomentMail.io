const generateGoogleDorkQuery = (keyword, source, location, emailDomain = '') => {
  console.log(`Generating dork query for source: ${source}, keyword: ${keyword}, location: ${location}`);
  
  const baseQueries = {
    // More targeted Google searches for contact information
    google: `("${keyword}" AND "${location}") AND (email OR contact OR "@gmail.com" OR "@yahoo.com" OR "phone" OR "call")`,
    
    // Facebook business pages and profiles
    facebook: `site:facebook.com ("${keyword}" "${location}") AND (contact OR email OR phone OR business)`,
    
    // Instagram business profiles
    instagram: `site:instagram.com ("${keyword}" "${location}") AND (contact OR email OR "dm me" OR "inquiries")`,
    
    // LinkedIn profiles and company pages  
    linkedin: `(site:linkedin.com/in OR site:linkedin.com/company) ("${keyword}" "${location}") AND (contact OR email OR phone)`,
    
    // Fiverr freelancer profiles
    fiverr: `site:fiverr.com ("${keyword}") AND (contact OR email OR "${location}")`,
    
    // Upwork freelancer profiles
    upwork: `site:upwork.com/freelancers ("${keyword}") AND (contact OR email OR "${location}")`,
    
    // Google Maps business listings
    google_maps: `site:google.com/maps ("${keyword}" "${location}") AND (phone OR contact OR website)`,
    
    // Job boards with contact info
    job_boards: `(site:indeed.com OR site:monster.com OR site:careerbuilder.com) ("${keyword}" "${location}") AND (contact OR email OR apply)`,
    
    // Reddit posts and communities
    reddit: `site:reddit.com ("${keyword}" "${location}") AND (contact OR email OR hire OR freelance)`,
    
    // General directory searches
    directory: `("${keyword}" "${location}") AND ("contact us" OR "get in touch" OR "email us" OR "call us") filetype:html`,
    
    // Business directory specific
    yellowpages: `site:yellowpages.com ("${keyword}" "${location}")`,
    
    // Craigslist services
    craigslist: `site:craigslist.org ("${keyword}" "${location}") AND (contact OR email OR phone)`
  };

  let query = baseQueries[source];
  
  if (!query) {
    console.warn(`Unknown source: ${source}, using default query`);
    query = `("${keyword}" "${location}") AND (email OR contact OR phone)`;
  }
  
  // Add email domain filter if specified
  if (emailDomain && emailDomain.trim()) {
    const domain = emailDomain.startsWith('@') ? emailDomain : `@${emailDomain}`;
    query += ` AND "${domain}"`;
  }

  console.log(`Generated query for ${source}: ${query}`);
  return query;
};

const generateSearchUrl = (query) => {
  // Use more results per page and add additional parameters for better results
  const encodedQuery = encodeURIComponent(query);
  return `https://www.google.com/search?q=${encodedQuery}&num=50&start=0&hl=en&gl=us&pws=0&filter=0`;
};

// Alternative query generators for better results
const generateAlternativeQueries = (keyword, location, emailDomain = '') => {
  const queries = [
    // Contact page searches
    `"${keyword}" "${location}" ("contact us" OR "get in touch" OR "reach us")`,
    
    // Email pattern searches
    `"${keyword}" "${location}" ("@gmail.com" OR "@yahoo.com" OR "@hotmail.com" OR "email")`,
    
    // Phone number searches
    `"${keyword}" "${location}" (phone OR call OR "contact number" OR "(")`,
    
    // Business listing searches  
    `"${keyword}" "${location}" (directory OR listing OR "business hours" OR address)`,
    
    // Social media searches
    `"${keyword}" "${location}" (facebook OR instagram OR twitter OR linkedin)`
  ];
  
  if (emailDomain) {
    const domain = emailDomain.startsWith('@') ? emailDomain : `@${emailDomain}`;
    queries.unshift(`"${keyword}" "${location}" "${domain}"`);
  }
  
  return queries;
};

module.exports = {
  generateGoogleDorkQuery,
  generateSearchUrl,
  generateAlternativeQueries
};