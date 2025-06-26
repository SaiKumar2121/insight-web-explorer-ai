
import { AnalysisData } from '@/pages/Index';

export class ScrapingService {
  static validateApiKeys(): boolean {
    const scraperApiKey = localStorage.getItem('scraper_api_key');
    const openaiKey = localStorage.getItem('openai_api_key');
    return !!(scraperApiKey && openaiKey);
  }

  static async scrapeWebsite(url: string): Promise<{ success: boolean; content?: string; blogContent?: string; error?: string }> {
    const apiKey = localStorage.getItem('scraper_api_key');
    
    if (!apiKey) {
      return { success: false, error: 'ScraperAPI key not found' };
    }

    try {
      console.log('Starting scrape for URL:', url);
      
      // ScraperAPI endpoint
      const scraperUrl = `http://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(url)}&render=true&format=text`;
      
      const mainResponse = await fetch(scraperUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/plain',
        },
      });

      if (!mainResponse.ok) {
        throw new Error(`HTTP ${mainResponse.status}: ${mainResponse.statusText}`);
      }

      const mainContent = await mainResponse.text();
      
      if (!mainContent || mainContent.length < 100) {
        throw new Error('No content extracted from the website or content too short');
      }

      console.log('Main page scraping successful, content length:', mainContent.length);

      // Try to detect and scrape blog section
      let blogContent = '';
      const blogUrls = this.extractBlogUrls(url, mainContent);
      
      if (blogUrls.length > 0) {
        console.log('Found potential blog URLs:', blogUrls);
        
        // Try to scrape the first blog URL found
        try {
          const blogScraperUrl = `http://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(blogUrls[0])}&render=true&format=text`;
          
          const blogResponse = await fetch(blogScraperUrl, {
            method: 'GET',
            headers: {
              'Accept': 'text/plain',
            },
          });

          if (blogResponse.ok) {
            blogContent = await blogResponse.text();
            if (blogContent && blogContent.length > 100) {
              console.log('Blog scraping successful, content length:', blogContent.length);
            } else {
              blogContent = '';
            }
          }
        } catch (blogError) {
          console.log('Blog scraping failed, continuing with main content only:', blogError);
        }
      }

      return { 
        success: true, 
        content: mainContent,
        blogContent: blogContent || undefined
      };
      
    } catch (error) {
      console.error('Scraping error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to scrape website' 
      };
    }
  }

  private static extractBlogUrls(baseUrl: string, content: string): string[] {
    const blogUrls: string[] = [];
    const domain = new URL(baseUrl).origin;
    
    // Common blog patterns in text content
    const blogPatterns = [
      /https?:\/\/[^\s]*blog[^\s]*/gi,
      /https?:\/\/blog\.[^\s]*/gi,
    ];
    
    // Extract URLs from content
    const urlPattern = /https?:\/\/[^\s<>"']+/gi;
    const urls = content.match(urlPattern) || [];
    
    urls.forEach(url => {
      if (url.toLowerCase().includes('blog') && !blogUrls.includes(url)) {
        blogUrls.push(url.replace(/[.,;!?]$/, '')); // Remove trailing punctuation
      }
    });
    
    // Fallback: try common blog paths
    if (blogUrls.length === 0) {
      const commonBlogPaths = ['/blog', '/news', '/articles', '/posts'];
      commonBlogPaths.forEach(path => {
        blogUrls.push(domain + path);
      });
    }
    
    return blogUrls.slice(0, 3); // Limit to first 3 URLs
  }

  static async analyzeWithAI(content: string, blogContent?: string): Promise<{ success: boolean; analysis?: AnalysisData; error?: string }> {
    const apiKey = localStorage.getItem('openai_api_key');
    
    if (!apiKey) {
      return { success: false, error: 'OpenAI API key not found' };
    }

    try {
      console.log('Starting AI analysis with OpenAI...');
      
      const blogSection = blogContent ? `\n\nBLOG SECTION CONTENT:\n${blogContent.substring(0, 3000)}` : '';
      
      const prompt = `You are a business analyst. Analyze the following website content and provide answers to these 4 questions in a clean JSON format:

1. What is this business about?
2. What are the core products or services offered?
3. Based on the information about products or services, who can be the target audience?
4. Do they have a blog page, if yes what sort of content they are publishing? Include specific blog post titles, topics, or links if available.

MAIN WEBSITE CONTENT:
${content.substring(0, 8000)}${blogSection}

Respond ONLY with a valid JSON object in this exact format:
{
  "businessAbout": "Detailed description of what the business is about",
  "coreProducts": "Detailed description of core products or services", 
  "targetAudience": "Detailed analysis of potential target audience",
  "blogContent": "Analysis of blog content with specific examples, titles, or topics. If blog exists but no content details available, mention the blog URL and general theme. If no blog found, state 'No blog section found'"
}

Make each response comprehensive and informative (2-3 sentences minimum). For blog content, be specific about what type of content they publish and include examples if available.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0]?.message?.content) {
        throw new Error('Invalid response from OpenAI API');
      }

      let analysisText = data.choices[0].message.content.trim();
      console.log('Raw AI response:', analysisText);
      
      // Clean up the response - remove markdown code blocks if present
      analysisText = analysisText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
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
        console.log('Cleaned text that failed to parse:', analysisText);
        
        // Fallback: create a structured analysis from the text
        const fallbackAnalysis: AnalysisData = {
          businessAbout: this.extractInfo(analysisText, ['business', 'company', 'about']) || 'Based on the website content, this appears to be a business or organization, but specific details about their focus could not be clearly determined.',
          coreProducts: this.extractInfo(analysisText, ['product', 'service', 'offer']) || 'The specific products or services offered by this business could not be clearly identified from the available content.',
          targetAudience: this.extractInfo(analysisText, ['audience', 'customer', 'target']) || 'The target audience for this business could not be clearly determined from the available information.',
          blogContent: blogContent ? 'Blog content was found but could not be properly analyzed. Please check the website directly for blog details.' : 'No clear information about blog content or publishing activity was found on the website.',
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

  private static extractInfo(text: string, keywords: string[]): string | null {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    for (const keyword of keywords) {
      const matchingSentence = sentences.find(sentence => 
        sentence.toLowerCase().includes(keyword.toLowerCase())
      );
      if (matchingSentence) {
        return matchingSentence.trim() + '.';
      }
    }
    
    // If no specific keyword match, return the first substantial sentence
    const substantialSentence = sentences.find(s => s.trim().length > 50);
    return substantialSentence ? substantialSentence.trim() + '.' : null;
  }
}
