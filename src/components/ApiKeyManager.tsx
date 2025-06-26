
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Key, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';

export const ApiKeyManager = () => {
  const [firecrawlKey, setFirecrawlKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [showFirecrawlKey, setShowFirecrawlKey] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const savedFirecrawlKey = localStorage.getItem('firecrawl_api_key');
    const savedOpenaiKey = localStorage.getItem('openai_api_key');
    
    if (savedFirecrawlKey) setFirecrawlKey(savedFirecrawlKey);
    if (savedOpenaiKey) setOpenaiKey(savedOpenaiKey);
    
    // Auto-expand if no keys are saved
    if (!savedFirecrawlKey || !savedOpenaiKey) {
      setIsExpanded(true);
    }
  }, []);

  const saveApiKeys = () => {
    if (!firecrawlKey.trim() || !openaiKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter both API keys",
        variant: "destructive",
      });
      return;
    }

    localStorage.setItem('firecrawl_api_key', firecrawlKey);
    localStorage.setItem('openai_api_key', openaiKey);
    
    toast({
      title: "Success",
      description: "API keys saved successfully!",
      duration: 3000,
    });
    
    setIsExpanded(false);
  };

  const hasValidKeys = firecrawlKey.trim() && openaiKey.trim();

  return (
    <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-white/20">
      <CardHeader className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Key className="w-5 h-5 text-purple-600" />
            <CardTitle className="text-lg">API Configuration</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {hasValidKeys ? (
              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                <CheckCircle className="w-3 h-3 mr-1" />
                Configured
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
                <XCircle className="w-3 h-3 mr-1" />
                Required
              </Badge>
            )}
            <Button variant="ghost" size="sm">
              {isExpanded ? 'Hide' : 'Show'}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Firecrawl API Key
              </label>
              <div className="relative">
                <Input
                  type={showFirecrawlKey ? "text" : "password"}
                  value={firecrawlKey}
                  onChange={(e) => setFirecrawlKey(e.target.value)}
                  placeholder="fc-..."
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowFirecrawlKey(!showFirecrawlKey)}
                >
                  {showFirecrawlKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Get your key from{' '}
                <a href="https://firecrawl.dev" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">
                  firecrawl.dev
                </a>
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                OpenAI API Key
              </label>
              <div className="relative">
                <Input
                  type={showOpenaiKey ? "text" : "password"}
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder="sk-..."
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                >
                  {showOpenaiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Get your key from{' '}
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">
                  OpenAI Platform
                </a>
              </p>
            </div>
          </div>
          
          <Button 
            onClick={saveApiKeys}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            Save API Keys
          </Button>
        </CardContent>
      )}
    </Card>
  );
};
