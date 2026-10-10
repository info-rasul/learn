import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { UserDataProvider } from './lib/userData';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import LessonPage from './pages/LessonPage';
import VerbTablePage from './pages/VerbTablePage';
import StatsPage from './pages/StatsPage';
import ExamPage from './pages/ExamPage';
import SettingsPage from './pages/SettingsPage';

// HashRouter: GitHub Pages has no server-side rewrites, so deep links must live after "#".
export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </HashRouter>
  );
}

function Shell() {
  const { user } = useAuth();
  if (!user) return <LoginPage />;

  return (
    <UserDataProvider key={user.email} email={user.email}>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/lesson/:id" element={<LessonPage />} />
          <Route path="/lesson/:id/theory" element={<LessonPage view="theory" />} />
          <Route path="/lesson/:id/practice" element={<LessonPage view="practice" />} />
          <Route path="/lesson/:id/ask" element={<LessonPage view="ask" />} />
          <Route path="/lesson/:id/words" element={<LessonPage view="words" />} />
          <Route path="/table" element={<VerbTablePage />} />
          <Route path="/exam" element={<ExamPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </UserDataProvider>
  );
}
