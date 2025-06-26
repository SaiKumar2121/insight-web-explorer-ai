
import { AnalysisData } from '@/pages/Index';

export class ScrapingService {
  static validateApiKeys(): boolean {
    const firecrawlKey = localStorage.getItem('firecrawl_api_key');
    const geminiKey = localStorage.getItem('gemini_api_key');
    return !!(firecrawlKey && geminiKey);
  }

  static async scrapeWebsite(url: string): Promise<{ success: boolean; content?: string; blogContent?: string; error?: string }> {
    const apiKey = localStorage.getItem('firecrawl_api_key');
    
    if (!apiKey) {
      return { success: false, error: 'Firecrawl API key not found' };
    }

    try {
      console.log('Starting scrape for URL:', url);
      
      // First, scrape the main page
      const mainResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url,
          formats: ['markdown'],
          includeTags: ['title', 'meta', 'h1', 'h2', 'h3', 'p', 'a', 'div', 'span'],
          excludeTags: ['script', 'style', 'nav', 'footer', 'header'],
          waitFor: 3000,
          timeout: 30000,
        }),
      });

      if (!mainResponse.ok) {
        const errorData = await mainResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${mainResponse.status}: ${mainResponse.statusText}`);
      }

      const mainData = await mainResponse.json();
      
      if (!mainData.success) {
        throw new Error(mainData.error || 'Scraping failed');
      }

      const mainContent = mainData.data?.markdown || '';
      
      if (!mainContent) {
        throw new Error('No content extracted from the website');
      }

      console.log('Main page scraping successful, content length:', mainContent.length);

      // Try to detect and scrape blog section
      let blogContent = '';
      const blogUrls = this.extractBlogUrls(url, mainContent);
      
      if (blogUrls.length > 0) {
        console.log('Found potential blog URLs:', blogUrls);
        
        // Try to scrape the first blog URL found
        try {
          const blogResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: blogUrls[0],
              formats: ['markdown'],
              includeTags: ['title', 'meta', 'h1', 'h2', 'h3', 'p', 'a', 'div', 'span', 'article'],
              excludeTags: ['script', 'style', 'nav', 'footer', 'header'],
              waitFor: 3000,
              timeout: 30000,
            }),
          });

          if (blogResponse.ok) {
            const blogData = await blogResponse.json();
            if (blogData.success && blogData.data?.markdown) {
              blogContent = blogData.data.markdown;
              console.log('Blog scraping successful, content length:', blogContent.length);
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
    
    // Common blog patterns
    const blogPatterns = [
      /\[Blog\]\((https?:\/\/[^)]+)\)/gi,
      /\[blog\]\((https?:\/\/[^)]+)\)/gi,
      /href="([^"]*blog[^"]*)"/gi,
      /href="([^"]*\/blog[^"]*)"/gi,
    ];
    
    blogPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        let url = match[1];
        if (url.startsWith('/')) {
          url = domain + url;
        }
        if (!blogUrls.includes(url)) {
          blogUrls.push(url);
        }
      }
    });
    
    // Fallback: try common blog paths
    if (blogUrls.length === 0) {
      const commonBlogPaths = ['/blog', '/news', '/articles', '/posts'];
      commonBlogPaths.forEach(path => {
        blogUrls.push(domain + path);
      });
    }
    
    return blogUrls;
  }

  static async analyzeWithAI(content: string, blogContent?: string): Promise<{ success: boolean; analysis?: AnalysisData; error?: string }> {
    const apiKey = localStorage.getItem('gemini_api_key');
    
    if (!apiKey) {
      return { success: false, error: 'Gemini API key not found' };
    }

    try {
      console.log('Starting AI analysis with Gemini...');
      
      const blogSection = blogContent ? `\n\nBLOG SECTION CONTENT:\n${blogContent.substring(0, 3000)}` : '';
      
      const prompt = `
You are a business analyst. Analyze the following website content and provide answers to these 4 questions in a clean JSON format:

1. What is this business about?
2. What are the core products or services offered?
3. Based on the information about products or services, who can be the target audience?
4. Do they have a blog page, if yes what sort of content they are publishing? Include specific blog post titles, topics, or links if available.

MAIN WEBSITE CONTENT:
${content.substring(0, 8000)}${blogSection}

Respond ONLY with a valid JSON object in this exact format (no markdown formatting, no code blocks):
{
  "businessAbout": "Detailed description of what the business is about",
  "coreProducts": "Detailed description of core products or services",
  "targetAudience": "Detailed analysis of potential target audience",
  "blogContent": "Analysis of blog content with specific examples, titles, or topics. If blog exists but no content details available, mention the blog URL and general theme. If no blog found, state 'No blog section found'"
}

Make each response comprehensive and informative (2-3 sentences minimum). For blog content, be specific about what type of content they publish and include examples if available.`;

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
            temperature: 0.1,
            topK: 32,
            topP: 0.95,
            maxOutputTokens: 2000,
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

      let analysisText = data.candidates[0].content.parts[0].text.trim();
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
