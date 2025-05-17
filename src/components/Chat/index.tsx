/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import styles from './Chat.module.css';
import axios from 'axios';

interface OllamaResponse {
  message: { content: string };
}

async function fetchAnswer(question: string): Promise<string> {
  const response = await axios.post<OllamaResponse>(
    '/api/ollama',
    {
      messages: [
        {
          role: 'system',
          content:
            'You are an expert in programmer who gives 3 working examples to all coding question asked.',
        },
        { role: 'user', content: question },
      ],
    },
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  const answer = response?.data?.message?.content;

  // console.log('Response data:', answer);
  return answer ?? 'No answer found.';
}

export default function Chat() {
  const { t } = useTranslation();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis>(null);

  const mutation = useMutation({
    mutationFn: fetchAnswer,
    onSuccess: (data) => {
      setAnswer(data);
    },
    onError: (error) => {
      console.error('Error fetching answer:', error);
      setAnswer(t('failedToFetch'));
    },
  });

  useEffect(() => {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) {
      console.warn('Web Speech API not supported');
      return;
    }
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onresult = (event: any) => {
      const transcript = event.results[event.resultIndex][0].transcript;
      const msg = transcript.trim();
      setQuestion(msg);
      setAnswer(null);
      mutation.mutate(msg);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event: any) =>
      console.error(t('speechRecognitionError'), event.error);
    recognitionRef.current = recognition;
  }, [mutation]);

  const speakText = useCallback((text: string) => {
    console.log('Preparing to speak text:', text);

    if (!('speechSynthesis' in window) || !window.speechSynthesis) {
      const errorMsg = 'Web Speech API not supported in this browser';
      console.error(errorMsg);
      setAnswer((prev) => prev + '\n\n' + errorMsg);
      return;
    }

    // Get voices and ensure they're loaded
    const synth = window.speechSynthesis;
    let voices = synth.getVoices();

    // If no voices, wait for them to load
    if (voices.length === 0) {
      console.log('No voices found, waiting for voices to load...');
      const onVoicesChanged = () => {
        voices = synth.getVoices();
        console.log('Voices loaded:', voices);
        synth.onvoiceschanged = null;
        if (voices.length > 0) {
          doSpeak(text, voices);
        } else {
          console.error('No voices available after loading');
          setAnswer((prev) => prev + '\n\nError: No speech voices available');
        }
      };

      synth.onvoiceschanged = onVoicesChanged;
      // Some browsers might not fire the voiceschanged event
      setTimeout(() => {
        if (synth.getVoices().length > 0) {
          onVoicesChanged();
        } else {
          console.error('Voices still not loaded after timeout');
          setAnswer((prev) => prev + '\n\nError: Could not load speech voices');
        }
      }, 1000);
      return;
    }

    doSpeak(text, voices);
  }, []);

  const doSpeak = (text: string, voices: SpeechSynthesisVoice[]) => {
    const synth = window.speechSynthesis;

    // Cancel any ongoing speech
    synth.cancel();

    // Create a new utterance
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.volume = 1;
    utterance.rate = 1;
    utterance.pitch = 1;

    console.log('Available voices:', voices);

    // Try to find a suitable voice
    let voiceToUse = voices.find((v) => v.lang.startsWith('en-') && v.default);
    if (!voiceToUse) {
      voiceToUse = voices.find((v) => v.lang.startsWith('en-'));
    }
    if (!voiceToUse && voices.length > 0) {
      voiceToUse = voices[0];
    }

    if (voiceToUse) {
      console.log('Using voice:', voiceToUse.name, voiceToUse.lang);
      utterance.voice = voiceToUse;
    } else {
      console.error('No suitable voice found');
      setAnswer((prev) => prev + '\n\nError: No suitable voice found');
      return;
    }

    // Event handlers
    utterance.onstart = () => {
      console.log('Speech started');
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      console.log('Speech ended');
      setIsSpeaking(false);
    };

    utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
      // Don't log or show errors for interruptions as they're expected when stopping
      if (event.error !== 'interrupted') {
        console.error('Speech synthesis error:', event);
        setAnswer(
          (prev) =>
            prev + `\n\nError: ${event.error || 'Could not speak the text'}`
        );
      }
      setIsSpeaking(false);
    };

    try {
      console.log('Attempting to speak with voice:', utterance.voice?.name);
      synth.speak(utterance);
    } catch (error) {
      console.error('Error during speech synthesis:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      setAnswer((prev) => prev + '\n\nError: ' + errorMessage);
    }
  };

  useEffect(() => {
    if (!answer) return;

    // Small delay to ensure the component is fully rendered
    const timer = setTimeout(() => {
      speakText(answer);
    }, 100);

    return () => {
      clearTimeout(timer);
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [answer, speakText]);

  useEffect(() => {
    // Initialize the synthRef
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }

    // Cleanup function for when component unmounts
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
      setIsSpeaking(false);
    };
  }, []);

  function handleAsk() {
    if (!question.trim()) return;
    setAnswer(null);
    mutation.mutate(question);
  }

  function handleMicClick() {
    if (!recognitionRef.current || mutation.isPending) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  }

  return (
    <div className={styles.container}>
      <textarea
        className={styles.textarea}
        placeholder={t('placeholder')}
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />
      <button
        className={styles.button}
        onClick={handleAsk}
        disabled={mutation.isPending}
      >
        {mutation.isPending ? t('thinking') : t('askButton')}
      </button>
      <button
        className={styles.button}
        onClick={handleMicClick}
        disabled={mutation.isPending}
      >
        {isListening ? t('stopRecording') : t('startRecording')}
      </button>
      {answer !== null && (
        <div>
          <pre className={styles.output}>{answer}</pre>
          {isSpeaking && (
            <button
              className={styles.button}
              onClick={() => {
                if (synthRef.current) {
                  synthRef.current.cancel();
                  setIsSpeaking(false);
                }
              }}
              disabled={mutation.isPending}
            >
              Stop Speaking
            </button>
          )}
        </div>
      )}
    </div>
  );
}
