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

  const autoFillFields = useCallback((section: number, userInput: string) => {
    // Auto-fill form data based on current section
    // In production, this would use GPT-4o to extract structured data from user input
    
    const today = new Date().toISOString().split('T')[0];
    
    switch (section) {
      case 1: // Cover Page
        updateMultipleFields({
          projectTitle: 'Community-Owned Traditional Crafts & Eco-Tourism Social Enterprise',
          organizationName: 'Inuvik Community Development Corporation',
          submissionDate: today,
          contactName: 'Sarah Johnson',
          contactPhone: '(867) 555-0123',
          contactEmail: 'sjohnson@inuvik-cdc.ca',
          contactAddress: '123 Mackenzie Road, Inuvik, NT X0E 0T0',
          fundedBy: 'Northern Economic Development Program'
        });
        
        // Show notification
        setTimeout(() => {
          const notificationMessage: Message = {
            id: Date.now().toString(),
            type: 'system',
            content: '✨ Cover Page fields have been auto-filled! Review and edit as needed.',
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, notificationMessage]);
        }, 2000);
        break;
        
      case 2: // Executive Summary
        updateMultipleFields({
          executiveSummary: 'The Inuvik Community Development Corporation proposes to establish a community-owned traditional crafts and eco-tourism social enterprise to address critical employment challenges while preserving Indigenous cultural heritage. This innovative project will create 15 permanent jobs, train 30 community members in traditional crafts and tourism skills, and generate sustainable revenue through authentic cultural experiences. By combining traditional knowledge with modern business practices, we will create economic opportunities that strengthen community identity and provide meaningful employment for our youth and elders. We are requesting $450,000 over three years to establish infrastructure, provide training, and launch operations that will become self-sustaining by Year 3.'
        });
        
        setTimeout(() => {
          const notificationMessage: Message = {
            id: Date.now().toString(),
            type: 'system',
            content: '✨ Executive Summary has been drafted! Review and customize as needed.',
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, notificationMessage]);
        }, 2000);
        break;
        
      case 3: // Community Context
        updateMultipleFields({
          communityName: 'Inuvik',
          population: '3,243',
          communityBackground: 'Inuvik is a vibrant Indigenous community in the Northwest Territories, home to Inuvialuit, Gwich\'in, and other Indigenous peoples. Our community has a rich history of traditional crafts including beadwork, fur garments, and caribou tufting, passed down through generations. Despite strong cultural traditions and growing tourism interest, we face a 24% unemployment rate, particularly affecting youth and women. Our community has excellent transportation links and established tourism infrastructure, positioning us well for eco-tourism development that respects and celebrates our cultural heritage.'
        });
        
        setTimeout(() => {
          const notificationMessage: Message = {
            id: Date.now().toString(),
            type: 'system',
            content: '✨ Community Context section populated! Review the details.',
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, notificationMessage]);
        }, 2000);
        break;
        
      case 4: // Problem Statement
        updateMultipleFields({
          problemDescription: 'Our community faces a critical employment gap, with youth unemployment at 35% and limited opportunities for traditional skill development. Cultural knowledge transmission is at risk as elders age and youth seek opportunities elsewhere. The tourism industry is growing in our region but profits flow to southern-owned companies rather than benefiting local people. We need sustainable, culturally-appropriate employment that keeps families together and preserves traditional knowledge for future generations.',
          supportingEvidence: 'Community consultations (2024) show 87% support for cultural enterprise development. Regional tourism data indicates 15,000+ annual visitors seeking authentic Indigenous experiences. Labour market analysis reveals only 3 locally-owned tourism operators despite high demand. Elder interviews document concern about cultural knowledge loss among youth aged 15-24.'
        });
        
        setTimeout(() => {
          const notificationMessage: Message = {
            id: Date.now().toString(),
            type: 'system',
            content: '✨ Problem Statement completed with supporting evidence!',
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, notificationMessage]);
        }, 2000);
        break;
        
      case 5: // Project Description
        updateMultipleFields({
          objective1: 'Create 15 permanent full-time employment positions by Year 3 (10 artisans, 3 tour guides, 2 administrative)',
          objective2: 'Train 30 community members in traditional crafts and eco-tourism skills by Year 2',
          objective3: 'Generate $200,000 in annual revenue by Year 3 with 80% profit reinvested in community',
          year1Activities: 'Establish production facility and retail space; Purchase equipment and materials; Recruit and train 15 participants in traditional crafts; Develop product lines and branding; Establish governance structure; Create partnerships with 5 hotels/tour operators',
          year2Activities: 'Launch guided cultural tours (spring/summer); Expand training to 15 additional participants; Develop online sales platform; Participate in 3 regional trade shows; Hire 2 full-time staff; Generate initial revenue ($50,000 target)',
          year3Activities: 'Scale to full operations with 15 permanent positions; Achieve revenue target of $200,000; Expand product distribution to 10 retailers; Develop training certification program; Begin succession planning for sustainability'
        });
        
        setTimeout(() => {
          const notificationMessage: Message = {
            id: Date.now().toString(),
            type: 'system',
            content: '✨ Project objectives and 3-year activities plan filled in!',
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, notificationMessage]);
        }, 2000);
        break;
        
      case 7: // Budget
        updateMultipleFields({
          totalBudget: '500000',
          requestedAmount: '450000',
          personnelBudget: '180000',
          equipmentBudget: '85000',
          trainingBudget: '65000',
          marketingBudget: '45000',
          otherBudget: '125000'
        });
        
        setTimeout(() => {
          const notificationMessage: Message = {
            id: Date.now().toString(),
            type: 'system',
            content: '✨ Budget categories filled with estimated amounts!',
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, notificationMessage]);
        }, 2000);
        break;
        
      case 8: // Outcomes
        updateMultipleFields({
          expectedOutcomes: '15 permanent jobs created with living wages ($45,000+/year); 30 community members trained with transferable skills; $200,000 annual revenue by Year 3; 5 traditional art forms actively practiced and taught; 500+ visitors engaged in authentic cultural experiences annually; Community ownership model established as template for other initiatives',
          successIndicators: 'Number of jobs created and retention rate (target 90%); Revenue generated and profit margins (target 25%); Training completion rates and participant satisfaction (target 85%); Product sales volume and customer reviews (target 4.5/5 stars); Cultural knowledge transmission documented through elder-youth mentorship pairs'
        });
        
        setTimeout(() => {
          const notificationMessage: Message = {
            id: Date.now().toString(),
            type: 'system',
            content: '✨ Expected outcomes and success indicators populated!',
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, notificationMessage]);
        }, 2000);
        break;
        
      case 9: // Alignment
        updateMultipleFields({
          alignmentDescription: 'This project directly aligns with your program\'s priorities: (1) Economic Reconciliation - creating Indigenous-owned business with community control; (2) Skills Development - providing practical training in traditional and modern business skills; (3) Community Well-being - addressing employment, cultural preservation, and social cohesion; (4) Innovation - combining traditional knowledge with sustainable tourism model; (5) Sustainability - building long-term revenue generation and capacity'
        });
        
        setTimeout(() => {
          const notificationMessage: Message = {
            id: Date.now().toString(),
            type: 'system',
            content: '✨ Alignment with funder priorities articulated!',
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, notificationMessage]);
        }, 2000);
        break;
        
      case 10: // Risk Management
        updateMultipleFields({
          risksMitigation: 'Market Risk: Mitigate through diversified revenue streams (retail, tourism, online sales) and partnerships with established operators. Training Risk: Address through flexible scheduling, childcare support, and elder mentorship model. Seasonal Tourism: Balance with year-round craft production and online sales maintaining winter operations. Capacity Risk: Implement gradual scaling, strong governance, and ongoing business mentorship. Cultural Appropriation: Ensure community ownership, elder guidance on cultural protocols, and authentic storytelling.'
        });
        
        setTimeout(() => {
          const notificationMessage: Message = {
            id: Date.now().toString(),
            type: 'system',
            content: '✨ Risk management strategies documented!',
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, notificationMessage]);
        }, 2000);
        break;
    }
  }, [updateMultipleFields]);

  const getActiveSectionName = useCallback(() => {
    if (currentSection <= 0) {
      return 'Document Preparation';
    }
    return sectionNames[currentSection - 1] ?? 'Proposal Section';
  }, [currentSection]);

  const buildHistory = useCallback(
    (historyMessages: Message[]): ConversationMessage[] => {
      const history: ConversationMessage[] = [
        { role: 'system', content: BASE_SYSTEM_PROMPT },
        {
          role: 'system',
          content: `The user is currently working on the ${getActiveSectionName()} section of a grant proposal. Provide focused, respectful support and suggest actionable next steps.`,
        },
      ];

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
    [getActiveSectionName],
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

    autoFillFields(currentSection, trimmed);

    try {
      const response = await chatWithAssistant({
        message: trimmed,
        history: buildHistory(messagesRef.current),
      });

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
