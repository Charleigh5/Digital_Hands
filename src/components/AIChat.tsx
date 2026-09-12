import { useState, useEffect, useRef } from 'react';
import { generateCommandResponse, parseAIResponse, AICommand } from '../engine/ai-command-parser';
import { useSpeech } from '../hooks/useSpeech';

interface Message {
  id: number;
  role: 'user' | 'ai';
  content: string;
  commands?: AICommand[];
  timestamp: number;
}

interface AIChatProps {
  onExecuteCommand?: (command: AICommand) => void;
  onNavigate?: (view: string) => void;
}

export function AIChat({ onExecuteCommand, onNavigate }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: 'ai',
      content: "Hello! I'm your AI Director. I can:\n\n• **Create 3D objects** — Say \"create a cube\"\n• **Control objects** — Say \"throw all\" or \"clear\"\n• **Teach gestures** — Say \"teach me to pinch\"\n• **Create gestures** — Say \"create a wave gesture\"\n• **Navigate views** — Say \"show me 3D\"\n\n🎤 Click the mic to use voice, or type below!",
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    state: speechState,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    setOnTranscript,
    toggleVoice,
  } = useSpeech();

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle voice transcripts
  useEffect(() => {
    setOnTranscript((text: string) => {
      handleSend(text);
    });
  }, [setOnTranscript]);

  // Execute commands from AI response
  const executeCommands = async (commands: AICommand[]) => {
    for (const cmd of commands) {
      if (cmd.delay) {
        await new Promise(resolve => setTimeout(resolve, cmd.delay));
      }

      switch (cmd.type) {
        case 'speak':
          speak(cmd.params.text || '');
          break;
        case 'spawn_object':
        case 'clear_objects':
        case 'throw_objects':
        case 'reset_objects':
        case 'create_gesture':
        case 'start_tutorial':
        case 'highlight_area':
        case 'set_threshold':
          if (onExecuteCommand) {
            onExecuteCommand(cmd);
          }
          break;
        case 'navigate':
          if (onNavigate) {
            onNavigate(cmd.params.view || 'live');
          }
          break;
        default:
          console.log('[AI Director] Unhandled command:', cmd);
      }
    }
  };

  const handleSend = async (text?: string) => {
    const messageText = text || input;
    if (!messageText.trim() || isProcessing) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: messageText,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    // Generate AI response
    setTimeout(() => {
      const response = generateCommandResponse(messageText);
      
      const aiMessage: Message = {
        id: Date.now() + 1,
        role: 'ai',
        content: response.text,
        commands: response.commands,
        timestamp: Date.now(),
      };
      
      setMessages(prev => [...prev, aiMessage]);
      setIsProcessing(false);

      // Execute commands
      if (response.commands.length > 0) {
        executeCommands(response.commands);
      }
    }, 500 + Math.random() * 500);
  };

  const quickActions = [
    { label: '🎲 Create Objects', text: 'Create some objects' },
    { label: '🚀 Throw All', text: 'Throw all objects' },
    { label: '🧹 Clear', text: 'Clear all objects' },
    { label: '🤏 Teach Pinch', text: 'Teach me to pinch' },
    { label: '⬡ Teach 3D', text: 'Teach me 3D objects' },
    { label: '✋ Create Gesture', text: 'Help me create a custom gesture' },
  ];

  return (
    <div className="glass-panel h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b flex items-center justify-between"
        style={{ borderColor: 'rgba(140, 240, 225, 0.2)' }}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold tracking-wider" style={{ color: 'var(--text-primary)' }}>
            ◈ AI DIRECTOR
          </span>
          <span className="text-[9px] px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(111, 229, 214, 0.15)', color: 'var(--accent)' }}>
            SOTA Model
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Voice toggle */}
          <button
            onClick={toggleVoice}
            className="text-[9px] px-2 py-0.5 rounded cursor-pointer"
            style={{
              background: speechState.voiceEnabled ? 'rgba(111, 229, 214, 0.2)' : 'rgba(140, 240, 225, 0.05)',
              border: `1px solid ${speechState.voiceEnabled ? 'var(--accent)' : 'rgba(140, 240, 225, 0.2)'}`,
              color: speechState.voiceEnabled ? 'var(--accent)' : 'var(--text-secondary)',
            }}
            title={speechState.voiceEnabled ? 'Voice output ON' : 'Voice output OFF'}
          >
            🔊 {speechState.voiceEnabled ? 'ON' : 'OFF'}
          </button>
          
          {/* Mic button */}
          {speechState.isSupported && (
            <button
              onClick={speechState.isListening ? stopListening : startListening}
              className={`text-[9px] px-2 py-0.5 rounded cursor-pointer ${speechState.isListening ? 'animate-pulse' : ''}`}
              style={{
                background: speechState.isListening ? 'rgba(255, 107, 107, 0.2)' : 'rgba(140, 240, 225, 0.1)',
                border: `1px solid ${speechState.isListening ? 'var(--danger)' : 'rgba(140, 240, 225, 0.3)'}`,
                color: speechState.isListening ? 'var(--danger)' : 'var(--text-secondary)',
              }}
            >
              🎤 {speechState.isListening ? 'Listening...' : 'Voice'}
            </button>
          )}
        </div>
      </div>

      {/* Voice status bar */}
      {(speechState.isListening || speechState.isSpeaking) && (
        <div className="px-3 py-1.5 border-b flex items-center gap-2"
          style={{ 
            borderColor: 'rgba(140, 240, 225, 0.2)',
            background: speechState.isListening ? 'rgba(255, 107, 107, 0.05)' : 'rgba(111, 229, 214, 0.05)',
          }}>
          <span className={`status-dot ${speechState.isListening ? 'live' : 'live'}`}
            style={{ background: speechState.isListening ? 'var(--danger)' : 'var(--accent)' }}></span>
          <span className="text-[9px]" style={{ color: 'var(--text-secondary)' }}>
            {speechState.isListening && (
              <>
                {speechState.interimTranscript || 'Listening...'}
              </>
            )}
            {speechState.isSpeaking && '🔊 Speaking...'}
          </span>
          {speechState.isSpeaking && (
            <button
              onClick={stopSpeaking}
              className="ml-auto text-[9px] px-1.5 py-0.5 rounded cursor-pointer"
              style={{
                background: 'rgba(255, 107, 107, 0.2)',
                border: '1px solid rgba(255, 107, 107, 0.4)',
                color: 'var(--danger)',
              }}
            >
              Stop
            </button>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] p-2.5 rounded-lg ${
                msg.role === 'user' ? 'chat-message user' : 'chat-message ai'
              }`}
            >
              <div className="text-[11px] whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                {msg.content}
              </div>
              
              {/* Command indicators */}
              {msg.commands && msg.commands.length > 0 && (
                <div className="mt-2 pt-2 flex flex-wrap gap-1" style={{ borderTop: '1px solid rgba(140, 240, 225, 0.15)' }}>
                  {msg.commands.map((cmd, i) => (
                    <span
                      key={i}
                      className="text-[8px] px-1.5 py-0.5 rounded"
                      style={{
                        background: 'rgba(111, 229, 214, 0.1)',
                        border: '1px solid rgba(111, 229, 214, 0.3)',
                        color: 'var(--accent)',
                      }}
                    >
                      {cmd.description}
                    </span>
                  ))}
                </div>
              )}
              
              <div className="text-[8px] mt-1 opacity-50" style={{ color: 'var(--text-secondary)' }}>
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="flex justify-start">
            <div className="chat-message ai">
              <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                <span className="animate-pulse">◈</span>
                <span className="text-[11px]">AI Director is thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="px-3 py-1.5 flex gap-1 flex-wrap border-t"
        style={{ borderColor: 'rgba(140, 240, 225, 0.1)' }}>
        {quickActions.map(action => (
          <button
            key={action.label}
            onClick={() => handleSend(action.text)}
            disabled={isProcessing}
            className="text-[9px] px-2 py-0.5 rounded cursor-pointer disabled:opacity-30"
            style={{
              background: 'rgba(140, 240, 225, 0.08)',
              border: '1px solid rgba(140, 240, 225, 0.2)',
              color: 'var(--text-secondary)',
            }}
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="p-3 border-t" style={{ borderColor: 'rgba(140, 240, 225, 0.2)' }}>
        <div className="flex gap-2">
          <input
            type="text"
            className="chat-input flex-1"
            placeholder="Ask AI to create, teach, or control..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={isProcessing}
          />
          <button
            onClick={() => handleSend()}
            disabled={isProcessing || !input.trim()}
            className="px-3 py-2 rounded-lg text-xs font-bold cursor-pointer disabled:opacity-30"
            style={{
              background: 'rgba(111, 229, 214, 0.2)',
              border: '1px solid var(--accent)',
              color: 'var(--accent)',
            }}
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}
