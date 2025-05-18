import Chat from '../components/Chat';
import { I18nProvider } from '../i18n/I18nProvider';

export default function Home() {
  return (
    <main>
      <I18nProvider>
        <Chat />
      </I18nProvider>
    </main>
  );
}
