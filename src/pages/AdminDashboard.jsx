import { useState, useEffect } from 'react';
import useAuthStore from '../store/useAuthStore';
import api from '../services/api';
import { Plus, Link as LinkIcon, Save, Layers, ListTodo, ShieldAlert, Award, FileText, CheckCircle, Edit2, Trash2, X } from 'lucide-react';

function AdminDashboard() {
  const user = useAuthStore((state) => state.user);
  const [activeTab, setActiveTab] = useState('questions');
  
  // Questions State
  const [questions, setQuestions] = useState([]);
  const [leetCodeUrl, setLeetCodeUrl] = useState('');
  const [scraping, setScraping] = useState(false);
  const [scrapeMessage, setScrapeMessage] = useState('');
  const [selectedQuestionForTestCases, setSelectedQuestionForTestCases] = useState(null);
  const [modalTestCases, setModalTestCases] = useState([]);
  const [savingTestCases, setSavingTestCases] = useState(false);

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

  const handleOpenTestCasesModal = (question) => {
    setSelectedQuestionForTestCases(question);
    setModalTestCases(question.testCases || []);
  };

  const handleCloseTestCasesModal = () => {
    setSelectedQuestionForTestCases(null);
    setModalTestCases([]);
  };

  const handleAddTestCase = () => {
    setModalTestCases([
      ...modalTestCases,
      { input: '', expectedOutput: '', isHidden: true }
    ]);
  };

  const handleUpdateTestCaseField = (idx, field, value) => {
    const updated = [...modalTestCases];
    updated[idx] = { ...updated[idx], [field]: value };
    setModalTestCases(updated);
  };

  const handleDeleteTestCase = (idx) => {
    setModalTestCases(modalTestCases.filter((_, i) => i !== idx));
  };

  const handleSaveTestCases = async () => {
    if (!selectedQuestionForTestCases) return;
    setSavingTestCases(true);
    try {
      await api.put(`/questions/${selectedQuestionForTestCases._id}`, {
        testCases: modalTestCases
      });
      alert('Test cases updated successfully!');
      handleCloseTestCasesModal();
      fetchQuestions();
    } catch (err) {
      alert(err.response?.data?.message || 'Error updating test cases');
    } finally {
      setSavingTestCases(false);
    }
  };

  const handleDeleteQuestion = async (qId) => {
    if (!window.confirm('Are you sure you want to delete this challenge from the Problem Bank?')) return;
    try {
      await api.delete(`/questions/${qId}`);
      alert('Challenge deleted successfully!');
      fetchQuestions();
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting challenge');
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

  const downloadExcelReport = () => {
    if (!selectedAssessmentReport || reportData.length === 0) return;
    
    // Find selected assessment title
    const selectedAss = assessments.find(a => a._id === selectedAssessmentReport);
    const title = selectedAss ? selectedAss.title : 'Assessment';

    // CSV Headers
    const headers = [
      'Candidate Name',
      'Candidate Email',
      'Score (%)',
      'Points Obtained',
      'Max Points',
      'Tab Switches',
      'Fullscreen Escapes',
      'Termination Reason',
      'Verdict'
    ];

    // CSV Rows
    const rows = reportData.map(r => {
      const pct = r.maxPossibleScore > 0 ? Math.round((r.totalScore / r.maxPossibleScore) * 100) : 0;
      const verdict = r.terminationReason === 'Normal' && r.tabSwitches < 2 && r.fullScreenExits < 2
        ? 'Validated'
        : 'Terminated';
      
      return [
        `"${(r.user?.name || '').replace(/"/g, '""')}"`,
        `"${(r.user?.email || '').replace(/"/g, '""')}"`,
        pct,
        r.totalScore,
        r.maxPossibleScore,
        r.tabSwitches,
        r.fullScreenExits,
        r.terminationReason,
        verdict
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');

    // Create a blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${title.replace(/\s+/g, '_')}_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
                <div key={q._id} className="bg-background/40 border border-border/60 p-4 rounded-xl flex justify-between items-center transition hover:border-primary/40 gap-4">
                  <div className="space-y-1 min-w-0 flex-1">
                    <h4 className="font-bold text-white text-sm tracking-tight truncate">{q.title}</h4>
                    <div className="flex items-center gap-3 text-[10px] text-text-muted font-semibold">
                      <span className={`px-2 py-0.5 rounded font-extrabold ${
                        q.difficulty === 'Easy' ? 'bg-success/10 text-success border border-success/20' :
                        q.difficulty === 'Medium' ? 'bg-warning/10 text-warning border border-warning/20' :
                        'bg-error/10 text-error border border-error/20'
                      }`}>{q.difficulty}</span>
                      <span>•</span>
                      <span>{q.testCases?.length || 0} Test Cases ({q.testCases?.filter(t => t.isHidden).length || 0} Hidden)</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    <button 
                      onClick={() => handleOpenTestCasesModal(q)}
                      className="bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <Edit2 size={12} /> Test Cases
                    </button>
                    <button 
                      onClick={() => handleDeleteQuestion(q._id)}
                      className="bg-error/10 hover:bg-error/20 border border-error/20 text-error hover:text-rose-400 p-2 rounded-lg text-xs font-bold transition"
                      title="Delete Challenge"
                    >
                      <Trash2 size={12} />
                    </button>
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
            <div className="flex justify-between items-center mb-5 shrink-0">
              <h3 className="text-base font-bold text-white">Candidate Violations & Results</h3>
              {selectedAssessmentReport && reportData.length > 0 && (
                <button
                  onClick={downloadExcelReport}
                  className="bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary hover:text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                >
                  <FileText size={14} /> Download Excel
                </button>
              )}
            </div>
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
      {/* Manage Test Cases Modal */}
      {selectedQuestionForTestCases && (
        <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-slide-in animate-duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-border/80 flex justify-between items-center bg-background/50">
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Manage Test Cases for: {selectedQuestionForTestCases.title}
                </h3>
                <p className="text-[10px] text-text-muted mt-0.5 font-medium">
                  Verify challenge constraints. Hidden test cases are not shown to students but are checked on submission.
                </p>
              </div>
              <button 
                onClick={handleCloseTestCasesModal}
                className="text-text-muted hover:text-white p-1 rounded-lg hover:bg-surface-hover transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-background/20">
              <div className="flex justify-between items-center">
                <span className="text-xs text-text-muted font-bold font-mono">
                  {modalTestCases.length} Test Case(s)
                </span>
                <button
                  type="button"
                  onClick={handleAddTestCase}
                  className="bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Plus size={14} /> Add Test Case
                </button>
              </div>

              <div className="space-y-4">
                {modalTestCases.map((tc, idx) => (
                  <div key={idx} className="bg-background/40 border border-border/60 p-4 rounded-xl space-y-3 relative">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-white">Test Case #{idx + 1}</span>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer text-xs text-text-muted select-none">
                          <input 
                            type="checkbox"
                            className="accent-primary w-4 h-4 rounded cursor-pointer"
                            checked={tc.isHidden ?? false}
                            onChange={(e) => handleUpdateTestCaseField(idx, 'isHidden', e.target.checked)}
                          />
                          Hidden Case
                        </label>
                        <button
                          type="button"
                          onClick={() => handleDeleteTestCase(idx)}
                          className="text-error hover:bg-error/10 hover:text-rose-400 p-1.5 rounded transition"
                          title="Delete Case"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] text-text-muted mb-1 font-mono uppercase tracking-wider">Input Parameter(s)</label>
                        <textarea
                          rows={2}
                          className="w-full bg-background border border-border rounded-lg p-2.5 text-xs text-white font-mono focus:outline-none focus:border-primary transition"
                          placeholder="e.g. [2, 7, 11, 15] or raw inputs..."
                          value={tc.input}
                          onChange={(e) => handleUpdateTestCaseField(idx, 'input', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-text-muted mb-1 font-mono uppercase tracking-wider">Expected Output</label>
                        <textarea
                          rows={2}
                          className="w-full bg-background border border-border rounded-lg p-2.5 text-xs text-white font-mono focus:outline-none focus:border-primary transition"
                          placeholder="e.g. [0, 1] or raw outputs..."
                          value={tc.expectedOutput}
                          onChange={(e) => handleUpdateTestCaseField(idx, 'expectedOutput', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {modalTestCases.length === 0 && (
                  <div className="text-center py-12 bg-background/20 rounded-xl border border-dashed border-border/80">
                    <p className="text-xs text-text-muted italic">No test cases set up. Add one above to begin.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-border/80 flex justify-end gap-3 bg-background/50">
              <button
                type="button"
                onClick={handleCloseTestCasesModal}
                className="bg-surface border border-border/80 text-white px-5 py-2.5 rounded-lg text-xs font-bold transition hover:bg-surface-hover"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingTestCases}
                onClick={handleSaveTestCases}
                className="bg-primary hover:bg-primary/95 text-white px-6 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-primary/10"
              >
                <Save size={14} />
                {savingTestCases ? 'Saving...' : 'Save Test Cases'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;

