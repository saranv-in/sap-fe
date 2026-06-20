import { useState, useEffect } from 'react';
import useAuthStore from '../store/useAuthStore';
import api from '../services/api';
import { Plus, Link as LinkIcon, Save, Layers, ListTodo, ShieldAlert, Award, FileText, CheckCircle, Edit2, Trash2 } from 'lucide-react';

function AdminDashboard() {
  const user = useAuthStore((state) => state.user);
  const [activeTab, setActiveTab] = useState('questions');
  
  // Questions State
  const [questions, setQuestions] = useState([]);
  const [leetCodeUrl, setLeetCodeUrl] = useState('');
  const [scraping, setScraping] = useState(false);
  const [scrapeMessage, setScrapeMessage] = useState('');

  // Assessment State
  const [assessments, setAssessments] = useState([]);
  const [moduleTitle, setModuleTitle] = useState('');
  const [moduleDuration, setModuleDuration] = useState(60);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [questionCount, setQuestionCount] = useState(0);
  const [editingAssessmentId, setEditingAssessmentId] = useState(null);

  // Reports State
  const [selectedAssessmentReport, setSelectedAssessmentReport] = useState(null);
  const [reportData, setReportData] = useState([]);
  const [loadingReport, setLoadingReport] = useState(false);
  
  useEffect(() => {
    fetchQuestions();
    fetchAssessments();
  }, []);

  const fetchQuestions = async () => {
    try {
      const res = await api.get('/questions');
      setQuestions(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAssessments = async () => {
    try {
      const res = await api.get('/assessments');
      setAssessments(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleScrape = async (e) => {
    e.preventDefault();
    if (!leetCodeUrl) return;
    setScraping(true);
    setScrapeMessage('Syncing with LeetCode API...');
    try {
      const res = await api.post('/questions/scrape-leetcode', { url: leetCodeUrl });
      setScrapeMessage(`Successfully synced problem: ${res.data.title}`);
      setLeetCodeUrl('');
      fetchQuestions();
    } catch (err) {
      setScrapeMessage(err.response?.data?.message || 'Error scraping LeetCode');
    } finally {
      setScraping(false);
    }
  };

  const fetchReport = async (assessmentId) => {
    setLoadingReport(true);
    setSelectedAssessmentReport(assessmentId);
    try {
      const res = await api.get(`/reports/assessment/${assessmentId}`);
      setReportData(res.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Error loading report');
    } finally {
      setLoadingReport(false);
    }
  };

  const handleCreateModule = async (e) => {
    e.preventDefault();
    if (selectedQuestions.length === 0) {
      alert('Please select at least one question for the module.');
      return;
    }
    
    const payload = {
      title: moduleTitle,
      duration: moduleDuration,
      questions: selectedQuestions,
      questionCount: parseInt(questionCount) || 0
    };

    try {
      if (editingAssessmentId) {
        await api.put(`/assessments/${editingAssessmentId}`, payload);
        alert('Module Updated Successfully!');
      } else {
        await api.post('/assessments', payload);
        alert('Module Created Successfully!');
      }
      handleCancelEdit();
      fetchAssessments();
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving module');
    }
  };

  const handleStartEdit = (assessment) => {
    setEditingAssessmentId(assessment._id);
    setModuleTitle(assessment.title);
    setModuleDuration(assessment.duration);
    setQuestionCount(assessment.questionCount || 0);
    setSelectedQuestions(assessment.questions.map(q => q._id));
  };

  const handleCancelEdit = () => {
    setEditingAssessmentId(null);
    setModuleTitle('');
    setModuleDuration(60);
    setQuestionCount(0);
    setSelectedQuestions([]);
  };

  const handleDeleteModule = async (assessmentId) => {
    if (!window.confirm('Are you sure you want to delete this module? This will also purge associated student submissions.')) {
      return;
    }
    try {
      await api.delete(`/assessments/${assessmentId}`);
      alert('Module Deleted Successfully!');
      if (editingAssessmentId === assessmentId) {
        handleCancelEdit();
      }
      fetchAssessments();
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting module');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto w-full font-sans">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-surface to-surface-hover border border-border/80 p-6 rounded-2xl mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-primary bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20">
            Institution Console
          </span>
          <h2 className="text-2xl font-extrabold text-white mt-3 tracking-tight">Recruitment Coordinator Dashboard</h2>
          <p className="text-xs text-text-muted mt-1">Configure code assessment slots, import questions, and monitor candidate records.</p>
        </div>
        <div className="flex gap-2">
          <div className="bg-background/50 border border-border/80 px-4 py-2 rounded-xl text-center">
            <div className="text-base font-bold text-white leading-none">{questions.length}</div>
            <span className="text-[9px] text-text-muted uppercase">Challenges</span>
          </div>
          <div className="bg-background/50 border border-border/80 px-4 py-2 rounded-xl text-center">
            <div className="text-base font-bold text-white leading-none">{assessments.length}</div>
            <span className="text-[9px] text-text-muted uppercase">Modules</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 bg-surface/30 p-1.5 rounded-xl border border-border/60 max-w-md">
        <button 
          onClick={() => setActiveTab('questions')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all ${activeTab === 'questions' ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:text-white'}`}>
          <ListTodo size={14} /> Problem Bank
        </button>
        <button 
          onClick={() => setActiveTab('modules')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all ${activeTab === 'modules' ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:text-white'}`}>
          <Layers size={14} /> Setup Modules
        </button>
        <button 
          onClick={() => setActiveTab('reports')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all ${activeTab === 'reports' ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:text-white'}`}>
          📊 Reports
        </button>
      </div>

      {/* Contents */}
      {activeTab === 'questions' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2 bg-surface/50 border border-border/80 p-6 rounded-2xl h-fit backdrop-blur-sm">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <LinkIcon size={18} className="text-primary"/> Sync LeetCode Problem
            </h3>
            <p className="text-xs text-text-muted mb-6 leading-relaxed">
              Import challenges from LeetCode. Paste a public problem URL to parse descriptions, constraints, default headers, and test cases.
            </p>
            <form onSubmit={handleScrape} className="space-y-4">
              <input 
                type="url" 
                placeholder="https://leetcode.com/problems/two-sum/" 
                className="w-full bg-background/50 border border-border/80 rounded-xl p-3.5 text-white text-xs focus:outline-none focus:border-primary/80 transition-all placeholder-text-muted/40"
                value={leetCodeUrl}
                onChange={(e) => setLeetCodeUrl(e.target.value)}
                required
              />
              <button 
                type="submit" 
                disabled={scraping}
                className="w-full bg-gradient-to-r from-primary to-secondary text-white font-bold py-3 px-6 rounded-xl transition flex justify-center items-center gap-2 text-xs shadow-md shadow-primary/10">
                {scraping ? 'Syncing...' : <><Save size={14} /> Sync Problem</>}
              </button>
            </form>
            {scrapeMessage && (
              <div className={`mt-4 p-3 rounded-xl text-xs font-bold border ${scrapeMessage.includes('Error') || scrapeMessage.includes('Invalid') ? 'bg-error/10 border-error/20 text-error' : 'bg-success/10 border-success/20 text-success'}`}>
                {scrapeMessage}
              </div>
            )}
          </div>

          <div className="lg:col-span-3 bg-surface/50 border border-border/80 p-6 rounded-2xl backdrop-blur-sm">
            <h3 className="text-base font-bold text-white mb-5">Challenge Repository</h3>
            <div className="max-h-[28rem] overflow-y-auto custom-scrollbar space-y-3 pr-2">
              {questions.map((q) => (
                <div key={q._id} className="bg-background/40 border border-border/60 p-4 rounded-xl flex justify-between items-center transition hover:border-primary/40">
                  <div className="space-y-1">
                    <h4 className="font-bold text-white text-sm tracking-tight">{q.title}</h4>
                    <div className="flex items-center gap-3 text-[10px] text-text-muted font-semibold">
                      <span className={`px-2 py-0.5 rounded font-extrabold ${
                        q.difficulty === 'Easy' ? 'bg-success/10 text-success border border-success/20' :
                        q.difficulty === 'Medium' ? 'bg-warning/10 text-warning border border-warning/20' :
                        'bg-error/10 text-error border border-error/20'
                      }`}>{q.difficulty}</span>
                      <span>•</span>
                      <span>{q.testCases?.length || 0} Test Cases</span>
                    </div>
                  </div>
                </div>
              ))}
              {questions.length === 0 && (
                <div className="text-center py-12 bg-background/20 rounded-xl border border-dashed border-border/80">
                  <p className="text-xs text-text-muted italic">No coding questions imported yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'modules' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2 bg-surface/50 border border-border/80 p-6 rounded-2xl backdrop-blur-sm">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Layers size={18} className="text-primary"/> {editingAssessmentId ? 'Modify Drive Module' : 'Design Assessment Slot'}
            </h3>
            <p className="text-xs text-text-muted mb-6 leading-relaxed">Create assessments for placement tests by selecting duration constraints and mapping questions.</p>
            <form onSubmit={handleCreateModule} className="space-y-4">
              <div>
                <label className="block text-white font-medium mb-1.5 text-xs">Module Title</label>
                <input 
                  type="text" 
                  className="w-full bg-background/50 border border-border/80 rounded-lg p-3 text-white text-xs focus:outline-none focus:border-primary"
                  value={moduleTitle}
                  onChange={(e) => setModuleTitle(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-white font-medium mb-1.5 text-xs">Test Duration (Minutes)</label>
                <input 
                  type="number" 
                  className="w-full bg-background/50 border border-border/80 rounded-lg p-3 text-white text-xs focus:outline-none focus:border-primary"
                  value={moduleDuration}
                  onChange={(e) => setModuleDuration(e.target.value)}
                  required min="1"
                />
              </div>
              <div>
                <label className="block text-white font-medium mb-1.5 text-xs">Number of Questions per Candidate (0 to ask all)</label>
                <input 
                  type="number" 
                  className="w-full bg-background/50 border border-border rounded-lg p-3 text-white text-xs focus:outline-none focus:border-primary"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(e.target.value)}
                  required min="0"
                />
              </div>
              <div>
                <label className="block text-white font-medium mb-2 text-xs">Select Question Mappings</label>
                <div className="max-h-56 overflow-y-auto custom-scrollbar border border-border/80 rounded-xl bg-background/30 p-2 space-y-1.5">
                  {questions.map((q) => (
                    <label key={q._id} className="flex items-center gap-3 p-2 hover:bg-surface-hover rounded-lg cursor-pointer transition">
                      <input 
                        type="checkbox" 
                        className="accent-primary w-4 h-4 rounded"
                        checked={selectedQuestions.includes(q._id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedQuestions([...selectedQuestions, q._id]);
                          else setSelectedQuestions(selectedQuestions.filter(id => id !== q._id));
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{q.title}</p>
                        <p className="text-[10px] text-text-muted font-mono">{q.difficulty}</p>
                      </div>
                    </label>
                  ))}
                  {questions.length === 0 && <p className="text-text-muted text-xs italic p-2">No questions available. Sync LeetCode problems first!</p>}
                </div>
              </div>
              <div className="flex gap-2">
                {editingAssessmentId && (
                  <button 
                    type="button"
                    onClick={handleCancelEdit}
                    className="flex-1 bg-surface border border-border/80 text-white font-bold py-3 rounded-xl transition text-xs hover:bg-surface-hover">
                    Cancel
                  </button>
                )}
                <button 
                  type="submit" 
                  className="flex-1 bg-gradient-to-r from-primary to-secondary text-white font-bold py-3 rounded-xl transition flex justify-center items-center gap-2 text-xs shadow-md shadow-primary/10">
                  {editingAssessmentId ? <Save size={14} /> : <Plus size={14} />}
                  {editingAssessmentId ? 'Save Changes' : 'Create Drive Module'}
                </button>
              </div>
            </form>
          </div>

          <div className="lg:col-span-3 bg-surface/50 border border-border/80 p-6 rounded-2xl backdrop-blur-sm">
            <h3 className="text-base font-bold text-white mb-5">Active Drive Modules</h3>
            <div className="space-y-4 max-h-[30rem] overflow-y-auto custom-scrollbar pr-1">
              {assessments.map((a) => (
                <div key={a._id} className="bg-background/40 border border-border/60 p-5 rounded-xl transition hover:border-primary/40">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-white text-base tracking-tight">{a.title}</h4>
                    <span className="bg-primary/10 border border-primary/20 text-primary text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">{a.duration} Mins</span>
                  </div>
                  <p className="text-xs text-text-muted">
                    Pool Size: {a.questions?.length || 0} • Candidates Answer: {a.questionCount && a.questionCount > 0 ? a.questionCount : a.questions?.length || 0}
                  </p>
                  <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleStartEdit(a)}
                        className="text-text-muted hover:text-white p-1.5 rounded hover:bg-surface-hover transition-colors"
                        title="Edit Module"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button 
                        onClick={() => handleDeleteModule(a._id)}
                        className="text-error hover:text-rose-400 p-1.5 rounded hover:bg-error/10 transition-colors"
                        title="Delete Module"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-text-muted font-medium">Validation Code:</span>
                      <code className="bg-surface border border-border px-3 py-1 rounded-lg text-primary font-mono font-bold text-xs tracking-widest">{a.secretCode}</code>
                    </div>
                  </div>
                </div>
              ))}
              {assessments.length === 0 && (
                <div className="text-center py-12 bg-background/20 rounded-xl border border-dashed border-border/80">
                  <p className="text-xs text-text-muted italic">No assessments created yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2 bg-surface/50 border border-border/80 p-6 rounded-2xl backdrop-blur-sm">
            <h3 className="text-base font-bold text-white mb-4">Select Evaluation Module</h3>
            <div className="space-y-3">
              {assessments.map((a) => (
                <button
                  key={a._id}
                  onClick={() => fetchReport(a._id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selectedAssessmentReport === a._id 
                      ? 'border-primary bg-primary/10 text-white' 
                      : 'border-border/80 bg-background/40 text-text-muted hover:border-primary/50 hover:text-white'
                  }`}>
                  <div className="font-bold text-sm text-white tracking-tight">{a.title}</div>
                  <div className="text-[10px] text-text-muted mt-1 font-semibold">{a.questions?.length || 0} Questions • Key: {a.secretCode}</div>
                </button>
              ))}
              {assessments.length === 0 && (
                <div className="text-center py-12 bg-background/20 rounded-xl border border-dashed border-border/80">
                  <p className="text-xs text-text-muted italic">No assessment drive modules.</p>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-3 bg-surface/50 border border-border/80 p-6 rounded-2xl backdrop-blur-sm overflow-hidden flex flex-col">
            <h3 className="text-base font-bold text-white mb-5">Candidate Violations & Results</h3>
            {loadingReport && <p className="text-xs text-text-muted animate-pulse">Retrieving test metrics...</p>}
            {!selectedAssessmentReport && !loadingReport && (
              <div className="text-center py-16">
                <FileText className="text-text-muted/40 mx-auto mb-3" size={32} />
                <p className="text-xs text-text-muted italic">Select a drive module to view scorecard sheet.</p>
              </div>
            )}
            {selectedAssessmentReport && !loadingReport && (
              reportData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border/80 text-text-muted text-left">
                        <th className="pb-3.5 font-bold">Candidate</th>
                        <th className="pb-3.5 font-bold">Performance</th>
                        <th className="pb-3.5 font-bold">Proctor Logs</th>
                        <th className="pb-3.5 font-bold">Verdict</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {reportData.map((r, idx) => {
                        const pct = r.maxPossibleScore > 0 ? Math.round((r.totalScore / r.maxPossibleScore) * 100) : 0;
                        return (
                          <tr key={idx} className="hover:bg-background/20 transition-all">
                            <td className="py-3.5 pr-2">
                              <p className="font-bold text-white text-xs">{r.user?.name}</p>
                              <p className="text-[10px] text-text-muted truncate mt-0.5">{r.user?.email}</p>
                            </td>
                            <td className="py-3.5 pr-2">
                              <div className="flex items-center gap-2">
                                <div className="w-16 bg-background rounded-full h-1.5 overflow-hidden">
                                  <div 
                                    className={`h-1.5 rounded-full ${pct >= 70 ? 'bg-success' : pct >= 40 ? 'bg-warning' : 'bg-error'}`} 
                                    style={{width: `${pct}%`}}
                                  />
                                </div>
                                <span className={`font-bold ${pct >= 70 ? 'text-success' : pct >= 40 ? 'text-warning' : 'text-error'}`}>{pct}%</span>
                              </div>
                              <span className="text-[9px] text-text-muted font-mono">{r.totalScore}/{r.maxPossibleScore} pts</span>
                            </td>
                            <td className="py-3.5 pr-2 space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${r.tabSwitches > 0 ? 'bg-warning animate-pulse' : 'bg-success'}`} />
                                <span className="text-[10px] text-text-muted">Tabs: {r.tabSwitches}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${r.fullScreenExits > 0 ? 'bg-warning animate-pulse' : 'bg-success'}`} />
                                <span className="text-[10px] text-text-muted">Escapes: {r.fullScreenExits}</span>
                              </div>
                            </td>
                            <td className="py-3.5">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-extrabold border ${
                                r.terminationReason === 'Normal' && r.tabSwitches < 2 && r.fullScreenExits < 2
                                  ? 'bg-success/10 border-success/20 text-success' 
                                  : 'bg-error/10 border-error/20 text-error'
                              }`}>
                                {r.terminationReason === 'Normal' && r.tabSwitches < 2 && r.fullScreenExits < 2 ? (
                                  <><CheckCircle size={10} /> Validated</>
                                ) : (
                                  <><ShieldAlert size={10} /> Terminated</>
                                )}
                              </span>
                              <p className="text-[8px] text-text-muted mt-1 uppercase tracking-wider">{r.terminationReason}</p>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-16 bg-background/20 rounded-xl border border-dashed border-border/80">
                  <p className="text-xs text-text-muted italic">No candidate submissions recorded yet for this module.</p>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;

