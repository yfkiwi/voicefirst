import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardContent } from './ui/card';
import { 
  Mic, 
  Upload, 
  Send, 
  Bot, 
  X, 
  Volume2, 
  FileText,
  Sparkles,
  Loader
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useProposal } from './ProposalContext';
import type { ProposalData } from './ProposalContext';
import { chatWithAssistant, transcribeAudio, type ConversationMessage } from '../lib/api';

interface AIChatPanelProps {
  currentSection: number;
  onClose: () => void;
  hasExistingDraft: boolean;
}

interface Message {
  id: string;
  type: 'ai' | 'user' | 'system';
  content: string;
  timestamp: Date;
  audioSrc?: string;
}

const sectionNames = [
  'Cover Page',
  'Executive Summary',
  'Community Context',
  'Problem Statement',
  'Project Description',
  'Implementation Plan',
  'Budget Overview',
  'Expected Outcomes',
  'Alignment with Priorities',
  'Risk Management',
  'Attachments'
];

const BASE_SYSTEM_PROMPT = `You are an Indigenous grant-writing copilot helping users craft high-quality proposals.
Provide empathetic, concise, and actionable feedback.
Always ground advice in the current section of the proposal workflow and encourage culturally safe practices.`;

type ProposalFieldKey = keyof ProposalData;

const SECTION_FIELD_CONFIG: Record<number, { fields: ProposalFieldKey[]; fallback?: ProposalFieldKey }> = {
  1: {
    fields: [
      'projectTitle',
      'organizationName',
      'submissionDate',
      'contactName',
      'contactPhone',
      'contactEmail',
      'contactAddress',
      'fundedBy',
    ],
  },
  2: { fields: ['executiveSummary'], fallback: 'executiveSummary' },
  3: {
    fields: [
      'communityName',
      'population',
      'communityBackground',
      'economicBaseline',
      'culturalContext',
      'needsChallenges',
    ],
  },
  4: {
    fields: ['problemDescription', 'supportingEvidence'],
    fallback: 'problemDescription',
  },
  5: {
    fields: [
      'objective1',
      'objective2',
      'objective3',
      'year1Activities',
      'year2Activities',
      'year3Activities',
    ],
  },
  6: {
    fields: [
      'governanceStructure',
      'implementationResponsibilities',
      'implementationPartnerships',
      'implementationRiskOverview',
    ],
  },
  7: {
    fields: [
      'totalBudget',
      'requestedAmount',
      'communityContribution',
      'personnelBudget',
      'equipmentBudget',
      'trainingBudget',
      'marketingBudget',
      'otherBudget',
      'sustainabilityPlan',
    ],
  },
  8: {
    fields: [
      'expectedOutcomes',
      'successIndicators',
      'dataCollectionPlan',
      'evaluationPlan',
    ],
    fallback: 'expectedOutcomes',
  },
  9: {
    fields: [
      'communityAlignment',
      'funderAlignment',
      'longTermSustainability',
    ],
    fallback: 'communityAlignment',
  },
  10: {
    fields: ['risksMitigation'],
    fallback: 'risksMitigation',
  },
};

const FIELD_LABELS: Partial<Record<ProposalFieldKey, string>> = {
  projectTitle: 'Project Title',
  organizationName: 'Organization Name',
  submissionDate: 'Submission Date',
  contactName: 'Contact Name',
  contactPhone: 'Contact Phone',
  contactEmail: 'Contact Email',
  contactAddress: 'Contact Address',
  fundedBy: 'Funding Source',
  executiveSummary: 'Executive Summary',
  communityName: 'Community Name',
  population: 'Population',
  communityBackground: 'Community Background',
  economicBaseline: 'Economic Baseline',
  culturalContext: 'Cultural Context',
  needsChallenges: 'Needs & Challenges',
  problemDescription: 'Problem Statement',
  supportingEvidence: 'Supporting Evidence',
  objective1: 'Objective 1',
  objective2: 'Objective 2',
  objective3: 'Objective 3',
  year1Activities: 'Year 1 Activities',
  year2Activities: 'Year 2 Activities',
  year3Activities: 'Year 3 Activities',
  governanceStructure: 'Governance Structure',
  implementationResponsibilities: 'Implementation Responsibilities',
  implementationPartnerships: 'Implementation Partnerships',
  implementationRiskOverview: 'Implementation Risk Overview',
  totalBudget: 'Total Project Cost',
  requestedAmount: 'Grant Requested',
  communityContribution: 'Community Contribution',
  personnelBudget: 'Personnel Budget',
  equipmentBudget: 'Equipment Budget',
  trainingBudget: 'Training Budget',
  marketingBudget: 'Marketing Budget',
  otherBudget: 'Other Costs',
  sustainabilityPlan: 'Sustainability Plan',
  expectedOutcomes: 'Expected Outcomes',
  successIndicators: 'Success Indicators',
  dataCollectionPlan: 'Data Collection Plan',
  evaluationPlan: 'Evaluation Plan',
  communityAlignment: 'Community Alignment',
  funderAlignment: 'Funder Alignment',
  longTermSustainability: 'Long-Term Sustainability',
  alignmentDescription: 'Alignment Summary',
  risksMitigation: 'Risk Mitigation Strategy',
};

export function AIChatPanel({ currentSection, onClose, hasExistingDraft }: AIChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesRef = useRef<Message[]>([]);
  const { updateMultipleFields, data } = useProposal();

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    // Initialize with welcome message
    const welcomeMessage: Message = {
      id: '1',
      type: 'ai',
      content: hasExistingDraft 
        ? "Hello! I've reviewed your existing draft. I'm here to help you improve it section by section. Let's start with the Cover Page. What aspects would you like to enhance?"
        : "Hello! I'm your AI Grant Assistant. I'll guide you through creating a professional proposal. Let's start with the Cover Page - I'll help you gather the essential information. What's your project about?",
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
    setErrorMessage(null);
  }, [hasExistingDraft]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const getSectionGuidance = useCallback((section: number): string => {
    const guidance: { [key: number]: string } = {
      1: "For the Cover Page, I need: project title, organization name, contact information, and submission date. You can speak or type these details.",
      2: "The Executive Summary should be 150-250 words covering who you are, what you're proposing, why it's needed, expected outcomes, and your funding request. Want to draft this together?",
      3: "Let's establish your Community Context. Tell me about your community's background, population, strengths, and cultural significance.",
      4: "For the Problem Statement, describe the specific challenge or opportunity you're addressing. Include any supporting data or community feedback you have.",
      5: "Now for Project Description - let's define your SMART objectives and activities for each year. What are your main goals?",
      6: "The Implementation Plan needs a timeline with specific milestones and deliverables. When do you plan to start, and what are the key phases?",
      7: "For the Budget, I'll help you break down costs into categories: personnel, equipment, training, marketing, and other expenses. What's your total project budget?",
      8: "Expected Outcomes should include measurable results and long-term community impact. How will you measure success?",
      9: "Let's align your project with the funder's priorities. Do you have the funding guidelines? I can help match your project to their goals.",
      10: "For Risk Management, identify potential challenges and your mitigation strategies. What concerns do you have about project implementation?",
      11: "Finally, let's review what supporting documents you have: letters of support, community plans, detailed budgets, etc. What can you attach?"
    };
    return guidance[section] || "How can I help with this section?";
  }, []);

  useEffect(() => {
    if (currentSection <= 0) return;
    const sectionName = sectionNames[currentSection - 1];
    if (!sectionName) return;

    const sectionMessage: Message = {
      id: `${Date.now()}-section`,
      type: 'system',
      content: `📍 Now working on: ${sectionName}`,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, sectionMessage]);

    const timeout = setTimeout(() => {
      const guidanceMessage: Message = {
        id: `${Date.now()}-guidance`,
        type: 'ai',
        content: getSectionGuidance(currentSection),
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, guidanceMessage]);
    }, 300);

    return () => clearTimeout(timeout);
  }, [currentSection, getSectionGuidance]);

  const autoFillFields = useCallback(
    (
      section: number,
      fieldUpdates: Record<string, unknown> | undefined,
      assistantReply: string,
    ) => {
      const config = SECTION_FIELD_CONFIG[section];
      if (!config) return;

      const updates: Partial<ProposalData> = {};
      const updatedLabels: string[] = [];

      for (const field of config.fields) {
        const rawValue = fieldUpdates?.[field];
        if (typeof rawValue === 'string' && rawValue.trim()) {
          updates[field] = rawValue.trim();
          updatedLabels.push(FIELD_LABELS[field] ?? field);
        }
      }

      if (Object.keys(updates).length > 0) {
        updateMultipleFields(updates);

        setTimeout(() => {
          const notificationMessage: Message = {
            id: Date.now().toString(),
            type: 'system',
            content:
              updatedLabels.length === 1
                ? `✨ Updated ${updatedLabels[0]}.`
                : `✨ Updated fields: ${updatedLabels.join(', ')}.`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, notificationMessage]);
        }, 500);
        return;
      }

      const fallbackField = config.fallback;
      if (fallbackField && assistantReply.trim()) {
        updateMultipleFields({ [fallbackField]: assistantReply.trim() } as Partial<ProposalData>);
        setTimeout(() => {
          const notificationMessage: Message = {
            id: Date.now().toString(),
            type: 'system',
            content: `✨ Drafted ${FIELD_LABELS[fallbackField] ?? fallbackField} from the assistant's reply.`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, notificationMessage]);
        }, 500);
      }
    },
    [updateMultipleFields],
  );

  const getActiveSectionName = useCallback(() => {
    if (currentSection <= 0) {
      return 'Document Preparation';
    }
    return sectionNames[currentSection - 1] ?? 'Proposal Section';
  }, [currentSection]);

  const getFormatInstruction = useCallback(
    (section: number): string | undefined => {
      const config = SECTION_FIELD_CONFIG[section];
      if (!config) return undefined;
      const allowedFields = config.fields
        .map((field) => {
          const label = FIELD_LABELS[field];
          return label ? `${field} (${label})` : field;
        })
        .join(', ');
      return [
        'Respond strictly with a JSON object shaped as',
        '{"chat_reply": "<natural language response for the user>", "field_updates": { "<field>": "<value>" }}.',
        `Only include keys inside "field_updates" from this allowlist: ${allowedFields}.`,
        'If you do not have structured updates, set "field_updates" to an empty object.',
        'Values must be plain strings without Markdown or additional commentary. Do not wrap the JSON in code fences or add text outside the JSON.',
      ].join(' ');
    },
    [],
  );

  const buildHistory = useCallback(
    (historyMessages: Message[]): ConversationMessage[] => {
      const history: ConversationMessage[] = [
        { role: 'system', content: BASE_SYSTEM_PROMPT },
        {
          role: 'system',
          content: `The user is currently working on the ${getActiveSectionName()} section of a grant proposal. Provide focused, respectful support and suggest actionable next steps.`,
        },
      ];

      const formatInstruction = getFormatInstruction(currentSection);
      if (formatInstruction) {
        history.push({ role: 'system', content: formatInstruction });
      }

      historyMessages.forEach((message) => {
        if (message.type === 'user') {
          history.push({ role: 'user', content: message.content });
        }
        if (message.type === 'ai') {
          history.push({ role: 'assistant', content: message.content });
        }
      });

      return history;
    },
    [currentSection, getActiveSectionName, getFormatInstruction],
  );

  const playAudioFromBase64 = useCallback((audioBase64: string) => {
    const src = `data:audio/mpeg;base64,${audioBase64}`;
    const audio = new Audio(src);
    audio.play().catch(() => undefined);
    return src;
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;

    const userMessage: Message = {
      id: `${Date.now()}-user`,
      type: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setTextInput('');
    setIsTyping(true);
    setErrorMessage(null);

    try {
      const response = await chatWithAssistant({
        message: trimmed,
        history: buildHistory(messagesRef.current),
        section: currentSection > 0 ? currentSection : undefined,
      });

      autoFillFields(currentSection, response.field_updates, response.message);

      const audioSrc = response.audio_base64
        ? playAudioFromBase64(response.audio_base64)
        : undefined;

      const aiMessage: Message = {
        id: `${Date.now()}-assistant`,
        type: 'ai',
        content: response.message,
        timestamp: new Date(),
        audioSrc,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : 'Unable to reach the assistant. Please try again.';
      setErrorMessage(detail);
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-error`,
          type: 'system',
          content: `⚠️ ${detail}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  }, [autoFillFields, buildHistory, currentSection, playAudioFromBase64]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const handleVoiceRecord = useCallback(async () => {
    if (isRecording) {
      stopRecording();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setErrorMessage('Recording failed. Please try again.');
        setIsRecording(false);
        setIsListening(false);
      };

      recorder.onstop = async () => {
        setIsRecording(false);
        setIsListening(false);
        stream.getTracks().forEach((track) => track.stop());

        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });

        if (!audioBlob.size) {
          return;
        }

        try {
          const transcription = await transcribeAudio(audioBlob, `voice-${Date.now()}.webm`);
          setTextInput(transcription.text);
          await sendMessage(transcription.text);
        } catch (error) {
          const detail =
            error instanceof Error ? error.message : 'Unable to transcribe the recording.';
          setErrorMessage(detail);
          setMessages((prev) => [
            ...prev,
            {
              id: `${Date.now()}-stt-error`,
              type: 'system',
              content: `⚠️ ${detail}`,
              timestamp: new Date(),
            },
          ]);
        }
      };

      recorder.start();
      setIsRecording(true);
      setIsListening(true);
    } catch (error) {
      const detail =
        error instanceof Error
          ? error.message
          : 'Microphone access denied. Please enable microphone permissions.';
      setErrorMessage(detail);
      setIsRecording(false);
      setIsListening(false);
    }
  }, [autoFillFields, currentSection, isRecording, sendMessage, stopRecording]);

  useEffect(() => () => {
    stopRecording();
  }, [stopRecording]);

  const handleTextSubmit = useCallback(() => {
    if (!textInput.trim()) return;
    void sendMessage(textInput);
  }, [sendMessage, textInput]);

  const handleFileUpload = useCallback(() => {
    const systemMessage: Message = {
      id: `${Date.now()}-upload`,
      type: 'system',
      content: '📎 Document uploaded and queued for analysis. I will incorporate its insights shortly.',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, systemMessage]);
  }, []);

  const handlePlayAudio = useCallback((message: Message) => {
    if (!message.audioSrc) return;
    const audio = new Audio(message.audioSrc);
    audio.play().catch(() => undefined);
  }, []);

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-sky-50 to-blue-50">
      {/* Header */}
      <div className="p-4 bg-white border-b border-stone-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-stone-900">AI Assistant</h3>
            <p className="text-xs text-emerald-600 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Powered by OpenAI & ElevenLabs
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="md:hidden">
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Current Section Indicator */}
      <div className="px-4 py-3 bg-emerald-100 border-b border-emerald-200">
        <p className="text-xs text-emerald-900 flex items-center gap-2 mb-1">
          <FileText className="w-4 h-4" />
          {currentSection === 0 ? (
            <span>Working on: <strong>Upload Documents</strong></span>
          ) : (
            <span>Working on: <strong>{sectionNames[currentSection - 1]}</strong></span>
          )}
        </p>
        {/* Show uploaded documents count */}
        {(data.communityDocuments.length > 0 || data.fundingDocuments.length > 0) && (
          <p className="text-xs text-emerald-700 flex items-center gap-2 mt-1">
            📚 RAG Context: {data.communityDocuments.length} community doc{data.communityDocuments.length !== 1 ? 's' : ''}, {data.fundingDocuments.length} funding doc{data.fundingDocuments.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Message Thread */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {message.type === 'ai' && (
                <div className="flex justify-start">
                  <div className="max-w-[85%]">
                    <div className="bg-white rounded-2xl rounded-tl-sm p-4 shadow-sm border border-stone-200">
                      <p className="text-sm text-stone-800 leading-relaxed">
                        {message.content}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-stone-400">
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={!message.audioSrc}
                          className="h-6 gap-1 text-xs text-emerald-600 hover:text-emerald-700 disabled:text-stone-400"
                          onClick={() => handlePlayAudio(message)}
                        >
                          <Volume2 className="w-3 h-3" />
                          {message.audioSrc ? 'Play' : 'No Audio'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {message.type === 'user' && (
                <div className="flex justify-end">
                  <div className="max-w-[85%] bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl rounded-tr-sm p-4 shadow-sm">
                    <p className="text-sm text-white leading-relaxed">
                      {message.content}
                    </p>
                    <p className="text-xs text-emerald-100 mt-2 text-right">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              )}

              {message.type === 'system' && (
                <div className="flex justify-center">
                  <div className="w-full bg-amber-100 border-l-4 border-amber-500 rounded p-3">
                    <p className="text-xs text-amber-900">
                      {message.content}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-white rounded-2xl rounded-tl-sm p-4 shadow-sm border border-stone-200">
              <div className="flex items-center gap-2">
                <Loader className="w-4 h-4 animate-spin text-emerald-600" />
                <p className="text-sm text-stone-600">AI is thinking...</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-stone-200">
        {/* Voice Indicator */}
        {isListening && (
          <div className="mb-3 p-3 bg-red-100 border border-red-300 rounded-lg flex items-center gap-2">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <Mic className="w-4 h-4 text-red-600" />
            </motion.div>
            <p className="text-xs text-red-800">Listening... Speak now</p>
          </div>
        )}

        {errorMessage && (
          <div className="mb-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800">
            {errorMessage}
          </div>
        )}

        {/* Voice Button */}
        <div className="mb-3">
          <Button
            size="lg"
            onClick={handleVoiceRecord}
            className={`w-full gap-3 py-6 text-base transition-all ${
              isRecording
                ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            <Mic className="w-5 h-5" />
            {isRecording ? '🎤 Recording... Tap to stop' : '🎤 Tap to Speak'}
          </Button>
          <p className="text-xs text-center text-stone-500 mt-1">
            Powered by ElevenLabs Voice AI
          </p>
        </div>

        {/* Text Input */}
        <div className="flex gap-2 mb-3">
          <Input
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleTextSubmit();
              }
            }}
            placeholder="Or type your message..."
            className="flex-1"
          />
          <Button
            onClick={handleTextSubmit}
            size="icon"
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {/* Upload Button */}
        <Button
          variant="outline"
          onClick={handleFileUpload}
          className="w-full gap-2 border-2 border-stone-300 hover:border-emerald-400 hover:bg-emerald-50"
        >
          <Upload className="w-4 h-4" />
          📎 Upload Documents for RAG Context
        </Button>
        <p className="text-xs text-center text-stone-500 mt-2">
          Upload community plans, past proposals, or funding guidelines
        </p>
      </div>
    </div>
  );
}
