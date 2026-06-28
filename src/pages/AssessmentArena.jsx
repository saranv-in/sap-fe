import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { Play, Send, Clock, AlertTriangle, ChevronRight, ChevronLeft, GripVertical, GripHorizontal, X, ShieldAlert, MonitorOff, Eye, FileText, CheckCircle2, FlaskConical, LayoutList, Code2, TerminalSquare, CloudUpload, ThumbsUp, Award } from 'lucide-react';
import { io } from 'socket.io-client';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import useAuthStore from '../store/useAuthStore';
import api from '../services/api';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5050';

// ─── Professional Toast Notification System ───
function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto rounded-lg border px-4 py-3 shadow-2xl flex items-start gap-3 animate-slide-in backdrop-blur-md transition-all duration-300 ${
            toast.type === 'error' ? 'bg-red-950/90 border-red-800 text-red-200' :
            toast.type === 'warning' ? 'bg-amber-950/90 border-amber-700 text-amber-200' :
            toast.type === 'success' ? 'bg-emerald-950/90 border-emerald-700 text-emerald-200' :
            'bg-slate-900/90 border-slate-700 text-slate-200'
          }`}
        >
          <div className="shrink-0 mt-0.5">
            {toast.type === 'error' && <ShieldAlert size={18} className="text-red-400" />}
            {toast.type === 'warning' && <AlertTriangle size={18} className="text-amber-400" />}
            {toast.type === 'success' && <Eye size={18} className="text-emerald-400" />}
            {toast.type === 'info' && <MonitorOff size={18} className="text-blue-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">{toast.title}</p>
            {toast.message && <p className="text-xs mt-1 opacity-80">{toast.message}</p>}
          </div>
          <button onClick={() => removeToast(toast.id)} className="shrink-0 mt-0.5 opacity-50 hover:opacity-100 transition">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((title, message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, title, message, type }]);
    if (duration > 0) {
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
    }
  }, []);
  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);
  return { toasts, addToast, removeToast };
}

// ─── Main Component ───
function AssessmentArena() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, theme } = useAuthStore();
  const { toasts, addToast, removeToast } = useToast();
  
  const [assessment, setAssessment] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [code, setCode] = useState({});
  const [language, setLanguage] = useState('javascript');
  const [selectedLanguages, setSelectedLanguages] = useState({});
  const [latestExecuted, setLatestExecuted] = useState({});
  const [output, setOutput] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [consoleTab, setConsoleTab] = useState('testcase');
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(3600);
  const [warningDisplay, setWarningDisplay] = useState({ tabs: 0, fs: 0 });

  const tabSwitchesRef = useRef(0);
  const fullScreenExitsRef = useRef(0);
  const hasSubmittedRef = useRef(false);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResults, setSubmissionResults] = useState(null);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

  const socketRef = useRef(null);

  // Sync state refs to prevent event handlers from closing over stale values
  const codeRef = useRef({});
  const languageRef = useRef('javascript');
  const selectedLanguagesRef = useRef({});
  const latestExecutedRef = useRef({});
  const assessmentRef = useRef(null);

  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  useEffect(() => {
    selectedLanguagesRef.current = selectedLanguages;
  }, [selectedLanguages]);

  useEffect(() => {
    latestExecutedRef.current = latestExecuted;
  }, [latestExecuted]);

  useEffect(() => {
    assessmentRef.current = assessment;
  }, [assessment]);

  const getTemplate = (question, lang) => {
    const templates = question.codeTemplates;
    if (!templates) return lang === 'sql' ? '-- Write your SQL query statement below\n' : '// Write your code here...\n';
    return templates[lang] || (lang === 'sql' ? '-- Write your SQL query statement below\n' : templates['javascript'] || '// Write your code here...\n');
  };

  // ─── Fetch Assessment ───
  useEffect(() => {
    const fetchAssessment = async () => {
      try {
        const res = await api.get(`/assessments/${id}`);
        setAssessment(res.data);
        setTimeLeft(res.data.duration * 60);

        // Restore locally saved code editor drafts if present
        const localSaved = localStorage.getItem(`assessment_code_${id}_${user?.id}`);
        const parsedSaved = localSaved ? JSON.parse(localSaved) : null;

        // Restore locally saved languages
        const localLangs = localStorage.getItem(`assessment_langs_${id}_${user?.id}`);
        const parsedLangs = localLangs ? JSON.parse(localLangs) : {};

        // Restore locally saved execution status
        const localExecuted = localStorage.getItem(`assessment_executed_${id}_${user?.id}`);
        const parsedExecuted = localExecuted ? JSON.parse(localExecuted) : {};
        setLatestExecuted(parsedExecuted);

        const initialCode = {};
        const initialLangs = { ...parsedLangs };

        res.data.questions.forEach(q => {
          initialCode[q._id] = {};
          
          if (parsedSaved && parsedSaved[q._id]) {
            if (typeof parsedSaved[q._id] === 'string') {
              const defaultLang = (q.codeTemplates && !q.codeTemplates.javascript && q.codeTemplates.sql) ? 'sql' : 'javascript';
              initialCode[q._id][defaultLang] = parsedSaved[q._id];
            } else {
              initialCode[q._id] = parsedSaved[q._id];
            }
          }

          const availableLanguages = ['javascript', 'python', 'java', 'cpp', 'sql'];
          availableLanguages.forEach(lang => {
            if (!initialCode[q._id][lang]) {
              initialCode[q._id][lang] = getTemplate(q, lang);
            }
          });

          if (!initialLangs[q._id]) {
            initialLangs[q._id] = (q.codeTemplates && !q.codeTemplates.javascript && q.codeTemplates.sql) ? 'sql' : 'javascript';
          }
        });

        setCode(initialCode);
        setSelectedLanguages(initialLangs);
        localStorage.setItem(`assessment_langs_${id}_${user?.id}`, JSON.stringify(initialLangs));
      } catch (err) {
        console.error(err);
        addToast('Failed to Load', 'Could not load the assessment. Please try again.', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchAssessment();
  }, [id, user?.id]);

  // ─── Execute Submission API Call Helper ───
  const executeSubmission = useCallback(async (payload) => {
    setIsSubmitting(true);
    hasSubmittedRef.current = true;
    const details = [];
    let totalScore = 0;

    const targetAssessment = payload.assessment;
    if (!targetAssessment) {
      setIsSubmitting(false);
      return;
    }

    try {
      for (const q of targetAssessment.questions) {
        let submitLang = 'javascript';
        let submitCode = '';

        const questionExecuted = payload.latestExecuted?.[q._id];
        if (questionExecuted && questionExecuted.language && questionExecuted.code !== undefined) {
          submitLang = questionExecuted.language;
          submitCode = questionExecuted.code;
        } else {
          const qLang = payload.selectedLanguages?.[q._id] || ((q.codeTemplates && !q.codeTemplates.javascript && q.codeTemplates.sql) ? 'sql' : 'javascript');
          submitLang = qLang;
          submitCode = payload.code?.[q._id]?.[qLang] || '';
        }

        const res = await api.post('/execute/submit', {
          language: submitLang,
          code: submitCode,
          assessmentId: targetAssessment._id,
          questionId: q._id,
          tabSwitches: payload.tabSwitches,
          fullScreenExits: payload.fullScreenExits,
          terminationReason: payload.terminationReason
        });
        details.push({ title: q.title, ...res.data });
        totalScore += res.data.score || 0;
      }
      
      if (document.fullscreenElement) {
        try { await document.exitFullscreen(); } catch(e) {}
      }
      
      // Clear local storage backups upon successful submit
      localStorage.removeItem(`assessment_code_${id}_${user?.id}`);
      localStorage.removeItem(`assessment_langs_${id}_${user?.id}`);
      localStorage.removeItem(`assessment_executed_${id}_${user?.id}`);
      localStorage.removeItem(`pending_submission_${id}_${user?.id}`);
      
      setSubmissionResults({
        totalScore,
        maxScore: targetAssessment.questions.length * 100,
        details,
        terminationReason: payload.terminationReason
      });
    } catch (err) {
      console.error(err);
      addToast('Submission Error', 'Failed to submit. Keeping cached draft to retry when connection is stable.', 'error');
      hasSubmittedRef.current = false;
      // Backup submission queue to localStorage
      localStorage.setItem(`pending_submission_${id}_${user?.id}`, JSON.stringify(payload));
    } finally {
      setIsSubmitting(false);
    }
  }, [id, user?.id, addToast]);

  // ─── Submit Handler (stable via useCallback) ───
  const handleSubmit = useCallback(async (isAutoSubmit = false, terminationReason = 'Normal') => {
    if (hasSubmittedRef.current) return;
    
    if (!isAutoSubmit) {
      // Manual submit is handled via confirmSubmit modal trigger
      return;
    }
    
    const currentAssessment = assessmentRef.current;
    if (!currentAssessment) return;
    
    const payload = {
      assessment: currentAssessment,
      code: codeRef.current,
      selectedLanguages: selectedLanguagesRef.current,
      latestExecuted: latestExecutedRef.current,
      tabSwitches: tabSwitchesRef.current,
      fullScreenExits: fullScreenExitsRef.current,
      terminationReason
    };

    if (!navigator.onLine) {
      addToast('Connection Lost', 'Your answers are backed up locally. We will auto-submit once you are connected.', 'warning', 0);
      localStorage.setItem(`pending_submission_${id}_${user?.id}`, JSON.stringify(payload));
      hasSubmittedRef.current = true;
      return;
    }

    await executeSubmission(payload);
  }, [executeSubmission, id, user?.id, addToast]);

  // Manual confirm submit
  const confirmSubmit = useCallback(async () => {
    setShowConfirmSubmit(false);
    if (hasSubmittedRef.current) return;

    const currentAssessment = assessmentRef.current;
    if (!currentAssessment) return;

    const payload = {
      assessment: currentAssessment,
      code: codeRef.current,
      selectedLanguages: selectedLanguagesRef.current,
      latestExecuted: latestExecutedRef.current,
      tabSwitches: tabSwitchesRef.current,
      fullScreenExits: fullScreenExitsRef.current,
      terminationReason: 'Normal'
    };

    if (!navigator.onLine) {
      addToast('Connection Lost', 'Your answers are backed up locally. We will auto-submit once you are connected.', 'warning', 0);
      localStorage.setItem(`pending_submission_${id}_${user?.id}`, JSON.stringify(payload));
      hasSubmittedRef.current = true;
      return;
    }

    await executeSubmission(payload);
  }, [executeSubmission, id, user?.id, addToast]);

  // ─── Security Event Handlers ───
  useEffect(() => {
    if (!assessment) return;

    socketRef.current = io(SOCKET_URL);
    socketRef.current.emit('join_assessment', id);

    // Fullscreen Detection
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
        fullScreenExitsRef.current += 1;
        setWarningDisplay(prev => ({ ...prev, fs: fullScreenExitsRef.current }));
        
        if (fullScreenExitsRef.current >= 2) {
          addToast('Assessment Terminated', 'You exited full-screen mode too many times. Auto-submitting...', 'error', 6000);
          handleSubmit(true, 'Full Screen Exits');
        } else {
          addToast('Full Screen Warning', `Exiting full-screen is not allowed. (${fullScreenExitsRef.current}/2 — next exit will auto-submit)`, 'warning', 5000);
        }
      } else {
        setIsFullscreen(true);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // Prevent Copy/Screenshot Keys
    const handleKeyDown = (e) => {
      if (e.key === 'PrintScreen' || (e.ctrlKey && ['c','C','s','S','p','P','v','V'].includes(e.key))) {
        e.preventDefault();
        addToast('Action Blocked', 'Copy, paste, save, and print are disabled during this assessment.', 'warning', 3000);
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    // Tab Switch Detection
    const handleVisibilityChange = () => {
      if (document.hidden) {
        tabSwitchesRef.current += 1;
        setWarningDisplay(prev => ({ ...prev, tabs: tabSwitchesRef.current }));
        
        if (tabSwitchesRef.current >= 2) {
          addToast('Assessment Terminated', 'You switched tabs too many times. Auto-submitting...', 'error', 6000);
          handleSubmit(true, 'Tab Switches');
        } else {
          addToast('Tab Switch Detected', `Warning: Tab switch detected. (${tabSwitchesRef.current}/2 — next switch will auto-submit)`, 'warning', 5000);
          if (socketRef.current) {
            socketRef.current.emit('tab_switch_warning', { assessmentId: id, userId: user?.id, warningCount: tabSwitchesRef.current });
          }
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Timer
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          addToast('Time\'s Up!', 'The timer has expired. Auto-submitting your assessment...', 'error', 6000);
          handleSubmit(true, 'Normal');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('keydown', handleKeyDown);
      clearInterval(timer);
      if (socketRef.current) socketRef.current.disconnect();
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [id, user?.id, assessment, handleSubmit, addToast]);

  // ─── Language change handler ───
  const handleLanguageChange = (newLang) => {
    if (!assessment) return;
    const q = assessment.questions[currentQuestionIndex];
    setLanguage(newLang);
    setSelectedLanguages(prev => {
      const next = { ...prev, [q._id]: newLang };
      localStorage.setItem(`assessment_langs_${id}_${user?.id}`, JSON.stringify(next));
      return next;
    });
  };

  // ─── Run Code ───
  const handleRun = async () => {
    setIsRunning(true);
    setOutput({ status: 'running' });
    const currentQuestion = assessment.questions[currentQuestionIndex];
    const currentCode = code[currentQuestion._id]?.[language] || '';

    // Save this as the latest executed code
    setLatestExecuted(prev => {
      const next = {
        ...prev,
        [currentQuestion._id]: {
          language,
          code: currentCode
        }
      };
      localStorage.setItem(`assessment_executed_${id}_${user?.id}`, JSON.stringify(next));
      return next;
    });

    try {
      const res = await api.post('/execute/run', { 
        language, 
        code: currentCode, 
        questionId: currentQuestion._id 
      });
      setOutput({ status: 'completed', data: res.data });
      setConsoleTab('result');
      setSelectedResultIndex(0);
    } catch (err) {
      console.error(err);
      setOutput({ 
        status: 'error', 
        message: err.response?.data?.message || 'Failed to execute code on server.' 
      });
    } finally {
      setIsRunning(false);
    }
  };

  const editorRef = useRef(null);

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
    if (document.fonts) {
      document.fonts.ready.then(() => {
        if (editorRef.current) {
          editorRef.current.layout();
        }
      });
    }
    // Fallback delay to handle late loads
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.layout();
      }
    }, 500);
  };

  const saveTimeoutRef = useRef(null);

  const handleCodeChange = (value) => {
    const qId = assessment.questions[currentQuestionIndex]._id;
    setCode(prev => {
      const qCode = prev[qId] ? { ...prev[qId] } : {};
      qCode[language] = value;
      const next = { ...prev, [qId]: qCode };
      
      // Debounce writing to localStorage to prevent UI stutter during typing
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        localStorage.setItem(`assessment_code_${id}_${user?.id}`, JSON.stringify(next));
      }, 500);

      return next;
    });
  };

  // Set language when current question changes
  useEffect(() => {
    if (!assessment) return;
    const q = assessment.questions[currentQuestionIndex];
    const qLang = selectedLanguages[q._id];
    if (qLang) {
      setLanguage(qLang);
    }
    setOutput(null);
    setConsoleTab('testcase');
    setSelectedResultIndex(0);
  }, [currentQuestionIndex, assessment, selectedLanguages]);

  // ─── Offline Queue Auto-Sync ───
  useEffect(() => {
    const checkPendingSubmission = async () => {
      const pending = localStorage.getItem(`pending_submission_${id}_${user?.id}`);
      if (pending && navigator.onLine) {
        const payload = JSON.parse(pending);
        addToast('Online Sync', 'Restored connection detected. Syncing saved answers...', 'success', 3000);
        await executeSubmission(payload);
      }
    };

    checkPendingSubmission();

    const handleOnline = () => {
      checkPendingSubmission();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [id, user?.id, executeSubmission, addToast]);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const requestFullScreen = () => {
    document.documentElement.requestFullscreen().catch(() => {
      addToast('Full Screen Error', 'Could not enter full-screen mode. Please try again or use a supported browser.', 'error');
    });
  };

  // ─── Render States ───
  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <div className="absolute inset-0 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
        </div>
        <p className="text-text-muted font-medium">Loading Assessment...</p>
      </div>
    </div>
  );

  if (!assessment) return (
    <div className="h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <ShieldAlert size={48} className="text-error mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Assessment Not Found</h2>
        <p className="text-text-muted mb-6">This assessment may have been removed or the link is incorrect.</p>
        <button onClick={() => navigate('/student/dashboard')} className="bg-primary hover:bg-blue-600 text-white px-6 py-2 rounded font-bold transition">
          Back to Dashboard
        </button>
      </div>
    </div>
  );

  if (isSubmitting) {
    return (
      <div className="h-screen w-screen bg-background flex flex-col items-center justify-center text-text">
        <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
          <div className="absolute inset-0 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Submitting Assessment...</h2>
        <p className="text-text-muted">Evaluating your code against all test cases. Please wait.</p>
      </div>
    );
  }

  if (submissionResults) {
    const pct = submissionResults.maxScore > 0 ? Math.round((submissionResults.totalScore / submissionResults.maxScore) * 100) : 0;
    return (
      <div className="h-screen w-screen bg-background flex flex-col items-center justify-center text-text p-8">
        <div className="mb-6 flex justify-center">
          {pct >= 70 ? (
            <Award size={64} className="text-success animate-bounce" />
          ) : pct >= 40 ? (
            <ThumbsUp size={64} className="text-warning" />
          ) : (
            <FileText size={64} className="text-text-muted" />
          )}
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">Assessment Submitted!</h2>
        <p className="text-text-muted mb-2">{assessment.title}</p>
        {submissionResults.terminationReason !== 'Normal' && (
          <div className="bg-error/10 border border-error/30 text-error px-4 py-2 rounded-lg text-sm font-bold mb-4">
            Terminated: {submissionResults.terminationReason}
          </div>
        )}
        
        <div className="bg-surface border border-border rounded-xl p-8 w-full max-w-2xl mb-6">
          <div className="text-center mb-6">
            <div className={`text-5xl font-bold mb-2 ${pct >= 70 ? 'text-success' : pct >= 40 ? 'text-warning' : 'text-error'}`}>{pct}%</div>
            <p className="text-text-muted">Total Score: {submissionResults.totalScore} / {submissionResults.maxScore}</p>
          </div>
          <div className="space-y-4">
            {submissionResults.details.map((d, i) => (
              <div key={i} className="bg-background border border-border p-4 rounded flex justify-between items-center">
                <div>
                  <p className="font-bold text-white">{d.title}</p>
                  <p className="text-xs text-text-muted mt-1">{d.passedCases}/{d.totalCases} test cases passed</p>
                </div>
                <div className="text-right">
                  <span className={`font-bold text-lg ${d.score >= 70 ? 'text-success' : d.score >= 40 ? 'text-warning' : 'text-error'}`}>{d.score}%</span>
                  <p className={`text-xs mt-1 ${d.status === 'Passed' ? 'text-success' : 'text-error'}`}>{d.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <button 
          onClick={() => navigate('/student/dashboard')}
          className="bg-primary hover:bg-blue-600 text-white px-8 py-3 rounded font-bold transition">
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (!isFullscreen) {
    return (
      <div className="h-screen w-screen bg-background flex flex-col items-center justify-center text-text px-4 font-sans">
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        <div className="bg-surface/50 border border-border/80 p-8 rounded-2xl max-w-lg w-full text-center shadow-2xl backdrop-blur-md">
          {/* Proctor Logo */}
          <div className="w-14 h-14 bg-gradient-to-tr from-primary to-secondary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-md shadow-primary/10 p-2">
            <img src="/logo.png" alt="Secure Assessment Pro Logo" className="w-full h-full object-contain" />
          </div>
          
          <span className="text-[10px] uppercase font-bold tracking-widest text-primary bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20">
            Secure Proctor Sandbox
          </span>
          
          <h2 className="text-xl font-extrabold text-white mt-4 mb-2 tracking-tight">{assessment.title}</h2>
          <p className="text-xs text-text-muted mb-6">
            Authorized session entry required. This slot is conducted under a strict automated remote proctor system.
          </p>
          
          {/* Rules checklist */}
          <div className="text-left bg-background/50 rounded-xl border border-border/80 p-5 mb-8 space-y-4 text-xs">
            <div className="flex gap-3 items-start">
              <MonitorOff size={16} className="text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white mb-0.5">Mandatory Fullscreen Sandbox</p>
                <p className="text-text-muted leading-relaxed">Exiting fullscreen mode triggers a violation log (2 warnings = automatic assessment termination).</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <AlertTriangle size={16} className="text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white mb-0.5">Strict Tab Isolation</p>
                <p className="text-text-muted leading-relaxed">Candidate tab switches are flagged and reported to coordinators in real-time. System auto-submits on 2nd switch.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <ShieldAlert size={16} className="text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white mb-0.5">Anti-Copy & System Hotkey Blocks</p>
                <p className="text-text-muted leading-relaxed">Copy-paste buffers, screenshots, and standard inspection shortcut keys are strictly disabled inside sandbox.</p>
              </div>
            </div>
          </div>
          
          <button 
            onClick={requestFullScreen}
            className="w-full bg-gradient-to-r from-primary to-secondary text-white py-3 rounded-xl font-bold transition text-xs shadow-md shadow-primary/15">
            Authorize & Launch Sandbox
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = assessment.questions[currentQuestionIndex];
  const totalWarnings = warningDisplay.tabs + warningDisplay.fs;

  return (
    <div 
      className="h-screen flex flex-col bg-background text-text overflow-hidden"
      onCopy={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      {/* Confirm Submit Modal */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-surface border border-border rounded-xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-3">Submit Assessment?</h3>
            <p className="text-text-muted text-sm mb-6">Are you sure you want to submit? This action cannot be undone. All your code will be evaluated against the test cases.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowConfirmSubmit(false)}
                className="flex-1 bg-background border border-border text-text hover:bg-surface py-2.5 rounded-lg font-bold transition text-sm">
                Cancel
              </button>
              <button 
                onClick={confirmSubmit}
                className="flex-1 bg-primary hover:bg-green-600 text-white py-2.5 rounded-lg font-bold transition text-sm flex items-center justify-center gap-2">
                <CloudUpload size={16} /> Confirm Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <header className="h-12 bg-surface flex justify-between items-center px-4 shrink-0 border-b border-border">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 font-semibold text-white">
            <div className="w-8 h-8 rounded bg-surface flex items-center justify-center border border-border">
              <Code2 size={14} className="text-primary" />
            </div>
            <span className="text-sm">{assessment?.title || 'Technical Assessment'}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowConfirmSubmit(true)}
            className="bg-primary hover:bg-green-600 text-white px-4 py-1.5 rounded-md font-semibold transition flex items-center gap-2 text-xs">
            <CloudUpload size={14} /> Submit
          </button>
          {totalWarnings > 0 && (
            <div className="text-warning flex items-center gap-2 text-xs font-bold px-3 py-1 rounded-md border border-warning/20">
              <AlertTriangle size={12} />
              {warningDisplay.tabs > 0 && <span>Tabs: {warningDisplay.tabs}/2</span>}
              {warningDisplay.tabs > 0 && warningDisplay.fs > 0 && <span className="text-warning/40">|</span>}
              {warningDisplay.fs > 0 && <span>FS: {warningDisplay.fs}/2</span>}
            </div>
          )}
          <div className="flex items-center gap-2 font-mono text-sm text-text-muted">
            <Clock size={14} className={timeLeft < 300 ? 'text-error animate-pulse' : 'text-text-muted'} />
            <span className={timeLeft < 300 ? 'text-error font-bold' : ''}>{formatTime(timeLeft)}</span>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden w-full bg-background p-2">
        <PanelGroup direction="horizontal" orientation="horizontal" className="w-full h-full">
          {/* Left Panel: Question Details */}
          <Panel id="left-panel" order={1} defaultSize={50} minSize={20} maxSize={80}>
            <div className="h-full w-full bg-surface rounded-lg flex flex-col overflow-hidden select-none">
              {/* Question Navigation Bar */}
              <div className="h-10 bg-surface flex items-center px-4 justify-between shrink-0 border-b border-border">
                <div className="flex items-center gap-2 text-text font-semibold text-xs">
                  <FileText size={14} className="text-primary" /> 
                  Question {currentQuestionIndex + 1} of {assessment.questions.length}
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                    disabled={currentQuestionIndex === 0}
                    className="flex items-center gap-1 px-2 py-1 hover:bg-surface-hover text-text-muted hover:text-text rounded transition disabled:opacity-30 disabled:cursor-not-allowed text-xs">
                    <ChevronLeft size={14} /> Prev
                  </button>
                  <button 
                    onClick={() => setCurrentQuestionIndex(Math.min(assessment.questions.length - 1, currentQuestionIndex + 1))}
                    disabled={currentQuestionIndex === assessment.questions.length - 1}
                    className="flex items-center gap-1 px-2 py-1 hover:bg-surface-hover text-text-muted hover:text-text rounded transition disabled:opacity-30 disabled:cursor-not-allowed text-xs">
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              {/* Question Content */}
              <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                <h2 className="text-xl font-bold text-white mb-6">{currentQuestionIndex + 1}. {currentQuestion.title}</h2>
                
                <div 
                  className="text-text leading-relaxed leetcode-content text-sm"
                  dangerouslySetInnerHTML={{ __html: currentQuestion.description }}
                />
              </div>
            </div>
          </Panel>

          <PanelResizeHandle className="w-2 transition flex items-center justify-center group cursor-col-resize">
            <div className="w-0.5 h-8 bg-border group-hover:bg-primary transition rounded-full" />
          </PanelResizeHandle>

          {/* Right Panel: Code Editor & Console */}
          <Panel id="right-panel" order={2} defaultSize={50} minSize={20} maxSize={80}>
            <PanelGroup direction="vertical" orientation="vertical" className="w-full h-full flex flex-col">
              <Panel id="editor-panel" order={1} defaultSize={65} minSize={25}>
                <div className="h-full w-full bg-surface rounded-lg flex flex-col overflow-hidden">
                  <div className="h-10 bg-surface flex items-center px-4 justify-between shrink-0 border-b border-border">
                    <div className="flex items-center gap-2 text-text font-semibold text-xs">
                      <Code2 size={14} className="text-success" /> Code
                    </div>
                    <div className="flex gap-2 items-center">
                      <button 
                        onClick={handleRun}
                        disabled={isRunning}
                        className="bg-surface-hover hover:bg-border text-text px-3 py-1 rounded-md text-xs font-semibold transition flex items-center gap-2">
                        <Play size={12} className={isRunning ? "animate-pulse" : ""} />
                        {isRunning ? 'Running...' : 'Run'}
                      </button>
                      <select 
                        value={language}
                        onChange={(e) => handleLanguageChange(e.target.value)}
                        className="bg-surface-hover text-xs rounded-md px-2 py-1 focus:outline-none text-text cursor-pointer">
                        <option value="javascript">JavaScript</option>
                        <option value="python">Python 3</option>
                        <option value="java">Java</option>
                        <option value="cpp">C++</option>
                        <option value="sql">SQL</option>
                      </select>
                      <button 
                        onClick={() => {
                          const q = assessment.questions[currentQuestionIndex];
                          setCode(prev => {
                            const qCode = prev[q._id] ? { ...prev[q._id] } : {};
                            qCode[language] = getTemplate(q, language);
                            const next = { ...prev, [q._id]: qCode };
                            localStorage.setItem(`assessment_code_${id}_${user?.id}`, JSON.stringify(next));
                            return next;
                          });
                          addToast('Editor Reset', 'Code has been reset to the default template.', 'info', 2000);
                        }}
                        className="text-text-muted hover:text-white px-2 py-1 rounded text-xs transition">
                        ↺
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex-1 relative">
                    <Editor
                      height="100%"
                      defaultLanguage="javascript"
                      language={language}
                      theme={theme === 'dark' ? 'vs-dark' : 'light'}
                      value={code[currentQuestion._id]?.[language] ?? getTemplate(currentQuestion, language)}
                      onChange={handleCodeChange}
                      onMount={handleEditorDidMount}
                      options={{
                        automaticLayout: true,
                        minimap: { enabled: false },
                        fontSize: 14,
                        fontFamily: "Consolas, Menlo, Monaco, 'Courier New', monospace",
                        lineHeight: 24,
                        padding: { top: 16 },
                        scrollBeyondLastLine: false,
                        smoothScrolling: false,
                        cursorBlinking: "blink",
                        cursorSmoothCaretAnimation: "off"
                      }}
                    />
                  </div>
                </div>
              </Panel>

              <PanelResizeHandle className="h-2 transition flex items-center justify-center group cursor-row-resize">
                <div className="h-0.5 w-8 bg-border group-hover:bg-primary transition rounded-full" />
              </PanelResizeHandle>

              {/* Console / Test Results */}
              <Panel id="console-panel" order={2} defaultSize={35} minSize={15}>
                <div className="h-full w-full bg-surface rounded-lg flex flex-col overflow-hidden">
                  <div className="h-10 bg-surface flex items-center px-2 shrink-0 border-b border-border gap-1">
                    <button 
                      onClick={() => setConsoleTab('testcase')}
                      className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-md font-semibold transition ${consoleTab === 'testcase' ? 'bg-surface-hover text-text' : 'text-text-muted hover:text-text'}`}
                    >
                       <CheckCircle2 size={14} className="text-success" /> Testcase
                    </button>
                    <button 
                      onClick={() => setConsoleTab('result')}
                      className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-md font-semibold transition ${consoleTab === 'result' ? 'bg-surface-hover text-text' : 'text-text-muted hover:text-text'}`}
                    >
                       <TerminalSquare size={14} /> Test Result
                    </button>
                  </div>
                  
                  <div className="flex-1 p-4 overflow-y-auto custom-scrollbar bg-background/20">
                    {consoleTab === 'testcase' && (
                      <div className="space-y-4">
                        {currentQuestion.testCases && currentQuestion.testCases.map((tc, idx) => (
                          <div key={idx} className="text-sm font-mono space-y-3 pb-6 border-b border-border last:border-0">
                            <span className="text-xs font-bold text-white">Case {idx + 1}</span>
                            <div>
                              <div className="text-text-muted text-xs mb-1 font-sans font-medium">Input</div>
                              <div className="bg-surface-hover p-3 rounded-md whitespace-pre-wrap text-text">{tc.input}</div>
                            </div>
                            <div>
                              <div className="text-text-muted text-xs mb-1 font-sans font-medium">Expected Output</div>
                              <div className="bg-surface-hover p-3 rounded-md whitespace-pre-wrap text-text">{tc.expectedOutput}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {consoleTab === 'result' && (
                      <>
                        {!output && <span className="text-text-muted italic font-mono text-sm">Run your code to see test case results here...</span>}
                        {output?.status === 'running' && (
                          <div className="flex items-center gap-3">
                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            <span className="text-text-muted font-mono text-sm">Running all test cases...</span>
                          </div>
                        )}
                        {output?.status === 'error' && <span className="text-error font-mono text-sm whitespace-pre-wrap">{output.message}</span>}
                        {output?.status === 'completed' && (
                          <div>
                            <div className="mb-4 flex items-center gap-4">
                              <h2 className={`font-bold text-xl ${output.data.passedCases === output.data.totalCases ? 'text-success' : 'text-error'}`}>
                                 {output.data.passedCases === output.data.totalCases ? 'Accepted' : 'Wrong Answer'}
                              </h2>
                              <span className="text-text-muted text-sm">
                                 Runtime: {output.data.results[0]?.time || '0'} ms
                              </span>
                            </div>
                            
                            {/* Case tabs */}
                            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 custom-scrollbar">
                              {output.data.results.map((r, i) => (
                                 <button 
                                   key={i} 
                                   onClick={() => setSelectedResultIndex(i)}
                                   className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold transition ${selectedResultIndex === i ? 'bg-primary/20 text-primary border border-primary/30' : r.status === 'Passed' ? 'bg-surface-hover text-text' : 'bg-error/10 text-error'}`}
                                 >
                                   <div className={`w-1.5 h-1.5 rounded-full ${r.status === 'Passed' ? 'bg-success' : 'bg-error'}`}></div>
                                   Case {i + 1}
                                 </button>
                              ))}
                            </div>

                            {(() => {
                              const r = output.data.results[selectedResultIndex];
                              if (!r) return null;
                              return (
                                <div className="text-sm font-mono space-y-4 pb-6">
                                  {r.isHidden ? (
                                    <div className="text-text-muted italic text-xs">Hidden Test Case</div>
                                  ) : (
                                    <>
                                      <div>
                                        <div className="text-text-muted text-xs mb-1 font-sans font-medium">Input</div>
                                        <div className="bg-surface-hover p-3 rounded-md whitespace-pre-wrap text-text select-text">{r.input}</div>
                                      </div>
                                      <div>
                                        <div className="text-text-muted text-xs mb-1 font-sans font-medium">Expected Output</div>
                                        <div className="bg-surface-hover p-3 rounded-md whitespace-pre-wrap text-text select-text">{r.expectedOutput}</div>
                                      </div>
                                      <div>
                                        <div className="text-text-muted text-xs mb-1 font-sans font-medium">Your Output</div>
                                        <div className={`p-3 rounded-md whitespace-pre-wrap text-text select-text ${r.status === 'Passed' ? 'bg-surface-hover' : 'bg-error/10'}`}>
                                          {r.actualOutput || <span className="opacity-50 italic">No output</span>}
                                        </div>
                                      </div>
                                      {r.consoleLogs && (
                                        <div>
                                          <div className="text-text-muted text-xs mb-1 font-sans font-medium">Stdout / Console Output</div>
                                          <pre className="bg-background/80 border border-border/80 p-3 rounded-md whitespace-pre-wrap text-emerald-400 font-mono text-xs max-h-40 overflow-y-auto leading-relaxed select-text">
                                            {r.consoleLogs}
                                          </pre>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}

export default AssessmentArena;
