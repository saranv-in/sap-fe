import { useState, useEffect } from 'react';
import useAuthStore from '../store/useAuthStore';
import api from '../services/api';
import { Play, Code, CheckCircle2, ShieldCheck, ArrowRight, Clock, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function StudentDashboard() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState([]);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    fetchMyAssessments();
  }, []);

  const fetchMyAssessments = async () => {
    try {
      const res = await api.get('/assessments/student');
      setAssessments(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!joinCode) return;
    setJoining(true);
    try {
      await api.post('/assessments/join', { code: joinCode.toUpperCase() });
      setJoinCode('');
      fetchMyAssessments();
      alert('Successfully joined the assessment!');
    } catch (err) {
      alert(err.response?.data?.message || 'Invalid access code or error joining');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto w-full font-sans">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-surface to-surface-hover border border-border/80 p-6 rounded-2xl mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-primary bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20">
            Candidate Portal
          </span>
          <h2 className="text-2xl font-extrabold text-white mt-3 tracking-tight">Active Placement Drives</h2>
          <p className="text-xs text-text-muted mt-1">Review active assessment slots and register new test modules below.</p>
        </div>
        <div className="bg-background/50 border border-border/80 px-4 py-2.5 rounded-xl flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
          <span className="text-xs text-white font-semibold">Proctor Connection Online</span>
        </div>
      </div>
      
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-surface/50 border border-border/80 p-5 rounded-2xl flex items-center gap-4 backdrop-blur-sm">
          <div className="w-11 h-11 bg-primary/10 text-primary rounded-xl flex items-center justify-center"><Code size={20} /></div>
          <div>
            <h3 className="font-extrabold text-white text-lg leading-tight">{assessments.length}</h3>
            <p className="text-xs text-text-muted mt-0.5">Assigned Modules</p>
          </div>
        </div>
        <div className="bg-surface/50 border border-border/80 p-5 rounded-2xl flex items-center gap-4 backdrop-blur-sm">
          <div className="w-11 h-11 bg-success/10 text-success rounded-xl flex items-center justify-center"><CheckCircle2 size={20} /></div>
          <div>
            <h3 className="font-extrabold text-white text-lg leading-tight">
              {assessments.filter(a => a.completed).length}
            </h3>
            <p className="text-xs text-text-muted mt-0.5">Completed Runs</p>
          </div>
        </div>
        <div className="bg-surface/50 border border-border/80 p-5 rounded-2xl flex items-center gap-4 backdrop-blur-sm">
          <div className="w-11 h-11 bg-secondary/10 text-secondary rounded-xl flex items-center justify-center"><Award size={20} /></div>
          <div>
            <h3 className="font-extrabold text-white text-lg leading-tight">N/A</h3>
            <p className="text-xs text-text-muted mt-0.5">Average Performance</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left Side: Activation Console */}
        <div className="lg:col-span-2 bg-surface/50 border border-border/80 p-6 rounded-2xl h-fit backdrop-blur-sm">
          <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
            <ShieldCheck size={18} className="text-primary" /> Activate Assessment Drive
          </h3>
          <p className="text-xs text-text-muted mb-6 leading-relaxed">
            Enter the 6-character unique validation key shared by your recruitment proctor to open your proctored assessment sandbox.
          </p>
          <form onSubmit={handleJoin} className="space-y-4">
            <input 
              type="text" 
              placeholder="e.g. XJ9K2M" 
              className="w-full text-center bg-background/50 border border-border/80 rounded-xl p-3.5 text-white text-base focus:outline-none focus:border-primary/80 focus:ring-1 focus:ring-primary/20 font-bold uppercase tracking-widest font-mono transition-all"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              required
              maxLength={6}
            />
            <button 
              type="submit" 
              disabled={joining}
              className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-95 text-white font-bold py-3 px-6 rounded-xl transition whitespace-nowrap flex items-center justify-center gap-2 text-xs shadow-md shadow-primary/10">
              {joining ? 'Activating Sandbox...' : <><ArrowRight size={14} /> Initialize Sandbox</>}
            </button>
          </form>
        </div>

        {/* Right Side: Assessment List */}
        <div className="lg:col-span-3 bg-surface/50 border border-border/80 p-6 rounded-2xl backdrop-blur-sm">
          <h3 className="text-base font-bold text-white mb-5">Pending Assessments</h3>
          <div className="space-y-4">
            {assessments.map((a) => (
              <div key={a._id} className={`bg-background/40 border p-5 rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition group ${a.completed ? 'border-success/30' : 'border-border/60 hover:border-primary/40'}`}>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-white text-base tracking-tight">{a.title}</h4>
                    {a.completed ? (
                      <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-success/10 border border-success/20 text-success flex items-center gap-1">
                        <CheckCircle2 size={10} /> Completed
                      </span>
                    ) : (
                      <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary">
                        Proctored
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-text-muted">
                    <span className="flex items-center gap-1"><Code size={13} /> {a.questionCount && a.questionCount > 0 ? a.questionCount : a.questions?.length || 0} Coding Challenges</span>
                    <span className="flex items-center gap-1"><Clock size={13} /> {a.duration} Minutes</span>
                  </div>
                </div>
                
                {a.completed ? (
                  <span className="text-xs font-bold text-success bg-success/10 border border-success/20 px-4 py-2 rounded-lg flex items-center gap-1.5 self-start sm:self-auto">
                    <CheckCircle2 size={13} /> Assessment Completed
                  </span>
                ) : (
                  <button 
                    onClick={() => navigate(`/arena/${a._id}`)}
                    className="bg-primary text-white hover:bg-primary/90 px-4 py-2 rounded-lg font-bold text-xs transition flex items-center justify-center gap-2 shadow-md shadow-primary/10 sm:opacity-0 group-hover:opacity-100 duration-200">
                    <Play size={13} fill="white" /> Launch Sandbox
                  </button>
                )}
              </div>
            ))}
            {assessments.length === 0 && (
              <div className="text-center py-12 bg-background/20 rounded-xl border border-dashed border-border/80">
                <p className="text-xs text-text-muted italic">No assessments available. Please join using an access key on the left console.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentDashboard;

