const axios = require('axios');

class CaptchaSolver {
  constructor() {
    this.apiKey = process.env.ANTI_CAPTCHA_KEY;
    this.baseUrl = 'https://api.anti-captcha.com';
  }

  async solveRecaptcha(siteUrl, siteKey) {
    try {
      console.log('Submitting captcha task to Anti-Captcha...');
      
      // Create task
      const taskResponse = await axios.post(`${this.baseUrl}/createTask`, {
        clientKey: this.apiKey,
        task: {
          type: "RecaptchaV2TaskProxyless",
          websiteURL: siteUrl,
          websiteKey: siteKey
        }
      });

      if (taskResponse.data.errorId > 0) {
        throw new Error(`Anti-Captcha error: ${taskResponse.data.errorDescription}`);
      }

      const taskId = taskResponse.data.taskId;
      console.log(`Captcha task created: ${taskId}`);

      // Poll for solution
      let solution = null;
      let attempts = 0;
      const maxAttempts = 20; // 20 attempts * 5 seconds = 100 seconds max

      while (!solution && attempts < maxAttempts) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        
        const resultResponse = await axios.post(`${this.baseUrl}/getTaskResult`, {
          clientKey: this.apiKey,
          taskId: taskId
        });

        if (resultResponse.data.status === 'ready') {
          solution = resultResponse.data.solution.gRecaptchaResponse;
          console.log('Captcha solved successfully');
        } else if (resultResponse.data.errorId > 0) {
          throw new Error(`Anti-Captcha error: ${resultResponse.data.errorDescription}`);
        }
      }

      if (!solution) {
        throw new Error('Captcha solving timeout');
      }

      return solution;
    } catch (error) {
      console.error('Captcha solving error:', error.message);
      throw error;
    }
  }

  async getBalance() {
    try {
      const response = await axios.post(`${this.baseUrl}/getBalance`, {
        clientKey: this.apiKey
      });
      return response.data.balance;
    } catch (error) {
      console.error('Error getting balance:', error.message);
      return null;
    }
  }
}

module.exports = new CaptchaSolver();