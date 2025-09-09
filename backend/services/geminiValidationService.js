const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiValidationService {
  constructor(apiKey) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    // Updated to use Gemini 1.5 Flash (current available model)
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  async validateAndCorrectLead(lead) {
    const prompt = `
      Analyze this business lead data and correct any inconsistencies:
      
      Current Data:
      - Business Name: ${lead.businessName}
      - Website: ${lead.website}
      - Source URL: ${lead.sourceUrl}
      - Description: ${lead.description ? lead.description.substring(0, 200) : 'No description'}...
      - Emails: ${lead.emails.join(', ')}
      - Phones: ${lead.phones.join(', ')}
      
      Instructions:
      1. Extract the actual business name from the website domain, source URL, and description
      2. Verify if the website URL matches the business (check domain consistency)
      3. Remove page titles like "About Us", "Contact", "Home" from business names
      4. Suggest the most appropriate business name based on Indian naming conventions
      5. Return ONLY valid JSON format: {"correctedBusinessName": "string", "websiteMatch": true/false, "confidence": 0.0-1.0, "issues": ["string array"]}
      
      Example: If businessName is "About Us - Sharma Events" and website is "sharmaevents.com", correctedBusinessName should be "Sharma Events"
      
      Return only the JSON object, no additional text:
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();
      
      // Clean the response - remove any markdown formatting or extra text
      let cleanText = text;
      if (cleanText.includes('```json')) {
        cleanText = cleanText.split('```json')[1].split('```')[0];
      } else if (cleanText.includes('```')) {
        cleanText = cleanText.split('```')[1].split('```')[0];
      }
      
      // Extract JSON from response
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const validationResult = JSON.parse(jsonMatch[0]);
        
        // Ensure confidence is a number between 0-1
        validationResult.confidence = Math.max(0, Math.min(1, parseFloat(validationResult.confidence) || 0.5));
        
        // Ensure required fields exist
        if (!validationResult.correctedBusinessName) {
          validationResult.correctedBusinessName = lead.businessName;
        }
        if (typeof validationResult.websiteMatch !== 'boolean') {
          validationResult.websiteMatch = true;
        }
        if (!Array.isArray(validationResult.issues)) {
          validationResult.issues = [];
        }
        
        return validationResult;
      }
      
      return {
        correctedBusinessName: lead.businessName,
        websiteMatch: true,
        confidence: 0.5,
        issues: ['Could not parse AI response']
      };
    } catch (error) {
      console.error('Gemini validation error:', error);
      return {
        correctedBusinessName: lead.businessName,
        websiteMatch: true,
        confidence: 0.3,
        issues: ['Validation service unavailable: ' + error.message]
      };
    }
  }

  async validateMultipleLeads(leads, batchSize = 3) {
    const validatedLeads = [];
    
    for (let i = 0; i < leads.length; i += batchSize) {
      const batch = leads.slice(i, i + batchSize);
      const batchPromises = batch.map(lead => this.validateAndCorrectLead(lead));
      
      try {
        const batchResults = await Promise.all(batchPromises);
        
        validatedLeads.push(...batchResults.map((result, index) => ({
          originalLead: batch[index],
          validation: result
        })));
      } catch (error) {
        console.error('Batch validation error:', error);
        // Add fallback results for failed batch
        validatedLeads.push(...batch.map(lead => ({
          originalLead: lead,
          validation: {
            correctedBusinessName: lead.businessName,
            websiteMatch: true,
            confidence: 0.3,
            issues: ['Batch validation failed: ' + error.message]
          }
        })));
      }
      
      // Rate limiting to avoid hitting API limits - increased delay for Gemini 1.5
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    return validatedLeads;
  }

  // Optional: Method to list available models (for debugging)
  async listAvailableModels() {
    try {
      const models = await this.genAI.listModels();
      console.log('Available Gemini models:', models);
      return models;
    } catch (error) {
      console.error('Error listing models:', error);
      return [];
    }
  }
}

module.exports = GeminiValidationService;