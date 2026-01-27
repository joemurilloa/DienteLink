
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { cn } from '../lib/utils';

const AIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: 'Hola Dr. Smith. Soy su asistente MedPulse AI. ¿En qué puedo ayudarle hoy con sus pacientes o consultas clínicas?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: userMessage,
        config: {
          systemInstruction: 'Eres un asistente médico experto de la plataforma MedPulse. Ayudas a doctores a resumir casos clínicos, verificar interacciones medicamentosas y proporcionar información médica basada en evidencia de forma concisa. Siempre recuerda que tus respuestas deben ser validadas por el profesional de la salud.',
        },
      });

      const aiText = response.text || 'Lo siento, no pude procesar esa consulta. Inténtelo de nuevo.';
      setMessages(prev => [...prev, { role: 'assistant', content: aiText }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Hubo un error al conectar con el motor de IA.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-blue-600 text-white">
        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">✨</div>
        <div>
          <h3 className="font-bold text-sm">MedPulse AI Assistant</h3>
          <p className="text-[10px] opacity-80">Powered by Gemini 3 Flash</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 hide-scrollbar bg-slate-50/50">
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[85%] p-3 rounded-2xl text-sm",
              msg.role === 'user' 
                ? "bg-blue-600 text-white rounded-tr-none" 
                : "bg-white border border-slate-100 text-slate-800 shadow-sm rounded-tl-none"
            )}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-100 p-3 rounded-2xl rounded-tl-none shadow-sm flex gap-1">
              <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-white border-t border-slate-100">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Consulte sobre diagnósticos o medicamentos..."
            className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
          />
          <button 
            onClick={handleSend}
            disabled={loading}
            className="absolute right-2 w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
