import React, { useRef } from 'react';
import { Card, CardContent } from './ui/card';
import { SectionHeader } from './SectionHeader';
import { Button } from './ui/button';
import { Upload, FileText, X, CheckCircle2, File } from 'lucide-react';
import { useProposal } from './ProposalContext';

export function DocumentUploadSection() {
  const { data, addCommunityDocument, addFundingDocument, removeCommunityDocument, removeFundingDocument } = useProposal();
  const communityInputRef = useRef<HTMLInputElement>(null);
  const fundingInputRef = useRef<HTMLInputElement>(null);

  const handleCommunityUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        addCommunityDocument(file);
      });
    }
    // Reset input
    if (communityInputRef.current) {
      communityInputRef.current.value = '';
    }
  };

  const handleFundingUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        addFundingDocument(file);
      });
    }
    // Reset input
    if (fundingInputRef.current) {
      fundingInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <Card className="border-2 border-purple-200 shadow-lg">
      <CardContent className="p-8">
        <SectionHeader
          number={0}
          title="Upload Documents for AI Context"
          icon={Upload}
          description="Upload your community documents and funding guidelines to help the AI understand your context"
        />

        <div className="space-y-8">
          {/* Community Documents section removed */}

          {/* Funding Documents */}
          <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border-2 border-amber-200">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-amber-600 text-white rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-amber-900 mb-2">Funding Guidelines</h3>
                <p className="text-sm text-stone-700">
                  Upload funding program documents: grant guidelines, eligibility criteria, 
                  application requirements, scoring rubrics, or program descriptions.
                </p>
              </div>
            </div>

            <input
              ref={fundingInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleFundingUpload}
              className="hidden"
              id="funding-upload"
            />
            
            <Button
              type="button"
              onClick={() => fundingInputRef.current?.click()}
              className="w-full mb-4 bg-amber-600 hover:bg-amber-700"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Funding Guidelines
            </Button>

            {/* Uploaded Funding Documents List */}
            {data.fundingDocuments.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-amber-900 mb-2">
                  ✓ {data.fundingDocuments.length} document{data.fundingDocuments.length !== 1 ? 's' : ''} uploaded
                </p>
                {data.fundingDocuments.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-200"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <File className="w-5 h-5 text-amber-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{file.name}</p>
                        <p className="text-xs text-stone-500">{formatFileSize(file.size)}</p>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFundingDocument(index)}
                      className="ml-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Context Info */}
          <div className="p-4 bg-purple-50 border-l-4 border-purple-400 rounded">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm">
                AI
              </div>
              <div>
                <h4 className="text-purple-900 mb-2">How the AI Uses Your Documents</h4>
                <ul className="text-sm text-stone-700 space-y-1 list-disc list-inside">
                  <li><strong>Community context:</strong> Extracts key facts, demographics, challenges, and strengths</li>
                  <li><strong>Funding alignment:</strong> Identifies priorities, scoring criteria, and required elements</li>
                  <li><strong>Smart suggestions:</strong> Recommends content based on both your context and funder requirements</li>
                  <li><strong>Voice assistance:</strong> Uses this context when you speak to provide relevant guidance</li>
                </ul>
                <p className="text-xs text-purple-700 mt-3 italic">
                  💡 Tip: More documents = better AI assistance! Upload as many relevant files as you have.
                </p>
              </div>
            </div>
          </div>

          {/* Optional Note */}
          {data.communityDocuments.length === 0 && data.fundingDocuments.length === 0 && (
            <div className="p-4 bg-stone-100 border-l-4 border-stone-400 rounded">
              <p className="text-sm text-stone-700">
                ℹ️ Documents are optional but highly recommended. The AI will provide better, more tailored 
                assistance when it has context about your community and the funding program you're applying to.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}