// src/services/ScrapingService.ts

import { AnalysisData } from '@/pages/Index';

export class ScrapingService {
  // 1. UPDATED: Validate for 'openai_api_key'
  static validateApiKeys(): boolean {
    const firecrawlKey = localStorage.getItem('firecrawl_api_key');
    const openaiKey = localStorage.getItem('openai_api_key'); // Changed from geminiKey
    return !!(firecrawlKey && openaiKey);
  }

  static async scrapeWebsite(url: string): Promise<{ success: boolean; content?: string; blogContent?: string; error?: string }> {
    const apiKey = localStorage.getItem('firecrawl_api_key');
    
    if (!apiKey) {
      return { success: false, error: 'Firecrawl API key not found' };
    }

    try {
      console.log('Starting scrape for URL:', url);
      
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

      let blogContent = '';
      const blogUrls = this.extractBlogUrls(url, mainContent);
      
      if (blogUrls.length > 0) {
        console.log('Found potential blog URLs:', blogUrls);
        
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
    // This function remains unchanged
    const blogUrls: string[] = [];
    const domain = new URL(baseUrl).origin;
    
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
    
    if (blogUrls.length === 0) {
      const commonBlogPaths = ['/blog', '/news', '/articles', '/posts'];
      commonBlogPaths.forEach(path => {
        blogUrls.push(domain + path);
      });
    }
    
    return blogUrls;
  }

  // 2. UPDATED: Switched from Gemini to OpenAI
  static async analyzeWithAI(content: string, blogContent?: string): Promise<{ success: boolean; analysis?: AnalysisData; error?: string }> {
    const apiKey = localStorage.getItem('openai_api_key'); // Changed from gemini_api_key
    
    if (!apiKey) {
      return { success: false, error: 'OpenAI API key not found' }; // Changed error message
    }

    try {
      console.log('Starting AI analysis with OpenAI...'); // Changed log message
      
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

      // 3. UPDATED: Changed fetch request to OpenAI's endpoint and payload structure
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo", // Or another model like "gpt-4"
          messages: [{
            role: "user",
            content: prompt
          }],
          response_format: { type: "json_object" }, // Ensures the response is JSON
          temperature: 0.1,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // 4. UPDATED: Changed how the response is parsed
      if (!data.choices || !data.choices[0]?.message?.content) {
        throw new Error('Invalid response from OpenAI API');
      }

      let analysisText = data.choices[0].message.content.trim();
      console.log('Raw AI response:', analysisText);
      
      try {
        const analysis = JSON.parse(analysisText) as AnalysisData;
        
        if (!analysis.businessAbout || !analysis.coreProducts || !analysis.targetAudience || !analysis.blogContent) {
          throw new Error('Invalid analysis structure');
        }
        
        console.log('AI analysis successful');
        return { success: true, analysis };
        
      } catch (parseError) {
        console.error('JSON parsing error:', parseError, 'Raw Text:', analysisText);
        return { success: false, error: 'Failed to parse AI response.' };
      }
      
    } catch (error) {
      console.error('AI analysis error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to analyze content with AI' 
      };
    }
  }

  // This fallback function is no longer needed with OpenAI's JSON mode but can be kept as a failsafe
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
    
    const substantialSentence = sentences.find(s => s.trim().length > 50);
    return substantialSentence ? substantialSentence.trim() + '.' : null;
  }
}
