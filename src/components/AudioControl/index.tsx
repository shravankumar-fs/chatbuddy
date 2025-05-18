'use client';

import { useState, useEffect, useRef, useCallback, ReactElement } from 'react';
import { useTranslation } from 'next-i18next';
import { FaMicrophone, FaStop } from 'react-icons/fa';
import styles from '../Chat/Chat.module.css';

// Type declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

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

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
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

interface AudioControlsProps {
  onSpeechRecognized: (text: string) => void;
  onError?: (error: string) => void;
  isProcessing?: boolean;
  textToSpeak?: string | null;
}

export const AudioControls: React.FC<AudioControlsProps> = ({
  onSpeechRecognized,
  onError,
  isProcessing = false,
  textToSpeak = null,
}): ReactElement => {
  const { t: getTranslation } = useTranslation();
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const currentUtterance = useRef<SpeechSynthesisUtterance | null>(null);

  const speakText = useCallback(
    async (text: string) => {
      if (!text || !synthRef.current) return;

      // Cancel any ongoing speech
      synthRef.current.cancel();
      setIsSpeaking(true);

      // Wait for voices to be loaded if needed
      let voices = synthRef.current.getVoices();
      if (voices.length === 0) {
        await new Promise<void>((resolve) => {
          const onVoicesChanged = () => {
            voices = synthRef.current?.getVoices() || [];
            if (voices.length > 0) {
              synthRef.current?.removeEventListener(
                'voiceschanged',
                onVoicesChanged
              );
              resolve();
            }
          };
          synthRef.current?.addEventListener('voiceschanged', onVoicesChanged);
          // Fallback in case voiceschanged doesn't fire
          setTimeout(resolve, 1000);
        });
        voices = synthRef.current?.getVoices() || [];
      }

      if (voices.length === 0) {
        onError?.('No speech voices available');
        setIsSpeaking(false);
        return;
      }

      // Create a new utterance
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.volume = 1;
      utterance.rate = 1;
      utterance.pitch = 1;

      // Find a suitable voice
      const voiceToUse =
        voices.find((v) => v.lang.startsWith('en-') && v.default) ||
        voices.find((v) => v.lang.startsWith('en-')) ||
        voices[0];

      if (voiceToUse) {
        utterance.voice = voiceToUse;
      }

      // Set up event handlers
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
        if (event.error !== 'interrupted') {
          console.error('Speech synthesis error:', event);
          onError?.(`Speech error: ${event.error}`);
        }
        setIsSpeaking(false);
      };

      try {
        currentUtterance.current = utterance;
        synthRef.current.speak(utterance);
      } catch (error) {
        console.error('Error during speech synthesis:', error);
        onError?.('Error during speech synthesis');
        setIsSpeaking(false);
      }
    },
    [onError]
  );

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      onError?.('Speech recognition not supported in this browser');
      return;
    }

    recognitionRef.current = new SR();
    const recognition = recognitionRef.current;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const results = event.results;
      const transcript = Array.from({ length: results.length })
        .map((_, i) => {
          const result = results[i];
          return result[0]?.transcript || '';
        })
        .join('');

      if (results[0]?.isFinal) {
        onSpeechRecognized(transcript);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      onError?.(`Speech recognition error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      if (isListening) {
        recognition.start();
      }
    };

    return () => {
      recognition.stop();
    };
  }, [isListening, onError, onSpeechRecognized]);

  // Initialize speech synthesis
  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
    }

    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  // Handle text-to-speech when textToSpeak changes
  useEffect(() => {
    if (!textToSpeak) return;

    const speak = async () => {
      await speakText(textToSpeak);
    };

    speak();

    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
        setIsSpeaking(false);
      }
    };
  }, [textToSpeak, speakText]);

  const handleMicClick = useCallback(() => {
    if (!recognitionRef.current || isProcessing) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening, isProcessing]);

  const handleStopSpeaking = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  }, []);

  return (
    <div className={styles.controlsRow}>
      <button
        className={`${styles.controlButton} ${
          isListening ? styles.recording : ''
        }`}
        onClick={handleMicClick}
        disabled={isProcessing}
        title={getTranslation('Speak')}
      >
        <FaMicrophone />
      </button>
      <button
        className={styles.controlButton}
        onClick={handleStopSpeaking}
        disabled={!isSpeaking}
        title={getTranslation('Stop')}
      >
        <FaStop />
      </button>
    </div>
  );
};
