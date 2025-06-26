
import { useState } from 'react';
import { ScrapingForm } from '@/components/ScrapingForm';
import { AnalysisResults } from '@/components/AnalysisResults';
import { ApiKeyManager } from '@/components/ApiKeyManager';
import { Activity, Globe, Zap } from 'lucide-react';

export interface AnalysisData {
  businessAbout: string;
  coreProducts: string;
  targetAudience: string;
  blogContent: string;
}

const Index = () => {
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="p-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full shadow-lg">
              <Globe className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
            Web Intelligence Dashboard
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Analyze any website with AI-powered insights. Get instant business intelligence from web scraping.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-r from-green-400 to-blue-500 rounded-full mr-4">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-800">AI Powered</h3>
                <p className="text-gray-600">Intelligent Analysis</p>
              </div>
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mr-4">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-800">Fast Scraping</h3>
                <p className="text-gray-600">Real-time Results</p>
              </div>
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-r from-orange-400 to-red-500 rounded-full mr-4">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-800">Any Website</h3>
                <p className="text-gray-600">Universal Compatibility</p>
              </div>
            </div>
          </div>
        </div>

        {/* API Key Manager */}
        <div className="mb-8">
          <ApiKeyManager />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Scraping Form */}
          <div className="space-y-6">
            <ScrapingForm 
              onAnalysisComplete={setAnalysisData}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
            />
          </div>

          {/* Analysis Results */}
          <div className="space-y-6">
            <AnalysisResults 
              analysisData={analysisData}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
