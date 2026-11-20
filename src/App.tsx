import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { VfxProvider } from './context/VfxContext';
import { GameShell } from './components/layout/GameShell';
import { HomePage } from './pages/HomePage';
import { ThankYouPage } from './pages/ThankYouPage';
import { NotFoundPage } from './pages/NotFoundPage';

export default function App() {
  return (
    <VfxProvider>
      <BrowserRouter>
        <GameShell>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/thank-you" element={<ThankYouPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </GameShell>
      </BrowserRouter>
    </VfxProvider>
  );
}