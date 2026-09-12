// useSpeech.ts — Voice input/output for real-time AI interaction
import { useState, useEffect, useRef, useCallback } from 'react';

export interface SpeechState {
  isListening: boolean;
  isSpeaking: boolean;
  transcript: string;
  interimTranscript: string;
  isSupported: boolean;
  voiceEnabled: boolean;
}

export function useSpeech() {
  const [state, setState] = useState<SpeechState>({
    isListening: false,
    isSpeaking: false,
    transcript: '',
    interimTranscript: '',
    isSupported: false,
    voiceEnabled: true,
  });

  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const onTranscriptRef = useRef<((text: string) => void) | null>(null);

  useEffect(() => {
    // Check support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const isSupported = !!SpeechRecognition && !!window.speechSynthesis;

    setState(prev => ({ ...prev, isSupported }));

    if (isSupported) {
      // Initialize recognition
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }

        setState(prev => ({
          ...prev,
          interimTranscript: interim,
          transcript: final || prev.transcript,
        }));

        if (final && onTranscriptRef.current) {
          onTranscriptRef.current(final);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('[Speech] Recognition error:', event.error);
        if (event.error !== 'no-speech') {
          setState(prev => ({ ...prev, isListening: false }));
        }
      };

      recognition.onend = () => {
        // Auto-restart if we're supposed to be listening
        if (state.isListening) {
          try {
            recognition.start();
          } catch (e) {
            // Already started
          }
        }
      };

      recognitionRef.current = recognition;
      synthesisRef.current = window.speechSynthesis;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore
        }
      }
      if (synthesisRef.current) {
        synthesisRef.current.cancel();
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.start();
      setState(prev => ({ ...prev, isListening: true, transcript: '', interimTranscript: '' }));
    } catch (e) {
      console.warn('[Speech] Could not start recognition:', e);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
      setState(prev => ({ ...prev, isListening: false }));
    } catch (e) {
      // Ignore
    }
  }, []);

  const speak = useCallback((text: string) => {
    if (!synthesisRef.current || !state.voiceEnabled) return;

    // Clean text for speech (remove markdown, code blocks)
    const cleanText = text
      .replace(/```[\s\S]*?```/g, 'code block')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\[ACTION:[^\]]+\]/g, '')
      .replace(/\[TUTORIAL:[^\]]+\]/g, '')
      .replace(/[#*_`]/g, '')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;

    // Try to use a good voice
    const voices = synthesisRef.current.getVoices();
    const preferredVoice = voices.find(v => 
      v.name.includes('Google') || 
      v.name.includes('Samantha') || 
      v.name.includes('Alex')
    ) || voices[0];
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => setState(prev => ({ ...prev, isSpeaking: true }));
    utterance.onend = () => setState(prev => ({ ...prev, isSpeaking: false }));
    utterance.onerror = () => setState(prev => ({ ...prev, isSpeaking: false }));

    synthesisRef.current.cancel(); // Cancel any ongoing speech
    synthesisRef.current.speak(utterance);
  }, [state.voiceEnabled]);

  const stopSpeaking = useCallback(() => {
    if (synthesisRef.current) {
      synthesisRef.current.cancel();
      setState(prev => ({ ...prev, isSpeaking: false }));
    }
  }, []);

  const setOnTranscript = useCallback((cb: (text: string) => void) => {
    onTranscriptRef.current = cb;
  }, []);

  const toggleVoice = useCallback(() => {
    setState(prev => ({ ...prev, voiceEnabled: !prev.voiceEnabled }));
  }, []);

  return {
    state,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    setOnTranscript,
    toggleVoice,
  };
}
