import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Send,
  RotateCcw,
  Film,
  Compass,
  Flame,
  Clock,
  Tv,
  ArrowLeft,
  User as UserIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  askNovaAI,
  NovaAIMessage,
} from '../services/novaAI';
import { NovaRecommendationCard } from '../components/ai/NovaRecommendationCard';

const QUICK_PROMPTS = [
  { label: 'Recommend a movie', icon: Film, prompt: 'Recommend a movie' },
  { label: 'Horror tonight', icon: Flame, prompt: 'Horror tonight' },
  { label: 'Something like Interstellar', icon: Compass, prompt: 'Recommend something like Interstellar' },
  { label: 'Best thriller series', icon: Tv, prompt: 'Best thriller series' },
  { label: 'Find anime', icon: Sparkles, prompt: 'Find anime' },
  { label: 'Something short', icon: Clock, prompt: 'Give me something under 2 hours' },
];

const STORAGE_KEY = 'novaplay_ai_messages_v1';

export const NovaAIPage: React.FC = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<NovaAIMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Ignore parse errors
    }
    return [];
  });

  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync to local storage for persistence across reloads
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // Ignore storage errors
    }
  }, [messages]);

  // Scroll to bottom on new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend ?? inputValue).trim();
    if (!text || isTyping) return;

    const userMsg: NovaAIMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputValue('');
    setIsTyping(true);

    try {
      const aiResponse = await askNovaAI(text, newHistory);
      setMessages((prev) => [...prev, aiResponse]);
    } catch (err) {
      console.error('Nova AI Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'Nova AI is temporarily unavailable. Please try again.',
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsTyping(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleResetChat = () => {
    setMessages([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
    inputRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-[#08090C] text-[#F8FAFC] pt-20 sm:pt-24 pb-12 flex flex-col relative selection:bg-[var(--nova-accent)]/20 selection:text-[var(--nova-accent)]">
      {/* Background Ambient Cosmic Mesh */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[var(--nova-accent)]/10 via-indigo-950/10 to-transparent blur-3xl opacity-70" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-900/10 blur-3xl rounded-full" />
      </div>

      <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 flex-1 flex flex-col relative z-10">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between pb-4 sm:pb-5 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              data-cursor="button"
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-400 hover:text-white transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[var(--nova-accent)]/20 to-[var(--nova-accent)]/40 border border-[var(--nova-accent)]/50 flex items-center justify-center shadow-lg shadow-[var(--nova-accent)]/10">
                <Sparkles className="w-5 h-5 text-[var(--nova-accent)] animate-pulse" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold font-display text-white flex items-center gap-2">
                  <span>Nova AI</span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-full bg-[var(--nova-accent)]/15 border border-[var(--nova-accent)]/30 text-[var(--nova-accent)]">
                    Intelligence
                  </span>
                </h1>
                <p className="text-[11px] text-zinc-400 font-mono">
                  Multilingual Cinema Guide • Context Aware
                </p>
              </div>
            </div>
          </div>

          {messages.length > 0 && (
            <button
              type="button"
              data-cursor="button"
              onClick={handleResetChat}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-400 hover:text-zinc-200 text-xs font-medium transition-colors"
              title="Reset conversation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Chat</span>
            </button>
          )}
        </div>

        {/* Chat Thread Container */}
        <div className="flex-1 py-6 flex flex-col justify-between">
          {/* Welcome Screen when no messages */}
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="my-auto py-8 text-center flex flex-col items-center max-w-xl mx-auto"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[var(--nova-accent)]/25 via-[var(--nova-accent)]/10 to-transparent border border-[var(--nova-accent)]/40 flex items-center justify-center mb-5 shadow-2xl shadow-[var(--nova-accent)]/15">
                <Sparkles className="w-8 h-8 text-[var(--nova-accent)]" />
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight">
                Hi, I'm Nova AI.
              </h2>
              <p className="text-lg sm:text-xl text-zinc-300 font-light mt-1">
                Tell me what you feel like watching.
              </p>
              <p className="text-xs sm:text-sm text-zinc-500 max-w-md mt-2 leading-relaxed">
                Chat naturally in English, Roman Urdu, Urdu, Hindi, Spanish, French, German, or Arabic.
                Ask for a specific mood, theme, or a comparison!
              </p>

              {/* Quick Prompts Grid */}
              <div className="mt-8 w-full">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3 text-center">
                  Quick Prompts
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {QUICK_PROMPTS.map((item) => {
                    const IconComp = item.icon;
                    return (
                      <button
                        key={item.label}
                        type="button"
                        data-cursor="button"
                        onClick={() => handleSend(item.prompt)}
                        className="group flex items-center gap-3 p-3.5 rounded-2xl bg-[#111319]/80 hover:bg-[#161922] border border-white/[0.08] hover:border-[var(--nova-accent)]/40 text-left transition-all duration-200 shadow-sm active:scale-98"
                      >
                        <div className="p-2 rounded-xl bg-white/[0.04] group-hover:bg-[var(--nova-accent)]/15 text-zinc-400 group-hover:text-[var(--nova-accent)] transition-colors">
                          <IconComp className="w-4 h-4" />
                        </div>
                        <span className="text-xs sm:text-sm font-medium text-zinc-200 group-hover:text-white">
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          ) : (
            /* Message Thread */
            <div className="space-y-6 pb-4">
              <AnimatePresence initial={false}>
                {messages.map((msg) => {
                  const isUser = msg.role === 'user';

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 12, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                      className={`flex gap-3 sm:gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      {/* Assistant Avatar */}
                      {!isUser && (
                        <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-tr from-[var(--nova-accent)]/30 to-[var(--nova-accent)]/10 border border-[var(--nova-accent)]/40 flex items-center justify-center mt-1 shadow-md shadow-[var(--nova-accent)]/5">
                          <Sparkles className="w-4 h-4 text-[var(--nova-accent)]" />
                        </div>
                      )}

                      {/* Bubble Content */}
                      <div
                        className={`max-w-[85%] sm:max-w-[78%] flex flex-col gap-3 ${
                          isUser ? 'items-end' : 'items-start'
                        }`}
                      >
                        <div
                          className={`px-4 sm:px-5 py-3 sm:py-3.5 rounded-2xl text-sm leading-relaxed ${
                            isUser
                              ? 'bg-gradient-to-r from-white/[0.12] to-white/[0.08] text-white border border-white/[0.15] rounded-tr-sm shadow-md'
                              : 'bg-[#111319]/90 border border-white/[0.08] text-zinc-200 rounded-tl-sm backdrop-blur-md shadow-glass'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.content}</p>

                          {/* Empty State Fallback Suggestions */}
                          {msg.isEmptyState && (
                            <div className="mt-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs space-y-2">
                              <p className="text-[var(--nova-accent)] font-medium flex items-center gap-1.5 text-xs">
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Try changing your genre, language or mood:</span>
                              </p>
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleSend('dark psychological thriller')}
                                  className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 text-[11px] transition-colors"
                                >
                                  Dark Psychological Thriller
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSend('Korean thriller with action')}
                                  className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 text-[11px] transition-colors"
                                >
                                  Korean Action Thriller
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSend('Recommend something like Interstellar')}
                                  className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 text-[11px] transition-colors"
                                >
                                  Like Interstellar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSend('Give me something under 2 hours')}
                                  className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 text-[11px] transition-colors"
                                >
                                  Under 2 Hours
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Recommendation Cards inside Assistant Response */}
                        {!isUser && msg.recommendations && msg.recommendations.length > 0 && (
                          <div className="w-full space-y-3 pt-1">
                            {msg.recommendations.map((rec) => (
                              <NovaRecommendationCard key={`rec-${msg.id}-${rec.id}`} item={rec} />
                            ))}
                          </div>
                        )}
                      </div>

                      {/* User Avatar */}
                      {isUser && (
                        <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-white/[0.08] border border-white/10 flex items-center justify-center mt-1 text-zinc-300">
                          <UserIcon className="w-4 h-4" />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Typing / Loading Animation: "Nova AI is finding something for you..." */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 justify-start"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-tr from-[var(--nova-accent)]/30 to-[var(--nova-accent)]/10 border border-[var(--nova-accent)]/40 flex items-center justify-center shadow-md">
                    <Sparkles className="w-4 h-4 text-[var(--nova-accent)] animate-pulse" />
                  </div>
                  <div className="px-4 py-3 rounded-2xl bg-[#111319]/90 border border-white/[0.08] rounded-tl-sm backdrop-blur-md shadow-glass flex items-center gap-2">
                    <span className="text-xs text-zinc-300 font-mono">
                      Nova AI is finding something for you...
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--nova-accent)] animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--nova-accent)] animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--nova-accent)] animate-bounce" />
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Pinned Input Bar */}
        <div className="sticky bottom-4 z-20 pt-2">
          {/* Quick Follow-up Chips when in active conversation */}
          {messages.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-1 scrollbar-none text-xs">
              <span className="text-[10px] uppercase font-mono text-zinc-500 whitespace-nowrap pl-1">
                Suggested:
              </span>
              <button
                type="button"
                onClick={() => handleSend('Which one is shortest?')}
                className="px-3 py-1 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] hover:border-[var(--nova-accent)]/40 text-zinc-300 text-xs whitespace-nowrap transition-colors"
              >
                Which one is shortest?
              </button>
              <button
                type="button"
                onClick={() => handleSend('Something less scary')}
                className="px-3 py-1 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] hover:border-[var(--nova-accent)]/40 text-zinc-300 text-xs whitespace-nowrap transition-colors"
              >
                Something less scary
              </button>
              <button
                type="button"
                onClick={() => handleSend('Give me something under 2 hours')}
                className="px-3 py-1 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] hover:border-[var(--nova-accent)]/40 text-zinc-300 text-xs whitespace-nowrap transition-colors"
              >
                Under 2 hours
              </button>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="relative flex items-center bg-[#111319]/90 backdrop-blur-xl border border-white/[0.12] focus-within:border-[var(--nova-accent)]/60 rounded-2xl shadow-2xl p-1.5 transition-all duration-200"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask Nova AI... (e.g. 'dark horror', 'mujhe koi achi horror movie btao')"
              className="flex-1 bg-transparent px-4 py-2.5 text-sm sm:text-base text-white placeholder-zinc-500 focus:outline-none"
              disabled={isTyping}
            />

            <button
              type="submit"
              disabled={!inputValue.trim() || isTyping}
              data-cursor="button"
              className="inline-flex items-center justify-center p-3 rounded-xl bg-gradient-to-r from-[var(--nova-accent)] to-[#f3b547] text-zinc-950 font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 active:scale-95 transition-all shadow-md shadow-[var(--nova-accent)]/20"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="flex items-center justify-between px-2 pt-1 text-[11px] text-zinc-500 font-mono">
            <span>Automatic language detection (English, Urdu, Roman Urdu, etc.)</span>
            <span className="hidden sm:inline">Press Enter to send</span>
          </div>
        </div>
      </div>
    </div>
  );
};
