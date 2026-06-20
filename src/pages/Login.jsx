import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import useAuthStore from '../store/useAuthStore';
import { ShieldCheck, Mail, Lock, ShieldAlert } from 'lucide-react';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/auth/login', { email, password });
      setAuth(response.data.user, response.data.token);
      if (response.data.user.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/student/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[85vh] px-4">
      <div className="bg-surface/50 border border-border/80 p-8 rounded-2xl shadow-2xl w-full max-w-md backdrop-blur-md">
        {/* Shield Icon */}
        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mx-auto mb-6">
          <ShieldCheck size={26} />
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-2 text-center tracking-tight">Security Gateway Log In</h2>
        <p className="text-xs text-text-muted text-center mb-8">Access the placement assessment or institution dashboard.</p>
        
        {error && (
          <div className="bg-error/10 border border-error/20 text-error p-3.5 rounded-lg mb-6 text-xs font-semibold flex items-center gap-1.5">
            <ShieldAlert size={14} className="shrink-0" /> {error}
          </div>
        )}
        
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-white font-medium mb-1.5 text-xs">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-text-muted">
                <Mail size={15} />
              </span>
              <input 
                type="email" 
                className="w-full bg-background/50 border border-border/80 rounded-lg py-2.5 pl-10 pr-3.5 text-white text-sm focus:outline-none focus:border-primary/80 focus:ring-1 focus:ring-primary/20 transition-all placeholder-text-muted/50"
                placeholder="e.g. candidate@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-white font-medium mb-1.5 text-xs">Access Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-text-muted">
                <Lock size={15} />
              </span>
              <input 
                type="password" 
                className="w-full bg-background/50 border border-border/80 rounded-lg py-2.5 pl-10 pr-3.5 text-white text-sm focus:outline-none focus:border-primary/80 focus:ring-1 focus:ring-primary/20 transition-all placeholder-text-muted/50"
                placeholder="Access key"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>
          
          <button 
            type="submit" 
            className="w-full mt-4 bg-gradient-to-r from-primary to-secondary text-white font-bold py-2.5 rounded-lg transition-all hover:opacity-95 text-xs shadow-md shadow-primary/10">
            Authorize Credentials
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-border/60 text-center">
          <p className="text-text-muted text-xs">
            New candidate? <Link to="/register" className="text-primary font-semibold hover:underline">Create Assessment Profile</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;

