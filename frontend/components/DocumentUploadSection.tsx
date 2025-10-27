import React, { useRef, useState } from 'react';
import { Card, CardContent } from './ui/card';
import { SectionHeader } from './SectionHeader';
import { Button } from './ui/button';
import { Upload, FileText, X, CheckCircle2, File } from 'lucide-react';
import { useProposal } from './ProposalContext';

export function DocumentUploadSection() {
  const { data, addCommunityDocument, addFundingDocument, removeCommunityDocument, removeFundingDocument } = useProposal();
  const communityInputRef = useRef<HTMLInputElement>(null);
  const fundingInputRef = useRef<HTMLInputElement>(null);
  const [isCommunityDragActive, setIsCommunityDragActive] = useState(false);
  const [isFundingDragActive, setIsFundingDragActive] = useState(false);

  const resetInput = (ref: React.RefObject<HTMLInputElement>) => {
    if (ref.current) {
      ref.current.value = '';
    }
  };

  const queueFiles = (files: FileList | null, addFile: (file: File) => void) => {
    if (!files) return;
    Array.from(files).forEach(file => addFile(file));
  };

  const handleCommunityUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    queueFiles(e.target.files, addCommunityDocument);
    resetInput(communityInputRef);
  };

  const handleFundingUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    queueFiles(e.target.files, addFundingDocument);
    resetInput(fundingInputRef);
  };

  const handleDrop = (
    event: React.DragEvent<HTMLDivElement>,
    type: 'community' | 'funding'
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (type === 'community') {
      setIsCommunityDragActive(false);
      queueFiles(event.dataTransfer.files, addCommunityDocument);
    } else {
      setIsFundingDragActive(false);
      queueFiles(event.dataTransfer.files, addFundingDocument);
    }
  };

  const handleDragState = (
    event: React.DragEvent<HTMLDivElement>,
    type: 'community' | 'funding',
    isActive: boolean
  ) => {
    event.preventDefault();
    event.stopPropagation();
    if (type === 'community') {
      setIsCommunityDragActive(isActive);
    } else {
      setIsFundingDragActive(isActive);
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
          {/* Community Documents */}
          <div className="p-6 bg-gradient-to-br from-sky-50 to-blue-50 rounded-lg border-2 border-sky-200">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-sky-600 text-white rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-sky-900 mb-2">Community Context Documents</h3>
                <p className="text-sm text-stone-700">
                  Upload community plans, needs assessments, demographic reports, or strategic documents to ground the AI in your local context.
                </p>
              </div>
            </div>

            <input
              ref={communityInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleCommunityUpload}
              className="hidden"
              id="community-upload"
            />

            <div
              onDragEnter={event => handleDragState(event, 'community', true)}
              onDragOver={event => handleDragState(event, 'community', true)}
              onDragLeave={event => handleDragState(event, 'community', false)}
              onDrop={event => handleDrop(event, 'community')}
              className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
                isCommunityDragActive
                  ? 'border-sky-500 bg-white'
                  : 'border-sky-200 bg-white/70 hover:border-sky-400'
              }`}
            >
              <div className="text-center">
                <Upload className="w-6 h-6 text-sky-500 mx-auto mb-2" />
                <p className="text-sm text-stone-700">Drag & drop community files here</p>
                <p className="text-xs text-stone-500 mb-4">Accepted: PDF, DOC, DOCX, TXT</p>
                <Button
                  type="button"
                  onClick={() => communityInputRef.current?.click()}
                  variant="outline"
                  className="bg-white"
                >
                  Browse Files
                </Button>
              </div>
            </div>

            {/* Uploaded Community Documents List */}
            {data.communityDocuments.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-sky-900 mb-2">
                  ✓ {data.communityDocuments.length} document{data.communityDocuments.length !== 1 ? 's' : ''} uploaded
                </p>
                {data.communityDocuments.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-sky-200"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <File className="w-5 h-5 text-sky-600 flex-shrink-0" />
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
                      onClick={() => removeCommunityDocument(index)}
                      className="ml-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Funding Documents */}
          <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border-2 border-amber-200">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-amber-600 text-white rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-amber-900 mb-2">Funding Guidelines</h3>
                <p className="text-sm text-stone-700">
                  Upload grant guidelines, eligibility criteria, scoring rubrics, and application templates from the funder.
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

            <div
              onDragEnter={event => handleDragState(event, 'funding', true)}
              onDragOver={event => handleDragState(event, 'funding', true)}
              onDragLeave={event => handleDragState(event, 'funding', false)}
              onDrop={event => handleDrop(event, 'funding')}
              className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
                isFundingDragActive
                  ? 'border-amber-500 bg-white'
                  : 'border-amber-200 bg-white/70 hover:border-amber-400'
              }`}
            >
              <div className="text-center">
                <Upload className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                <p className="text-sm text-stone-700">Drag & drop funding files here</p>
                <p className="text-xs text-stone-500 mb-4">Accepted: PDF, DOC, DOCX, TXT</p>
                <Button
                  type="button"
                  onClick={() => fundingInputRef.current?.click()}
                  variant="outline"
                  className="bg-white"
                >
                  Browse Files
                </Button>
              </div>
            </div>

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