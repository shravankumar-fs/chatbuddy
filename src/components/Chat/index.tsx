'use client';

import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import styles from './Chat.module.css';
import axios from 'axios';
import { AudioControls } from '../AudioControl/index';

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
  const { t: getTranslation } = useTranslation();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: fetchAnswer,
    onSuccess: (data) => {
      setAnswer(data);
    },
    onError: (error) => {
      console.error('Error fetching answer:', error);
      setAnswer(getTranslation('failedToFetch'));
    },
  });

  const handleSpeechRecognized = useCallback(
    (text: string) => {
      setQuestion(text);
      setAnswer(null);
      mutation.mutate(text);
    },
    [mutation]
  );

  const handleAudioError = useCallback((error: string) => {
    console.error('Audio error:', error);
    setAnswer((prev) => (prev ? `${prev}\n\n${error}` : getTranslation(error)));
  }, []);

  function handleAsk() {
    if (!question.trim()) return;
    setAnswer(null);
    mutation.mutate(question);
  }

  return (
    <div className={styles.container}>
      <textarea
        className={styles.textarea}
        placeholder={getTranslation('placeholder')}
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />
      <div className={styles.controlsRow}>
        <button
          className={styles.button}
          onClick={handleAsk}
          disabled={mutation.isPending}
        >
          {mutation.isPending
            ? getTranslation('thinking')
            : getTranslation('askButton')}
        </button>

        <AudioControls
          onSpeechRecognized={handleSpeechRecognized}
          onError={handleAudioError}
          isProcessing={mutation.isPending}
          textToSpeak={answer}
        />
      </div>

      {answer !== null && (
        <div>
          <pre className={styles.output}>{answer}</pre>
        </div>
      )}
    </div>
  );
}
