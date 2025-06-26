import { AnalysisData } from '@/pages/Index';

export class ScrapingService {
  static validateApiKeys(): boolean {
    const firecrawlKey = localStorage.getItem('firecrawl_api_key');
    const geminiKey = localStorage.getItem('gemini_api_key');
    return !!(firecrawlKey && geminiKey);
  }

  static async scrapeWebsite(url: string): Promise<{ success: boolean; content?: string; error?: string }> {
    const apiKey = localStorage.getItem('firecrawl_api_key');
    
    if (!apiKey) {
      return { success: false, error: 'Firecrawl API key not found' };
    }

    try {
      console.log('Starting scrape for URL:', url);
      
      const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url,
          formats: ['markdown', 'html'],
          includeTags: ['title', 'meta', 'h1', 'h2', 'h3', 'p', 'a', 'div'],
          excludeTags: ['script', 'style', 'nav', 'footer'],
          waitFor: 2000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Scraping failed');
      }

      const content = data.data?.markdown || data.data?.html || '';
      
      if (!content) {
        throw new Error('No content extracted from the website');
      }

      console.log('Scraping successful, content length:', content.length);
      return { success: true, content };
      
    } catch (error) {
      console.error('Scraping error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to scrape website' 
      };
    }
  }

  static async analyzeWithAI(content: string): Promise<{ success: boolean; analysis?: AnalysisData; error?: string }> {
    const apiKey = localStorage.getItem('gemini_api_key');
    
    if (!apiKey) {
      return { success: false, error: 'Gemini API key not found' };
    }

    try {
      console.log('Starting AI analysis with Gemini...');
      
      const prompt = `
Analyze the following website content and provide detailed answers to these 4 questions in JSON format:

1. What is this business about?
2. What are the core products or services offered?
3. Based on the information about products or services, who can be the target audience?
4. Do they have a blog page, if yes what sort of content they are publishing?

Website Content:
${content.substring(0, 8000)} // Limit content to avoid token limits

Please respond with a JSON object in this exact format:
{
  "businessAbout": "Detailed description of what the business is about",
  "coreProducts": "Detailed description of core products or services",
  "targetAudience": "Detailed analysis of potential target audience",
  "blogContent": "Analysis of blog content or 'No blog section found' if none exists"
}

Make sure each response is comprehensive and informative (2-3 sentences minimum).`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1500,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
        throw new Error('Invalid response from Gemini API');
      }

      const analysisText = data.candidates[0].content.parts[0].text.trim();
      
      try {
        // Try to parse as JSON
        const analysis = JSON.parse(analysisText) as AnalysisData;
        
        // Validate the structure
        if (!analysis.businessAbout || !analysis.coreProducts || !analysis.targetAudience || !analysis.blogContent) {
          throw new Error('Invalid analysis structure');
        }
        
        console.log('AI analysis successful');
        return { success: true, analysis };
        
      } catch (parseError) {
        console.error('JSON parsing error:', parseError);
        // Fallback: try to extract information manually
        const fallbackAnalysis: AnalysisData = {
          businessAbout: this.extractSection(analysisText, 'business about') || 'Unable to determine business focus from the available content.',
          coreProducts: this.extractSection(analysisText, 'products or services') || 'Unable to identify specific products or services from the available content.',
          targetAudience: this.extractSection(analysisText, 'target audience') || 'Unable to determine target audience from the available content.',
          blogContent: this.extractSection(analysisText, 'blog') || 'No blog section found on the website.',
        };
        
        return { success: true, analysis: fallbackAnalysis };
      }
      
    } catch (error) {
      console.error('AI analysis error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to analyze content with AI' 
      };
    }
  }

  private static extractSection(text: string, keyword: string): string | null {
    const lines = text.split('\n');
    let foundSection = false;
    let result = '';
    
    for (const line of lines) {
      if (line.toLowerCase().includes(keyword)) {
        foundSection = true;
        result = line;
        continue;
      }
      
      if (foundSection && line.trim()) {
        if (line.includes(':') && !result.includes(':')) {
          break;
        }
        result += ' ' + line;
      }
    }
    
    return result.trim() || null;
  }
}
