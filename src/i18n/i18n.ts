import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: {
          // Chat component strings
          askButton: 'Ask Ollama',
          thinking: 'Thinking…',
          startRecording: 'Start Recording',
          stopRecording: 'Stop Recording',
          stopSpeaking: 'Stop Speaking',
          placeholder: 'Ask me anything…',
          
          // Error messages
          speechNotSupported: 'Web Speech Synthesis not supported',
          speechRecognitionNotSupported: 'Web Speech Recognition not supported',
          speechRecognitionError: 'Speech recognition error',
          
          // System messages
          noAnswer: 'No answer found.',
          failedToFetch: 'Failed to fetch answer.',
        },
      },
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
