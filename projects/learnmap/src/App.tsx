import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './hooks/useApp';
import { Shell } from './components/Shell';
import { Loading } from './components/UI';
import { Auth } from './pages/Auth';
import { Onboarding } from './pages/Onboarding';
import { Today } from './pages/Today';
import { KnowledgeMap } from './pages/KnowledgeMap';
import { Subjects } from './pages/Subjects';
import { Diagnostic } from './pages/Diagnostic';
import { Lesson } from './pages/Lesson';
import { Speaking } from './pages/Speaking';
import { Listening } from './pages/Listening';
import { Progress } from './pages/Progress';
import { Parent } from './pages/Parent';
import { Settings } from './pages/Settings';
import { Admin } from './pages/Admin';
import { About } from './pages/About';
function Protected() {
  const { user, loading } = useApp();
  return loading ? <Loading /> : user ? <Shell /> : <Navigate to="/" replace />;
}
function Role({ role, children }: { role: string; children: React.ReactNode }) {
  const { user } = useApp();
  return user?.role === role ? children : <Navigate to="/" replace />;
}
const student = (node: React.ReactNode) => <Role role="student">{node}</Role>;
export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Auth />} />
          <Route path="/about" element={<About />} />
          <Route element={<Protected />}>
            <Route path="onboarding" element={student(<Onboarding />)} />
            <Route path="today" element={student(<Today />)} />
            <Route path="map" element={student(<KnowledgeMap />)} />
            <Route path="subjects" element={student(<Subjects />)} />
            <Route path="subjects/:subject" element={student(<Subjects />)} />
            <Route path="diagnostic/:subject" element={student(<Diagnostic />)} />
            <Route path="lesson/:skill" element={student(<Lesson />)} />
            <Route path="speaking" element={student(<Speaking />)} />
            <Route path="listening" element={student(<Listening />)} />
            <Route path="progress" element={student(<Progress />)} />
            <Route path="family" element={student(<Settings family />)} />
            <Route path="settings" element={<Settings />} />
            <Route
              path="parent"
              element={
                <Role role="parent">
                  <Parent />
                </Role>
              }
            />
            <Route
              path="parent/:view"
              element={
                <Role role="parent">
                  <Parent />
                </Role>
              }
            />
            <Route
              path="admin"
              element={
                <Role role="admin">
                  <Admin />
                </Role>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
