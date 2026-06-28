import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Sun, Moon, Lock, ShieldAlert, Zap, BarChart3, Target } from 'lucide-react';
import useAuthStore from './store/useAuthStore';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import StudentDashboard from './pages/StudentDashboard';
import AssessmentArena from './pages/AssessmentArena';
import GlobalLoader from './components/GlobalLoader';

const ProtectedRoute = ({ children, role }) => {
  const user = useAuthStore((state) => state.user);
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to="/login" />;
  return children;
};

function App() {
  const { user, logout, theme, toggleTheme } = useAuthStore();

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, [theme]);

  return (
    <Router>
      <GlobalLoader />
      <div className="min-h-screen bg-background text-text flex flex-col font-sans">
        {/* Navbar */}
        <Routes>
          <Route path="/arena/:id" element={null} />
          <Route path="*" element={
            <header className="px-6 py-3 border-b border-border/80 flex justify-between items-center bg-surface/40 backdrop-blur-md sticky top-0 z-[1000] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-surface-hover border border-border/80 rounded-lg flex items-center justify-center p-1.5 shadow-md">
                  <img src="/logo.png" alt="Secure Assessment Pro Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-1.5 leading-none">
                    Secure Assessment Pro <span className="text-[10px] uppercase bg-primary/20 text-primary px-1.5 py-0.5 rounded font-mono font-bold tracking-wider">Enterprise</span>
                  </h1>
                  <span className="text-[10px] text-text-muted">Secure Placement Assessment Suite</span>
                </div>
              </div>
              
              <nav className="flex gap-4 items-center">
                <button onClick={toggleTheme} className="p-2 text-text-muted hover:text-white transition rounded-full hover:bg-surface-hover">
                  {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                {user ? (
                  <div className="flex items-center gap-4">
                    <a href={user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard'} className="text-xs font-semibold hover:text-primary transition bg-surface border border-border px-3 py-1.5 rounded-lg">
                      Dashboard
                    </a>
                    <div className="hidden md:flex flex-col text-right">
                      <span className="text-xs text-white font-medium">{user.name}</span>
                      <span className="text-[9px] text-text-muted uppercase tracking-wider">{user.role} Account</span>
                    </div>
                    <button onClick={logout} className="text-xs text-error hover:text-rose-400 font-bold transition px-2 py-1">
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <a href="/login" className="px-4 py-1.5 hover:text-primary transition font-semibold text-xs">
                      Sign In
                    </a>
                    <a href="/register" className="px-4 py-1.5 bg-primary hover:bg-primary/95 text-white rounded-lg font-bold transition text-xs shadow-lg shadow-primary/10">
                      Register
                    </a>
                  </div>
                )}
              </nav>
            </header>
          } />
        </Routes>

        <main className="flex-1 flex flex-col relative">
          <Routes>
            <Route path="/" element={
              <div className="max-w-6xl mx-auto px-6 py-16 md:py-24 text-center flex flex-col items-center">
                {/* Hero Proctoring Shield Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-hover border border-border/80 text-[11px] font-semibold text-primary mb-8 animate-pulse">
                  <Lock size={11} className="text-primary" /> Enterprise Secure Proctor Sandbox Active
                </div>
                
                {/* Heading */}
                <h2 className="text-4xl md:text-6xl font-extrabold mb-6 text-white leading-tight tracking-tight max-w-4xl">
                  Automated Placement & <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Technical Coding Assessments</span>
                </h2>
                
                {/* Subheading */}
                <p className="text-text-muted text-base md:text-lg mb-12 max-w-2xl leading-relaxed">
                  Evaluate programming candidates with a secure proctored sandbox. Integrates multi-language execution, tab activity proctoring, and comprehensive candidate analysis report sheets.
                </p>
                
                {/* CTAs */}
                <div className="flex flex-col sm:flex-row gap-4 mb-16">
                  <a href="/register" className="px-8 py-3 bg-gradient-to-r from-primary to-secondary hover:opacity-95 text-white rounded-xl font-bold transition shadow-lg shadow-primary/20 text-sm">
                    Access Candidate Sandbox
                  </a>
                  <a href="/login" className="px-8 py-3 bg-surface border border-border hover:border-primary/50 text-white rounded-xl font-bold transition text-sm">
                    Institution Portal Log In
                  </a>
                </div>
                
                {/* Trust Section */}
                <div className="w-full border-t border-border/60 pt-16">
                  <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold mb-8">Features Integrated</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
                    <div className="p-5 bg-surface/50 border border-border/60 rounded-2xl backdrop-blur-sm">
                      <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4">
                        <Lock size={18} />
                      </div>
                      <h3 className="text-sm font-bold text-white mb-2">Proctored Sandbox</h3>
                      <p className="text-xs text-text-muted leading-relaxed">Detects tab switches, fullscreen escapes, copy-paste blocks, and outputs auto-submission flags.</p>
                    </div>
                    <div className="p-5 bg-surface/50 border border-border/60 rounded-2xl backdrop-blur-sm">
                      <div className="w-9 h-9 bg-success/10 rounded-xl flex items-center justify-center text-success mb-4">
                        <Zap size={18} />
                      </div>
                      <h3 className="text-sm font-bold text-white mb-2">Multi-Lang Execution</h3>
                      <p className="text-xs text-text-muted leading-relaxed">Supports Python, JavaScript, Java, C++, and SQL execution with Judge0 integration.</p>
                    </div>
                    <div className="p-5 bg-surface/50 border border-border/60 rounded-2xl backdrop-blur-sm">
                      <div className="w-9 h-9 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary mb-4">
                        <BarChart3 size={18} />
                      </div>
                      <h3 className="text-sm font-bold text-white mb-2">Analytics & Violation Logs</h3>
                      <p className="text-xs text-text-muted leading-relaxed">Admin panel lists detailed score distributions and proctoring logs for candidate assessments.</p>
                    </div>
                    <div className="p-5 bg-surface/50 border border-border/60 rounded-2xl backdrop-blur-sm">
                      <div className="w-9 h-9 bg-warning/10 rounded-xl flex items-center justify-center text-warning mb-4">
                        <Target size={18} />
                      </div>
                      <h3 className="text-sm font-bold text-white mb-2">Code Evaluator</h3>
                      <p className="text-xs text-text-muted leading-relaxed">Evaluates user functions against custom testcase arrays and prints runtime performance logs.</p>
                    </div>
                  </div>
                </div>
              </div>
            } />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/admin/dashboard" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/student/dashboard" element={<ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>} />
            <Route path="/arena/:id" element={<ProtectedRoute role="student"><AssessmentArena /></ProtectedRoute>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
