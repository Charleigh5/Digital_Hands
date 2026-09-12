import { useState, useEffect } from 'react';

interface Card {
  id: number;
  x: number;
  y: number;
  title: string;
  color: string;
}

export function LivePreview() {
  const [cards, setCards] = useState<Card[]>([
    { id: 1, x: 50, y: 80, title: 'Card A', color: 'rgba(140, 240, 225, 0.3)' },
    { id: 2, x: 180, y: 120, title: 'Card B', color: 'rgba(111, 229, 214, 0.3)' },
    { id: 3, x: 120, y: 200, title: 'Card C', color: 'rgba(180, 140, 255, 0.3)' },
  ]);
  
  const [cursorPos, setCursorPos] = useState({ x: 200, y: 150 });
  const [isPinching, setIsPinching] = useState(false);

  useEffect(() => {
    // Simulate cursor movement
    const interval = setInterval(() => {
      setCursorPos(prev => ({
        x: prev.x + (Math.random() - 0.5) * 20,
        y: prev.y + (Math.random() - 0.5) * 20,
      }));
      
      // Randomly toggle pinch
      if (Math.random() > 0.95) {
        setIsPinching(prev => !prev);
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, []);

  const handleCardClick = (cardId: number) => {
    if (isPinching) {
      setCards(prev => prev.filter(c => c.id !== cardId));
    }
  };

  return (
    <div className="glass-panel h-full flex flex-col overflow-hidden">
      <div className="px-3 py-2 border-b flex items-center justify-between"
        style={{ borderColor: 'rgba(140, 240, 225, 0.2)' }}>
        <span className="text-xs font-bold tracking-wider" style={{ color: 'var(--text-primary)' }}>
          STAGE PREVIEW
        </span>
        <div className="flex items-center gap-2">
          <span className="status-dot live"></span>
          <span className="text-[9px]" style={{ color: 'var(--text-secondary)' }}>
            {cards.length} cards
          </span>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden" style={{ background: 'rgba(2, 15, 12, 0.5)' }}>
        {/* Grid background */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(rgba(140, 240, 225, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(140, 240, 225, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px',
          }}
        />

        {/* Cards */}
        {cards.map(card => (
          <div
            key={card.id}
            onClick={() => handleCardClick(card.id)}
            className="absolute cursor-pointer transition-all hover:scale-105"
            style={{
              left: `${card.x}px`,
              top: `${card.y}px`,
              width: '100px',
              height: '70px',
              background: card.color,
              border: '1px solid rgba(140, 240, 225, 0.5)',
              borderRadius: '8px',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            }}
          >
            <span className="text-[11px] font-bold" style={{ color: 'var(--text-primary)' }}>
              {card.title}
            </span>
          </div>
        ))}

        {/* Cursor */}
        <div
          className="absolute pointer-events-none transition-all duration-100"
          style={{
            left: `${cursorPos.x}px`,
            top: `${cursorPos.y}px`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div
            className="rounded-full"
            style={{
              width: isPinching ? '12px' : '20px',
              height: isPinching ? '12px' : '20px',
              background: isPinching ? 'var(--accent)' : 'transparent',
              border: `2px solid ${isPinching ? 'var(--accent)' : 'var(--text-secondary)'}`,
              boxShadow: isPinching ? '0 0 15px var(--accent)' : 'none',
              transition: 'all 0.15s ease',
            }}
          />
        </div>

        {/* Instructions */}
        <div
          className="absolute bottom-3 left-3 right-3 p-2 rounded"
          style={{
            background: 'rgba(2, 15, 12, 0.8)',
            border: '1px solid rgba(140, 240, 225, 0.2)',
          }}
        >
          <div className="text-[9px]" style={{ color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Simulated Stage:</strong> Cards respond to pinch gestures.
            Pinch to select and remove cards.
          </div>
        </div>
      </div>

      <div className="px-3 py-2 border-t flex items-center justify-between"
        style={{ borderColor: 'rgba(140, 240, 225, 0.2)' }}>
        <span className="text-[9px]" style={{ color: 'var(--text-secondary)' }}>
          Gesture: PINCH-TAP → Remove Card
        </span>
        <button
          onClick={() => setCards([
            { id: Date.now(), x: 50, y: 80, title: 'Card A', color: 'rgba(140, 240, 225, 0.3)' },
            { id: Date.now() + 1, x: 180, y: 120, title: 'Card B', color: 'rgba(111, 229, 214, 0.3)' },
            { id: Date.now() + 2, x: 120, y: 200, title: 'Card C', color: 'rgba(180, 140, 255, 0.3)' },
          ])}
          className="text-[9px] px-2 py-1 rounded cursor-pointer"
          style={{
            background: 'rgba(140, 240, 225, 0.1)',
            border: '1px solid rgba(140, 240, 225, 0.2)',
            color: 'var(--text-secondary)',
          }}
        >
          ↻ Reset
        </button>
      </div>
    </div>
  );
}
