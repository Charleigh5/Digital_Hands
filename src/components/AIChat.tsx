import { useState } from 'react';

interface Message {
  id: number;
  role: 'user' | 'ai';
  content: string;
  timestamp: number;
}

export function AIChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: 'ai',
      content: 'Hello! I\'m your AI assistant for gesture development. I can help you:\n\n• Debug gesture recognition issues\n• Optimize threshold values\n• Explain gesture detection algorithms\n• Suggest improvements\n\nWhat would you like to know?',
      timestamp: Date.now(),
    },
  ]);
  
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: Date.now() + 1,
        role: 'ai',
        content: generateResponse(input),
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const generateResponse = (question: string): string => {
    const lowerQ = question.toLowerCase();
    
    if (lowerQ.includes('pinch') || lowerQ.includes('threshold')) {
      return 'For pinch detection, the key threshold is the ratio between thumb-index distance and palm width. Typical values:\n\n• Enter threshold: 0.32 (frontal) / 0.38 (profile)\n• Exit threshold: 0.55\n• EMA smoothing: 0.30\n\nLower values = easier to trigger, higher = more deliberate. Start with defaults and adjust based on your hand size.';
    }
    
    if (lowerQ.includes('false') || lowerQ.includes('trigger')) {
      return 'False triggers usually happen because:\n\n1. **Threshold too sensitive** - Increase enter threshold by 0.02-0.05\n2. **No hysteresis** - Use different enter/exit thresholds (15% gap)\n3. **Hand tremor** - Increase EMA smoothing to 0.4-0.5\n4. **Fast movements** - Enable birth-speed guard\n\nTry the state machine system I implemented - it handles all of these automatically!';
    }
    
    if (lowerQ.includes('latency') || lowerQ.includes('slow') || lowerQ.includes('fast')) {
      return 'To reduce gesture latency:\n\n1. **Enable prediction** - The predictive system triggers 50-100ms early\n2. **Lower thresholds** - Makes gestures trigger sooner\n3. **Reduce smoothing** - Lower EMA rate (but may increase jitter)\n4. **Optimize detection** - Use cached calculations\n\nThe predictive gesture detector I added should already give you much better responsiveness!';
    }
    
    if (lowerQ.includes('help') || lowerQ.includes('what can')) {
      return 'I can help with:\n\n• **Gesture tuning** - Optimize thresholds for your hands\n• **Debugging** - Find why gestures aren\'t working\n• **Performance** - Improve speed and accuracy\n• **Explanation** - Understand how detection works\n• **Suggestions** - Get ideas for new gestures\n\nJust ask me anything about gesture development!';
    }
    
    return 'That\'s an interesting question! Based on the gesture engine architecture, I\'d recommend:\n\n1. Check the confidence visualizer to see what\'s happening\n2. Review the state machine phases\n3. Try the adaptive calibration (first 3 seconds)\n4. Adjust thresholds in the panel below\n\nWould you like me to explain any specific part in more detail?';
  };

  return (
    <div className="glass-panel h-full flex flex-col overflow-hidden">
      <div className="px-3 py-2 border-b flex items-center justify-between"
        style={{ borderColor: 'rgba(140, 240, 225, 0.2)' }}>
        <span className="text-xs font-bold tracking-wider" style={{ color: 'var(--text-primary)' }}>
          AI BRIDGE
        </span>
        <span className="text-[9px] px-1.5 py-0.5 rounded"
          style={{ background: 'rgba(111, 229, 214, 0.15)', color: 'var(--accent)' }}>
          ◈ SOTA Model
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-2.5 rounded-lg ${
                msg.role === 'user' ? 'chat-message user' : 'chat-message ai'
              }`}
            >
              <div className="text-[11px] whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
                {msg.content}
              </div>
              <div className="text-[8px] mt-1 opacity-50" style={{ color: 'var(--text-secondary)' }}>
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="chat-message ai">
              <div className="flex items-center gap-1">
                <span className="animate-pulse">◈</span>
                <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                  AI is thinking...
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t" style={{ borderColor: 'rgba(140, 240, 225, 0.2)' }}>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about gestures, thresholds, or debugging..."
            className="chat-input flex-1"
            disabled={isTyping}
          />
          <button
            onClick={handleSend}
            disabled={isTyping || !input.trim()}
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
