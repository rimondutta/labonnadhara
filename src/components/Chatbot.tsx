'use client';

import { useChat } from '@ai-sdk/react';
import { isTextUIPart } from 'ai';
import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader2, Sparkles, Paperclip, Globe, Mic, MoreHorizontal, Edit, Maximize2, ChevronDown, ArrowUp, PanelRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { m, AnimatePresence } from 'framer-motion';
import * as LottieLib from 'lottie-react';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Lottie = (LottieLib as any).Lottie as any;
import aiAnimation from '../../public/lottie/ai.json';

if (typeof console !== 'undefined') {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (typeof args[0] === 'string' && (
      args[0].includes('[lottie-react] this animation starts by itself') ||
      args[0].includes('non-static position')
    )) return;
    originalWarn(...args);
  };
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const { messages, sendMessage, status } = useChat();
  const isLoading = status === 'streaming' || status === 'submitted';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput('');
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  return (
    <>
      {/* Chat Bubble Button */}
      <AnimatePresence>
        {!isOpen && (
          <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[1000] flex items-center gap-2">
            {/* Left label - hidden on mobile */}
            <m.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="hidden sm:block bg-white/20 backdrop-blur-lg border border-white/40 text-slate-800 text-sm font-semibold px-4 py-2 rounded-full shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] whitespace-nowrap"
            >
              Chat with AI
            </m.div>

            {/* Lottie button */}
            <m.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsOpen(true)}
              className="relative w-28 h-28 sm:w-28 sm:h-28 rounded-full focus:outline-none flex items-center justify-center"
              aria-label="Open chat"
            >
              <Lottie
                src={aiAnimation}
                loop
                autoplay
                style={{ width: 150, height: 150 }}
                className="sm:hidden"
              />
              <Lottie
                src={aiAnimation}
                loop
                autoplay
                style={{ width: 140, height: 140 }}
                className="hidden sm:block"
              />
            </m.button>
          </div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <m.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 z-[1000] sm:w-[450px] sm:h-[600px] sm:max-h-[85vh] flex flex-col bg-white sm:rounded-[32px] shadow-2xl border border-slate-200 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-white text-slate-700">
              <div className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 px-2 py-1 rounded-lg transition-colors">
                <Lottie
                  src={aiAnimation}
                  loop
                  autoplay
                  style={{ width: 18, height: 18 }}
                />
                <span className="font-semibold text-sm">Powerd by Rimon Dutta</span>
                <ChevronDown size={16} className="text-slate-400" />
              </div>

              <div className="flex items-center gap-3 text-slate-400">
                <button
                  onClick={() => setIsOpen(false)}
                  className="hover:text-slate-700 hover:bg-slate-100 p-1 rounded-full transition-colors"
                  aria-label="Close chat"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="h-[1px] w-full bg-slate-100" />

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 bg-white scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-60">
                  <Lottie
                    src={aiAnimation}
                    loop
                    autoplay
                    style={{ width: 64, height: 64 }}
                  />
                  <p className="text-sm text-slate-500 max-w-[250px]">
                    Hi! Ask me anything about our jewelry, stock, or prices.
                  </p>
                </div>
              )}

              {messages.map((m: any) => {
                // Extract text from parts (AI SDK v7 UIMessage format)
                const textContent: string =
                  m.parts
                    ? m.parts.filter(isTextUIPart).map((p: any) => p.text).join('')
                    : (m.content || '');
                return (
                  <div
                    key={m.id}
                    className={`flex gap-3 w-full ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {m.role !== 'user' && (
                      <div className="flex-shrink-0 mt-1 flex items-center justify-center w-6 h-6">
                        <Lottie
                          src={aiAnimation}
                          loop
                          autoplay
                          style={{ width: 32, height: 32 }}
                        />
                      </div>
                    )}

                    {/* Handle tool calls visually */}
                    {m.toolInvocations && m.toolInvocations.length > 0 ? (
                      <div className="flex flex-col gap-2 w-full">
                        {m.toolInvocations.map((tool: any) => (
                          <div key={tool.toolCallId} className="bg-slate-200 text-slate-600 text-xs px-3 py-2 rounded-lg inline-flex items-center gap-2 animate-pulse">
                            <Loader2 size={12} className="animate-spin" />
                            Searching catalog for &quot;{tool.args.query}&quot;...
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {/* Standard text message */}
                    {textContent && (
                      <div
                        className={`${m.role === 'user'
                          ? 'bg-slate-100 text-slate-800 px-5 py-3 rounded-[24px] max-w-[85%]'
                          : 'bg-transparent text-slate-800 py-0.5 w-full'
                          }`}
                      >
                        <div className={`prose prose-sm prose-slate max-w-none break-words [&>p]:last:mb-0 [&>p]:first:mt-0 ${m.role === 'user' ? '' : 'prose-p:leading-relaxed'}`}>
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {textContent}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Typing indicator */}
              {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
                <div className="flex gap-3 justify-start w-full">
                  <div className="flex-shrink-0 mt-1 flex items-center justify-center w-6 h-6">
                    <Lottie
                      src={aiAnimation}
                      loop
                      autoplay
                      style={{ width: 32, height: 32 }}
                    />
                  </div>
                  <div className="py-1 flex items-center gap-1 h-6">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white">
              <form
                onSubmit={handleSubmit}
                className="flex flex-col gap-2 bg-blue-50/30 border border-blue-100 rounded-[24px] focus-within:ring-1 focus-within:ring-blue-200 transition-all shadow-[0_2px_12px_rgba(0,0,0,0.03)]"
              >
                <div className="flex items-center px-4 pt-3 pb-1">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={handleInputChange}
                    placeholder="Ask AI anything"
                    className="flex-1 bg-transparent text-sm text-slate-800 focus:outline-none placeholder:text-slate-400"
                    disabled={isLoading}
                  />
                </div>

                <div className="flex items-center justify-between px-3 pb-2 pt-1">
                  {/* Left icons & badge */}
                  <div className="flex items-center gap-3 text-slate-400">
                    <button type="button" className="p-1.5 hover:bg-slate-100 rounded-full transition-colors">
                      <Paperclip size={18} />
                    </button>
                    <button type="button" className="p-1 hover:bg-slate-100 rounded-full transition-colors flex items-center justify-center">
                      <Lottie
                        src={aiAnimation}
                        loop
                        autoplay
                        style={{ width: 18, height: 18 }}
                      />
                    </button>
                    <button type="button" className="p-1 hover:bg-slate-100 rounded-full transition-colors hidden sm:block">
                      <Globe size={16} />
                    </button>
                    <button type="button" className="p-1 hover:bg-slate-100 rounded-full transition-colors hidden sm:block">
                      <MoreHorizontal size={16} />
                    </button>
                  </div>

                  {/* Right actions */}
                  <div className="flex items-center gap-2">
                    <button type="button" className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                      <Mic size={18} />
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading || !input.trim()}
                      className="p-2 bg-blue-500 text-white rounded-full shadow-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
                      aria-label="Send message"
                    >
                      <ArrowUp size={16} />
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}
