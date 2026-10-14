import React, { useState, useRef, useEffect } from 'react';
import { 
  Wind, 
  Play, 
  Pause, 
  RotateCcw, 
  MessageCircle, 
  X, 
  Send, 
  Sparkles, 
  Volume2, 
  Image as ImageIcon,
  Clock,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type MeditationSession = {
  title: string;
  script: string;
  imagePrompt: string;
  backgroundDescription: string;
  imageUrl?: string;
  audioUrl?: string;
};

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export default function App() {
  const [view, setView] = useState<'home' | 'player' | 'chat'>('home');
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState('5');
  const [mood, setMood] = useState('Calm');
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [isGenerating, setIsGenerating] = useState(false);
  const [session, setSession] = useState<MeditationSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Auto-scroll chat
  const chatEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      // 1. Generate Script
      const scriptRes = await fetch('/api/meditation/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, duration, mood }),
      });
      const scriptData = await scriptRes.json();
      
      // 2. Generate Image & Audio in parallel
      const [imageRes, audioRes] = await Promise.all([
        fetch('/api/meditation/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: scriptData.imagePrompt, size: imageSize }),
        }),
        fetch('/api/meditation/audio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: scriptData.script }),
        })
      ]);

      const imageData = await imageRes.json();
      const audioData = await audioRes.json();

      const newSession: MeditationSession = {
        ...scriptData,
        imageUrl: imageData.imageUrl,
        audioUrl: `data:audio/wav;base64,${audioData.audio}`,
      };

      setSession(newSession);
      setView('player');
    } catch (error) {
      console.error('Generation failed:', error);
      alert('Something went wrong during generation. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const userMsg: ChatMessage = { role: 'user', content: chatInput };
    setMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [...messages, userMsg],
          complexity: chatInput.length > 100 ? 'complex' : 'general'
        }),
      });
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
    } catch (error) {
      console.error('Chat failed:', error);
    } finally {
      setIsChatLoading(false);
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-teal-500/30 overflow-hidden relative">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(20,40,60,1)_0%,rgba(2,6,12,1)_100%)] pointer-events-none" />
      
      <main className="relative z-10 h-screen flex flex-col">
        {/* Header */}
        <header className="p-6 flex justify-between items-center bg-slate-900/40 backdrop-blur-md border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Wind className="text-white" size={24} />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">ZenSpace</h1>
          </div>
          <button 
            onClick={() => setView('chat')}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors"
          >
            <MessageCircle size={18} />
            <span>Ask Coach</span>
          </button>
        </header>

        {/* Content Area */}
        <div className="flex-1 relative overflow-hidden">
          <AnimatePresence mode="wait">
            {view === 'home' && (
              <motion.div 
                key="home"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-2xl mx-auto mt-12 p-8 bg-slate-900/60 rounded-3xl border border-white/10 backdrop-blur-xl shadow-2xl"
              >
                <div className="text-center mb-10">
                  <h2 className="text-3xl font-bold mb-2">Create Your Session</h2>
                  <p className="text-slate-400">Tailor your mindfulness journey with AI</p>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Focus Topic</label>
                    <input 
                      type="text" 
                      placeholder="e.g., Anxiety relief, Gratitude, Deep Sleep"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Duration (min)</label>
                      <select 
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                      >
                        <option value="1">1 minute</option>
                        <option value="5">5 minutes</option>
                        <option value="10">10 minutes</option>
                        <option value="20">20 minutes</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Mood</label>
                      <select 
                        value={mood}
                        onChange={(e) => setMood(e.target.value)}
                        className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                      >
                        <option value="Calm">Calm</option>
                        <option value="Energizing">Energizing</option>
                        <option value="Grounding">Grounding</option>
                        <option value="Spiritual">Spiritual</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Visual Quality</label>
                    <div className="flex gap-4">
                      {['1K', '2K', '4K'].map((size) => (
                        <button
                          key={size}
                          onClick={() => setImageSize(size as any)}
                          className={`flex-1 py-2 rounded-lg border transition-all ${
                            imageSize === size 
                              ? 'bg-teal-500/20 border-teal-500 text-teal-400' 
                              : 'bg-slate-800/50 border-white/10 text-slate-400 hover:border-white/20'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button 
                    onClick={handleGenerate}
                    disabled={isGenerating || !topic}
                    className="w-full py-4 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 disabled:hover:bg-teal-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-teal-500/20 transition-all transform active:scale-[0.98]"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="animate-spin" />
                        Creating your sanctuary...
                      </>
                    ) : (
                      <>
                        <Sparkles size={20} />
                        Generate Meditation
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {view === 'player' && session && (
              <motion.div 
                key="player"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"
              >
                {/* Immersive Background */}
                <div className="absolute inset-0 z-0">
                  <img 
                    src={session.imageUrl} 
                    alt={session.backgroundDescription} 
                    className="w-full h-full object-cover opacity-60"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/50" />
                </div>

                <div className="relative z-10 max-w-2xl space-y-8">
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <h2 className="text-4xl font-bold mb-4">{session.title}</h2>
                    <p className="text-slate-300 text-lg leading-relaxed line-clamp-4 italic">
                      "{session.script.slice(0, 200)}..."
                    </p>
                  </motion.div>

                  <div className="flex items-center justify-center gap-8">
                    <button 
                      onClick={() => {
                        if (audioRef.current) audioRef.current.currentTime = 0;
                        setIsPlaying(true);
                        audioRef.current?.play();
                      }}
                      className="p-4 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                    >
                      <RotateCcw size={24} />
                    </button>
                    
                    <button 
                      onClick={togglePlay}
                      className="w-24 h-24 bg-teal-500 hover:bg-teal-400 rounded-full flex items-center justify-center shadow-2xl shadow-teal-500/40 transition-all transform hover:scale-105 active:scale-95"
                    >
                      {isPlaying ? <Pause size={40} fill="white" /> : <Play size={40} fill="white" className="ml-2" />}
                    </button>

                    <button 
                      onClick={() => setView('home')}
                      className="p-4 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  <audio 
                    ref={audioRef} 
                    src={session.audioUrl} 
                    onEnded={() => setIsPlaying(false)}
                    className="hidden"
                  />
                </div>
              </motion.div>
            )}

            {view === 'chat' && (
              <motion.div 
                key="chat"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                className="absolute inset-0 bg-slate-900 flex flex-col"
              >
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <h3 className="font-semibold">Zen Coach</h3>
                      <p className="text-xs text-slate-400">Available for guidance</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setView('home')}
                    className="p-2 hover:bg-white/5 rounded-full transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {messages.length === 0 && (
                    <div className="text-center mt-20 text-slate-500">
                      <Wind className="mx-auto mb-4 opacity-20" size={48} />
                      <p>How can I help you find peace today?</p>
                    </div>
                  )}
                  {messages.map((msg, i) => (
                    <div 
                      key={i} 
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] p-4 rounded-2xl ${
                        msg.role === 'user' 
                          ? 'bg-teal-500 text-white rounded-tr-none' 
                          : 'bg-white/5 text-slate-200 rounded-tl-none'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {isChatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white/5 p-4 rounded-2xl animate-pulse">
                        Thinking...
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="p-6 bg-slate-900 border-t border-white/5">
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Ask anything about meditation..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      className="w-full bg-slate-800 border border-white/10 rounded-2xl px-6 py-4 pr-16 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                    />
                    <button 
                      onClick={handleSendMessage}
                      disabled={!chatInput.trim() || isChatLoading}
                      className="absolute right-3 top-3 p-2 bg-teal-500 hover:bg-teal-400 rounded-xl transition-all disabled:opacity-50"
                    >
                      <Send size={20} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
