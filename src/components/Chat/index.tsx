/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import styles from './Chat.module.css';
import axios from 'axios';

interface OllamaResponse {
  message: { content: string };
}
async function fetchAnswer(question: string) {
  const response = await axios.post<OllamaResponse>(
    '/api/ollama',
    {
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: question },
      ],
    },
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  const answer = response?.data?.message?.content;

  console.log('Response data:', answer);
  return answer ?? 'No answer found.';
}

export default function Chat() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const mutation = useMutation({
    mutationFn: fetchAnswer,
    onSuccess: (data) => {
      setAnswer(data);
    },
    onError: () => {
      setAnswer('Failed to fetch answer.');
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
      console.error('Speech recognition error', event.error);
    recognitionRef.current = recognition;
  }, [mutation]);

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
        placeholder='Ask me anything…'
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />
      <button
        className={styles.button}
        onClick={handleAsk}
        disabled={mutation.isPending}
      >
        {mutation.isPending ? 'Thinking…' : 'Ask Ollama'}
      </button>
      <button
        className={styles.button}
        onClick={handleMicClick}
        disabled={mutation.isPending}
      >
        {isListening ? 'Stop Recording' : 'Start Recording'}
      </button>
      {answer !== null && <pre className={styles.output}>{answer}</pre>}
    </div>
  );
}
