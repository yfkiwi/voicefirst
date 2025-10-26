import { useState } from 'react';
import type { NextPage } from 'next';
import { DraftAnalysisPage } from '../components/DraftAnalysisPage';
import { LandingPage } from '../components/LandingPage';
import { ProposalBuilder } from '../components/ProposalBuilder';

type WorkflowStep = 'landing' | 'draft-analysis' | 'builder';

const HomePage: NextPage = () => {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('landing');
  const [uploadedDraft, setUploadedDraft] = useState<File | null>(null);

  return (
    <div className="min-h-screen">
      {currentStep === 'landing' && (
        <LandingPage
          onStartFromScratch={() => setCurrentStep('builder')}
          onUploadDraft={(file) => {
            setUploadedDraft(file);
            setCurrentStep('draft-analysis');
          }}
        />
      )}

      {currentStep === 'draft-analysis' && uploadedDraft && (
        <DraftAnalysisPage
          draftFile={uploadedDraft}
          onContinue={() => setCurrentStep('builder')}
          onBack={() => setCurrentStep('landing')}
        />
      )}

      {currentStep === 'builder' && (
        <ProposalBuilder
          onBack={() => setCurrentStep('landing')}
          existingDraft={uploadedDraft}
        />
      )}
    </div>
  );
};

export default HomePage;
