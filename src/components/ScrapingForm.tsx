
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Globe, Loader2, Search } from 'lucide-react';
import { ScrapingService } from '@/services/ScrapingService';
import { AnalysisData } from '@/pages/Index';

interface ScrapingFormProps {
  onAnalysisComplete: (data: AnalysisData) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const ScrapingForm = ({ onAnalysisComplete, isLoading, setIsLoading }: ScrapingFormProps) => {
  const [url, setUrl] = useState('');
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid URL",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setProgress(0);
    setCurrentStep('Initializing...');

    try {
      // Step 1: Validate API keys
      setCurrentStep('Validating API keys...');
      setProgress(20);
      
      const hasValidKeys = ScrapingService.validateApiKeys();
      if (!hasValidKeys) {
        toast({
          title: "API Keys Required",
          description: "Please configure your Firecrawl and OpenAI API keys",
          variant: "destructive",
        });
        return;
      }

      // Step 2: Scrape website
      setCurrentStep('Scraping website content...');
      setProgress(40);
      
      const scrapedData = await ScrapingService.scrapeWebsite(url);
      
      if (!scrapedData.success) {
        throw new Error(scrapedData.error || 'Failed to scrape website');
      }

      // Step 3: Analyze with AI
      setCurrentStep('Analyzing content with AI...');
      setProgress(70);
      
      const analysisResult = await ScrapingService.analyzeWithAI(scrapedData.content);
      
      if (!analysisResult.success) {
        throw new Error(analysisResult.error || 'Failed to analyze content');
      }

      // Step 4: Complete
      setCurrentStep('Analysis complete!');
      setProgress(100);
      
      onAnalysisComplete(analysisResult.analysis);
      
      toast({
        title: "Success",
        description: "Website analysis completed successfully!",
        duration: 3000,
      });

    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to analyze website",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setProgress(0);
      setCurrentStep('');
    }
  };

  return (
    <Card className="w-full bg-white/90 backdrop-blur-sm shadow-xl border-white/20">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-gray-800 flex items-center justify-center gap-2">
          <Search className="w-6 h-6 text-purple-600" />
          Website Analyzer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter website URL (e.g., https://example.com)"
              className="pl-12 h-12 text-lg border-2 border-gray-200 focus:border-purple-500 transition-colors"
              disabled={isLoading}
            />
          </div>
          
          <Button
            type="submit"
            disabled={isLoading || !url.trim()}
            className="w-full h-12 text-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Search className="w-5 h-5 mr-2" />
                Analyze Website
              </>
            )}
          </Button>
        </form>

        {isLoading && (
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">{currentStep}</span>
              <span className="text-sm text-gray-500">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
