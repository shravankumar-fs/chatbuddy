import { useState, useRef, useCallback, useEffect } from 'react';

type SpeechRecognitionHook = {
  isListening: boolean;
  transcript: string;
  startListening: () => Promise<void>;
  stopListening: () => void;
  error: string | null;
  resetTranscript: () => void;
};

export const useSpeechRecognition = (): SpeechRecognitionHook => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  const handleEnd = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.start();
    }
  }, [isListening]);

  const startListening = useCallback(async () => {
    try {
      setError(null);

      // Check if browser supports speech recognition
      if (
        !('webkitSpeechRecognition' in window) &&
        !('SpeechRecognition' in window)
      ) {
        throw new Error('Speech recognition not supported in this browser');
      }

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop all tracks to release the microphone
      stream.getTracks().forEach((track) => track.stop());

      // Initialize speech recognition
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();

      // Configure recognition
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      // Set up event listeners
      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const results = event.results;
        const transcript = Array.from({ length: results.length })
          .map((_, i) => results[i][0]?.transcript || '')
          .join('');
        setTranscript(transcript);
      };
      
      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        
        switch (event.error) {
          case 'not-allowed':
            setError('Microphone access was denied. Please allow microphone access to use speech recognition.');
            break;
          case 'audio-capture':
            setError('No microphone was found. Please ensure a microphone is connected.');
            break;
          case 'not-supported':
            setError('Speech recognition is not supported in this browser.');
            break;
          default:
            setError(`Error occurred in speech recognition: ${event.error}`);
        }
      };
      
      recognitionRef.current.onend = handleEnd;

      // Start recognition
      recognitionRef.current.start();
      setIsListening(true);
    } catch (err) {
      console.error('Error initializing speech recognition:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to initialize speech recognition'
      );
      setIsListening(false);
    }
  }, [handleEnd]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setIsListening(false);
    }
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    error,
    resetTranscript,
  };
};

// Type declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: SpeechRecognitionErrorCode;
  message: string;
}

type SpeechRecognitionErrorCode =
  | 'aborted'
  | 'audio-capture'
  | 'bad-grammar'
  | 'language-not-supported'
  | 'network'
  | 'no-speech'
  | 'not-allowed'
  | 'service-not-allowed'
  | 'speech-not-allowed'
  | 'not-supported';

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onend: () => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
}
