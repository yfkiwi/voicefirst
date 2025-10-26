import React from 'react';

interface ProgressTrackerProps {
  currentSection: number;
  totalSections: number;
  onSectionClick: (section: number) => void;
}

export function ProgressTracker({ currentSection, totalSections, onSectionClick }: ProgressTrackerProps) {
  const sectionTitles = [
    'Upload Documents',
    'Cover Page',
    'Executive Summary',
    'Community Context',
    'Problem Statement',
    'Project Description',
    'Implementation',
    'Budget',
    'Outcomes',
    'Alignment',
    'Risk Management',
    'Attachments'
  ];

  const progress = ((currentSection + 1) / totalSections) * 100;

  return (
    <div>
      <div className="mb-3">
        <div className="h-2 bg-stone-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <div className="flex items-center justify-between text-xs">
        <div className="flex gap-1 flex-wrap">
          {Array.from({ length: totalSections }, (_, i) => i).map((num) => (
            <button
              key={num}
              onClick={() => onSectionClick(num)}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                num === currentSection
                  ? 'bg-emerald-700 text-white scale-110'
                  : num < currentSection
                  ? 'bg-emerald-200 text-emerald-800 hover:bg-emerald-300'
                  : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
              }`}
              title={sectionTitles[num]}
            >
              {num === 0 ? '📄' : num}
            </button>
          ))}
        </div>
        <div className="text-stone-600 ml-4">
          {Math.round(progress)}% Complete
        </div>
      </div>
    </div>
  );
}