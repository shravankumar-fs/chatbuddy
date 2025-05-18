import { useState, useRef, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';

interface OllamaResponse {
  message: { content: string };
}

interface UseChatReturn {
  question: string;
  answer: string | null;
  isListening: boolean;
  isSpeaking: boolean;
  isLoading: boolean;
  setQuestion: (question: string) => void;
  handleAsk: () => void;
  toggleListening: () => void;
  toggleSpeaking: () => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
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

  return response?.data?.message?.content ?? 'No answer found.';
}

export function useChat(): UseChatReturn {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  const mutation = useMutation({
    mutationFn: fetchAnswer,
    onSuccess: (data) => {
      setAnswer(data);
      if (isSpeaking) {
        speak(data);
      }
    },
  });

  const speak = useCallback((text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
      
      // Cancel any ongoing speech
      synthRef.current.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.pitch = 1;
      
      synthRef.current.speak(utterance);
      
      utterance.onend = () => {
        setIsSpeaking(false);
      };
    }
  }, []);

  const handleAsk = useCallback(() => {
    if (question.trim()) {
      mutation.mutate(question);
    }
  }, [question, mutation]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  }, [handleAsk]);

  const toggleSpeaking = useCallback(() => {
    if (isSpeaking) {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
      setIsSpeaking(false);
    } else if (answer) {
      speak(answer);
      setIsSpeaking(true);
    }
  }, [answer, isSpeaking, speak]);

  return {
    question,
    answer,
    isListening: false, // Will be handled by useSpeechRecognition hook
    isSpeaking,
    isLoading: mutation.isPending,
    setQuestion,
    handleAsk,
    toggleListening: () => {}, // Will be implemented by the component
    toggleSpeaking,
    handleKeyDown,
  };
}
