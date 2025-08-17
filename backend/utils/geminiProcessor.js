const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

function cleanJsonString(str) {
  console.log('Cleaning JSON string...');
  try {
    // Remove control characters and non-printable characters
    str = str.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
    // Remove trailing commas
    str = str.replace(/,\s*([\]}])/g, '$1');
    // Fix single quotes to double quotes
    str = str.replace(/:\s*'([^']*)'/g, ': "$1"');
    // Remove any markdown code block markers
    str = str.replace(/```json\s*|\s*```/g, '');
    // Remove any extra text before/after JSON
    const jsonStart = str.indexOf('[');
    const jsonEnd = str.lastIndexOf(']');
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      str = str.substring(jsonStart, jsonEnd + 1);
    }
    return str.trim();
  } catch (error) {
    console.error('Error cleaning JSON string:', error);
    return str;
  }
}

// Enhanced contact information extraction
const extractContactInfo = (text) => {
  console.log('Extracting contact information with enhanced regex...');
  
  // Enhanced email patterns
  const emailRegex = /(?:[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  const emails = [...new Set((text.match(emailRegex) || []).filter(email => {
    // Filter out common false positives
    const invalidPatterns = [
      '@example.com', '@test.com', '@domain.com', '@company.com',
      'noreply@', 'no-reply@', 'donotreply@'
    ];
    return !invalidPatterns.some(pattern => email.toLowerCase().includes(pattern));
  }))];
  
  // Enhanced phone patterns (international and local)
  const phonePatterns = [
    /\+?\d{1,3}[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, // International/US format
    /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, // US format
    /\+\d{1,3}[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g, // General international
    /\d{10,}/g // Simple 10+ digit numbers
  ];
  
  let phones = [];
  phonePatterns.forEach(pattern => {
    const matches = text.match(pattern) || [];
    phones.push(...matches);
  });
  
  // Clean and filter phone numbers
  phones = [...new Set(phones.filter(phone => {
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length >= 10 && cleanPhone.length <= 15;
  }))];
  
  // Enhanced website patterns
  const websitePatterns = [
    /https?:\/\/[^\s<>"{}|\\^`[\]]+/g,
    /www\.[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}/g,
    /[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.(com|org|net|edu|gov|mil|biz|info|mobi|name|aero|jobs|museum|co\.uk|co\.in)/g
  ];
  
  let websites = [];
  websitePatterns.forEach(pattern => {
    const matches = text.match(pattern) || [];
    websites.push(...matches);
  });
  
  websites = [...new Set(websites.filter(site => {
    const lowSite = site.toLowerCase();
    return !lowSite.includes('google.com') && 
           !lowSite.includes('facebook.com/search') &&
           !lowSite.includes('instagram.com/explore');
  }))];
  
  // Enhanced social media patterns
  const socialPatterns = {
    facebook: /(?:https?:\/\/)?(?:www\.)?facebook\.com\/(?:pages\/)?[a-zA-Z0-9.]+/g,
    linkedin: /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:in|company)\/[a-zA-Z0-9-]+/g,
    instagram: /(?:https?:\/\/)?(?:www\.)?instagram\.com\/[a-zA-Z0-9_.]+/g,
    twitter: /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/[a-zA-Z0-9_]+/g
  };
  
  const socialMedia = {};
  Object.keys(socialPatterns).forEach(platform => {
    const matches = text.match(socialPatterns[platform]) || [];
    socialMedia[platform] = [...new Set(matches.filter(url => {
      // Filter out search/explore URLs
      return !url.includes('/search') && !url.includes('/explore') && !url.includes('/hashtag');
    }))];
  });
  
  // Extract business names and contact information from context
  const businessNamePatterns = [
    /(?:business|company|firm|studio|agency|services?|solutions?|consulting|photography|design)[\s:]([^.\n]{2,50})/gi,
    /([A-Z][a-zA-Z\s&]{2,30}(?:LLC|Inc|Corp|Ltd|Photography|Studio|Design|Solutions|Services|Consulting))/g,
    /"([^"]{3,40})"(?:\s*-\s*(?:photographer|designer|consultant|freelancer))/gi
  ];
  
  let businessNames = [];
  businessNamePatterns.forEach(pattern => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const name = (match[1] || match[0]).trim();
      if (name.length > 2 && name.length < 50) {
        businessNames.push(name);
      }
    }
  });
  
  businessNames = [...new Set(businessNames)];
  
  return {
    emails,
    phones,
    websites,
    socialMedia,
    businessNames
  };
};

// Enhanced content preprocessing
const preprocessContent = (rawData, keyword, location) => {
  console.log('Preprocessing content for better extraction...');
  
  // Clean and normalize the content
  let content = rawData
    .replace(/\s+/g, ' ')
    .replace(/[\r\n]+/g, ' ')
    .trim();
  
  // Extract relevant sections that mention the keyword or location
  const relevantSections = [];
  const sentences = content.split(/[.!?]+/);
  
  sentences.forEach(sentence => {
    const lowerSentence = sentence.toLowerCase();
    const keywordMatch = keyword.toLowerCase().split(' ').some(word => 
      lowerSentence.includes(word.toLowerCase())
    );
    const locationMatch = lowerSentence.includes(location.toLowerCase());
    const contactMatch = /contact|email|phone|call|reach|hire|book|inquire/i.test(sentence);
    
    if ((keywordMatch || locationMatch) && contactMatch && sentence.length > 20) {
      relevantSections.push(sentence.trim());
    }
  });
  
  // If we have relevant sections, use them; otherwise use the full content
  const processedContent = relevantSections.length > 0 
    ? relevantSections.join('. ') 
    : content.substring(0, 8000); // Limit content size
  
  console.log(`Preprocessed content: ${processedContent.length} chars from ${relevantSections.length} relevant sections`);
  return processedContent;
};

// Enhanced processing with Gemini AI
const processWithGemini = async (rawData, source, keyword, location) => {
  try {
    console.log(`Processing raw data from ${source} with enhanced Gemini AI`);
    console.log(`Raw data length: ${rawData.length} characters`);
    
    // Preprocess content to focus on relevant information
    const processedContent = preprocessContent(rawData, keyword, location);
    
    // Extract basic contact info with regex first
    const extractedInfo = extractContactInfo(processedContent);
    console.log(`Regex extraction found: ${extractedInfo.emails.length} emails, ${extractedInfo.phones.length} phones, ${extractedInfo.businessNames.length} business names`);
    
    // Enhanced prompt with better instructions and examples
    const prompt = `You are an expert lead generation specialist. I'm providing search results from ${source} for "${keyword}" professionals/businesses in "${location}".

Your task is to extract legitimate business leads with contact information. Focus on:
- Real businesses, freelancers, or professionals offering "${keyword}" services
- Valid contact information (emails, phone numbers)
- Business names and professional names
- Working websites and business social media profiles

CRITICAL REQUIREMENTS:
1. Only include entries with at least an email OR phone number
2. Verify information relates to "${keyword}" services in "${location}"
3. Return valid JSON array format only
4. Use "N/A" for missing information
5. Extract actual business/professional names from the content
6. Include social media only if they appear business-related

EXAMPLE OUTPUT FORMAT:
[
  {
    "name": "John Smith",
    "businessName": "Smith Wedding Photography", 
    "email": "john@smithweddings.com",
    "phone": "+1-555-123-4567",
    "website": "www.smithweddings.com",
    "socialMedia": {
      "facebook": "facebook.com/smithweddingphotography",
      "linkedin": "linkedin.com/in/johnsmith-photographer", 
      "instagram": "instagram.com/smithweddings",
      "twitter": "N/A"
    },
    "location": "${location}",
    "service": "${keyword}",
    "source": "${source}"
  }
]

IMPORTANT: Return ONLY the JSON array, no additional text.

Search Results to Process:
${processedContent}`;

    console.log('Sending enhanced request to Gemini AI...');
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        topK: 1,
        topP: 0.1,
        maxOutputTokens: 4096,
      },
    });

    const generatedText = result.response.text();
    console.log('Gemini AI response received');
    console.log(`Response length: ${generatedText.length} characters`);

    let processedData;
    try {
      let jsonString = cleanJsonString(generatedText);
      console.log('Attempting to parse JSON...');
      processedData = JSON.parse(jsonString);
      
    } catch (parseError) {
      console.error('JSON parsing failed, attempting advanced fallback processing...');
      console.log('Raw Gemini response sample:', generatedText.substring(0, 500) + '...');
      
      // Advanced fallback: create structured leads from extracted information
      processedData = [];
      if (extractedInfo.emails.length > 0 || extractedInfo.phones.length > 0) {
        const maxItems = Math.max(
          extractedInfo.emails.length, 
          extractedInfo.phones.length, 
          extractedInfo.businessNames.length
        );
        
        for (let i = 0; i < Math.min(maxItems, 10); i++) {
          const lead = {
            name: 'N/A',
            businessName: extractedInfo.businessNames[i] || `${keyword} Professional`,
            email: extractedInfo.emails[i] || 'N/A',
            phone: extractedInfo.phones[i] || 'N/A',
            website: extractedInfo.websites[i] || 'N/A',
            socialMedia: {
              facebook: extractedInfo.socialMedia.facebook[i] || 'N/A',
              linkedin: extractedInfo.socialMedia.linkedin[i] || 'N/A',
              instagram: extractedInfo.socialMedia.instagram[i] || 'N/A',
              twitter: extractedInfo.socialMedia.twitter[i] || 'N/A'
            },
            location: location,
            service: keyword,
            source: source
          };
          
          // Only add if has email or phone
          if (lead.email !== 'N/A' || lead.phone !== 'N/A') {
            processedData.push(lead);
          }
        }
      }
      
      if (processedData.length === 0) {
        throw new Error('No valid contact information could be extracted from the data');
      }
      
      console.log(`Advanced fallback processing created ${processedData.length} leads`);
    }

    // Enhanced data validation and cleaning
    if (!Array.isArray(processedData)) {
      console.error('Data is not an array:', typeof processedData);
      throw new Error('Processed data is not in the correct format');
    }

    // Filter and enhance the results
    const validLeads = processedData.filter(lead => {
      if (!lead || typeof lead !== 'object') return false;
      
      // Must have at least email or phone
      const hasEmail = lead.email && lead.email !== 'N/A' && lead.email.includes('@');
      const hasPhone = lead.phone && lead.phone !== 'N/A' && lead.phone.replace(/\D/g, '').length >= 10;
      
      if (!hasEmail && !hasPhone) return false;
      
      // Enhanced email validation
      if (hasEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(lead.email)) {
          console.warn(`Invalid email format: ${lead.email}`);
          lead.email = 'N/A';
          if (!hasPhone) return false;
        }
        
        // Check for invalid email patterns
        const invalidEmails = ['example.com', 'test.com', 'domain.com', 'company.com'];
        if (invalidEmails.some(invalid => lead.email.toLowerCase().includes(invalid))) {
          lead.email = 'N/A';
          if (!hasPhone) return false;
        }
      }
      
      return true;
    }).map(lead => {
      // Clean and normalize the lead data
      return {
        name: (lead.name || 'N/A').trim(),
        businessName: (lead.businessName || 'N/A').trim(),
        email: (lead.email || 'N/A').trim().toLowerCase(),
        phone: (lead.phone || 'N/A').trim(),
        website: cleanWebsiteUrl(lead.website || 'N/A'),
        socialMedia: {
          facebook: cleanSocialUrl(lead.socialMedia?.facebook || 'N/A'),
          linkedin: cleanSocialUrl(lead.socialMedia?.linkedin || 'N/A'),
          instagram: cleanSocialUrl(lead.socialMedia?.instagram || 'N/A'),
          twitter: cleanSocialUrl(lead.socialMedia?.twitter || 'N/A')
        },
        location: location,
        service: keyword,
        source: source
      };
    });

    console.log(`Successfully processed ${validLeads.length} valid leads from ${source}`);
    
    if (validLeads.length === 0) {
      console.warn('No valid leads found after enhanced processing');
    } else {
      console.log('Sample lead:', JSON.stringify(validLeads[0], null, 2));
    }
    
    return validLeads;

  } catch (error) {
    console.error(`Error in enhanced processWithGemini for source ${source}:`, error.message);
    console.error('Stack trace:', error.stack);
    
    // Enhanced fallback with better error handling
    if (rawData.length > 100) {
      console.log('Attempting enhanced fallback extraction...');
      try {
        const extractedInfo = extractContactInfo(rawData);
        const fallbackLeads = [];
        
        // Create better structured leads from extracted contact info
        const maxEmails = Math.min(extractedInfo.emails.length, 5);
        const maxPhones = Math.min(extractedInfo.phones.length, 5);
        const maxBusinesses = Math.min(extractedInfo.businessNames.length, 5);
        
        const maxLeads = Math.max(maxEmails, maxPhones, maxBusinesses);
        
        for (let i = 0; i < maxLeads; i++) {
          const lead = {
            name: 'N/A',
            businessName: extractedInfo.businessNames[i] || `${keyword} Provider`,
            email: extractedInfo.emails[i] || 'N/A',
            phone: extractedInfo.phones[i] || 'N/A',
            website: extractedInfo.websites[i] || 'N/A',
            socialMedia: {
              facebook: extractedInfo.socialMedia.facebook[i] || 'N/A',
              linkedin: extractedInfo.socialMedia.linkedin[i] || 'N/A',
              instagram: extractedInfo.socialMedia.instagram[i] || 'N/A',
              twitter: extractedInfo.socialMedia.twitter[i] || 'N/A'
            },
            location: location,
            service: keyword,
            source: source
          };
          
          // Only add if has valid email or phone
          if ((lead.email !== 'N/A' && lead.email.includes('@')) || 
              (lead.phone !== 'N/A' && lead.phone.replace(/\D/g, '').length >= 10)) {
            fallbackLeads.push(lead);
          }
        }
        
        if (fallbackLeads.length > 0) {
          console.log(`Enhanced fallback extraction found ${fallbackLeads.length} leads`);
          return fallbackLeads;
        }
      } catch (fallbackError) {
        console.error('Enhanced fallback extraction also failed:', fallbackError.message);
      }
    }
    
    throw error;
  }
};

// Helper function to clean website URLs
const cleanWebsiteUrl = (url) => {
  if (!url || url === 'N/A') return 'N/A';
  
  url = url.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  
  return url;
};

// Helper function to clean social media URLs
const cleanSocialUrl = (url) => {
  if (!url || url === 'N/A') return 'N/A';
  
  url = url.trim();
  if (url.startsWith('www.')) {
    url = 'https://' + url;
  } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  
  return url;
};

// Enhanced regex-only processing
const processWithRegexOnly = (rawData, source, keyword, location) => {
  console.log('Processing with enhanced regex-only fallback...');
  
  try {
    const extractedInfo = extractContactInfo(rawData);
    const leads = [];
    
    // Enhanced lead creation logic
    const maxLeads = Math.min(10, Math.max(
      extractedInfo.emails.length, 
      extractedInfo.phones.length,
      extractedInfo.businessNames.length
    ));
    
    for (let i = 0; i < maxLeads; i++) {
      const email = extractedInfo.emails[i];
      const phone = extractedInfo.phones[i];
      const businessName = extractedInfo.businessNames[i];
      
      // Skip if no email and no phone
      if (!email && !phone) continue;
      
      const lead = {
        name: 'N/A',
        businessName: businessName || `${keyword} Service Provider`,
        email: email || 'N/A',
        phone: phone || 'N/A',
        website: extractedInfo.websites[i] || 'N/A',
        socialMedia: {
          facebook: extractedInfo.socialMedia.facebook[i] || 'N/A',
          linkedin: extractedInfo.socialMedia.linkedin[i] || 'N/A',
          instagram: extractedInfo.socialMedia.instagram[i] || 'N/A',
          twitter: extractedInfo.socialMedia.twitter[i] || 'N/A'
        },
        location: location,
        service: keyword,
        source: source
      };
      
      leads.push(lead);
    }
    
    console.log(`Enhanced regex-only processing found ${leads.length} leads`);
    return leads;
    
  } catch (error) {
    console.error('Enhanced regex-only processing failed:', error.message);
    return [];
  }
};

module.exports = {
  processWithGemini,
  processWithRegexOnly,
  extractContactInfo
};