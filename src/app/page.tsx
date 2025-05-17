import ChatClient from '../components/Chat/ChatClient';
import { I18nProvider } from '../i18n/I18nProvider';

export default function Home() {
  return (
    <main>
      <I18nProvider>
        <ChatClient />
      </I18nProvider>
    </main>
  );
}
