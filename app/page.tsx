'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { Mic, Send, Calendar as CalIcon, LogOut, Loader2 } from 'lucide-react';

interface Log {
  sender: 'user' | 'agent';
  text: string;
  data?: any;
}

export default function Home() {
  const { data: session, status } = useSession();
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [logs, setLogs] = useState<Log[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Ref for Speech Recognition
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize Web Speech API
    if (typeof window !== 'undefined' && (window as any).webkitSpeechRecognition) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        handleSend(transcript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleMic = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setIsListening(true);
      recognitionRef.current?.start();
    }
  };

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim()) return;

    // Add User Message
    const userLog: Log = { sender: 'user', text: textToSend };
    setLogs(prev => [...prev, userLog]);
    setInput('');
    setIsProcessing(true);

    try {
      const res = await fetch('/api/process-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: textToSend,
          userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone 
        }),
      });

      const data = await res.json();
      
      // Add Agent Response
      const agentLog: Log = { 
        sender: 'agent', 
        text: data.message,
        data: data.data
      };
      setLogs(prev => [...prev, agentLog]);

    } catch (e) {
      setLogs(prev => [...prev, { sender: 'agent', text: "Sorry, something went wrong processing that." }]);
    } finally {
      setIsProcessing(false);
    }
  };

  if (status === 'loading') {
    return <div className="h-screen w-full flex items-center justify-center bg-black text-white"><Loader2 className="animate-spin h-8 w-8"/></div>;
  }

  if (!session) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-black text-white p-6 space-y-6">
        <div className="w-24 h-24 bg-zinc-900 rounded-3xl flex items-center justify-center border border-zinc-800">
          <CalIcon className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-3xl font-bold tracking-tighter">Calendar Agent</h1>
        <p className="text-zinc-400 text-center max-w-sm">
          A voice-first assistant to manage your Google Calendar and Tasks.
        </p>
        <button 
          onClick={() => signIn('google')}
          className="bg-white text-black px-8 py-3 rounded-full font-semibold hover:bg-zinc-200 transition-colors"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-black text-white max-w-md mx-auto relative">
      {/* Header */}
      <header className="p-4 flex justify-between items-center border-b border-zinc-800 sticky top-0 bg-black/80 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center font-bold text-xs">AI</div>
           <span className="font-semibold">Agent</span>
        </div>
        <button onClick={() => signOut()} className="p-2 text-zinc-500 hover:text-white">
          <LogOut size={20} />
        </button>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
        {logs.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-2 opacity-50">
            <p>Try saying...</p>
            <p className="text-sm">"Meeting with John tomorrow at 2pm"</p>
            <p className="text-sm">"Remind me to buy milk"</p>
            <p className="text-sm">"What do I have today?"</p>
          </div>
        )}
        
        {logs.map((log, i) => (
          <div key={i} className={`flex ${log.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
              log.sender === 'user' 
                ? 'bg-zinc-800 text-white rounded-br-none' 
                : 'bg-blue-600/20 text-blue-100 border border-blue-500/30 rounded-bl-none'
            }`}>
              {log.text}
              {log.data && Array.isArray(log.data) && (
                <div className="mt-3 space-y-2 border-t border-white/10 pt-2">
                  {log.data.map((evt: any, idx: number) => (
                    <div key={idx} className="bg-black/20 p-2 rounded text-xs">
                      <div className="font-bold text-blue-200">{evt.summary}</div>
                      <div className="opacity-70">
                        {new Date(evt.start.dateTime || evt.start.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {isProcessing && (
           <div className="flex justify-start">
             <div className="bg-transparent p-3 text-zinc-500 flex items-center gap-2">
               <Loader2 className="animate-spin h-4 w-4" /> Thinking...
             </div>
           </div>
        )}
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black via-black to-transparent">
        <div className="flex flex-col items-center gap-4">
          
          {/* Main Mic Button */}
          <button 
            onClick={toggleMic}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg shadow-blue-900/20 ${
              isListening 
                ? 'bg-red-500 scale-110 animate-pulse' 
                : 'bg-white text-black hover:scale-105'
            }`}
          >
            <Mic className={isListening ? "animate-bounce" : ""} size={28} />
          </button>

          {/* Text Input Fallback */}
          <div className="w-full relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Or type here..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-full py-3 px-5 pr-12 focus:outline-none focus:border-zinc-600 text-sm"
            />
            <button 
              onClick={() => handleSend()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-zinc-800 rounded-full text-zinc-400 hover:text-white"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}