'use client';

import { useState } from 'react';
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

  const mutation = useMutation({
    mutationFn: fetchAnswer,
    onSuccess: (data) => {
      setAnswer(data);
    },
    onError: () => {
      setAnswer('Failed to fetch answer.');
    },
  });

  function handleAsk() {
    if (!question.trim()) return;
    setAnswer(null);
    mutation.mutate(question);
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
      {answer !== null && <pre className={styles.output}>{answer}</pre>}
    </div>
  );
}
