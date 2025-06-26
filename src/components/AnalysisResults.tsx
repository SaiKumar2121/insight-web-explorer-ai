
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, Users, Package, FileText, Sparkles } from 'lucide-react';
import { AnalysisData } from '@/pages/Index';

interface AnalysisResultsProps {
  analysisData: AnalysisData | null;
  isLoading: boolean;
}

export const AnalysisResults = ({ analysisData, isLoading }: AnalysisResultsProps) => {
  const questions = [
    {
      id: 'businessAbout',
      title: 'What is this business about?',
      icon: Building2,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-50',
    },
    {
      id: 'coreProducts',
      title: 'What are the core products or services offered?',
      icon: Package,
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-50',
    },
    {
      id: 'targetAudience',
      title: 'Who can be the target audience?',
      icon: Users,
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-50',
    },
    {
      id: 'blogContent',
      title: 'Blog content analysis',
      icon: FileText,
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-50',
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-purple-600 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">AI Analysis in Progress</h2>
          <p className="text-gray-600">Please wait while we analyze the website...</p>
        </div>
        
        <div className="grid gap-6">
          {questions.map((question) => (
            <Card key={question.id} className="bg-white/80 backdrop-blur-sm shadow-lg border-white/20">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-r ${question.color}`}>
                    <question.icon className="w-5 h-5 text-white" />
                  </div>
                  <CardTitle className="text-lg">{question.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!analysisData) {
    return (
      <div className="text-center py-12">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
          <div className="flex items-center justify-center mb-4">
            <Sparkles className="w-12 h-12 text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Ready for Analysis</h2>
          <p className="text-gray-600">
            Enter a website URL and click "Analyze Website" to get AI-powered business insights.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 px-4 py-2">
            <Sparkles className="w-4 h-4 mr-2" />
            Analysis Complete
          </Badge>
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Business Intelligence Report</h2>
      </div>
      
      <div className="grid gap-6">
        {questions.map((question) => {
          const content = analysisData[question.id as keyof AnalysisData];
          
          return (
            <Card 
              key={question.id} 
              className="bg-white/90 backdrop-blur-sm shadow-xl border-white/20 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]"
            >
              <CardHeader className={`${question.bgColor} border-b border-gray-100`}>
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg bg-gradient-to-r ${question.color} shadow-lg`}>
                    <question.icon className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-xl text-gray-800">{question.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="prose prose-gray max-w-none">
                  <p className="text-gray-700 leading-relaxed text-lg">
                    {content || 'No information available'}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
