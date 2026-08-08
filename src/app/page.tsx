'use client';

import React, { useState, useEffect, useRef } from 'react';

type ViewType = 'landing' | 'upload' | 'processing' | 'dashboard' | 'cross-check' | 'wound' | 'timeline' | 'labs' | 'medications' | 'chat';

export default function Home() {
  const [currentView, setCurrentView] = useState<ViewType>('landing');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [procStep, setProcStep] = useState(0);

  // Patient & Session Data
  const [patientName, setPatientName] = useState<string>('—');
  const [patientMeta, setPatientMeta] = useState<string>('—');
  const [allergies, setAllergies] = useState<string[]>([]);
  const [stats, setStats] = useState({ docs: 0, visits: 0, meds: 0, risks: 0 });
  const [keyFindings, setKeyFindings] = useState<any[]>([]);

  // Timeline
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [timelineFilter, setTimelineFilter] = useState('all');

  // Lab Trends
  const [labTrends, setLabTrends] = useState<any[]>([]);
  const [labSummary, setLabSummary] = useState('');

  // Medications
  const [medications, setMedications] = useState<any[]>([]);
  const [riskFlags, setRiskFlags] = useState<any[]>([]);

  // Wound Analyzer State
  const [woundImage, setWoundImage] = useState<string | null>(null);
  const [woundNotes, setWoundNotes] = useState('');
  const [woundLoading, setWoundLoading] = useState(false);
  const [woundResult, setWoundResult] = useState<any>(null);

  // Chat State
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatLang, setChatLang] = useState<'en' | 'ta'>('en');

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const showToast = (msg: string, type: string = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Switch views
  const navigateTo = (view: ViewType) => {
    setCurrentView(view);
    if (view === 'timeline' && sessionId) fetchTimeline(sessionId);
    if (view === 'labs' && sessionId) fetchLabs(sessionId);
    if (view === 'medications' && sessionId) fetchMeds(sessionId);
    if (view === 'cross-check' && sessionId) fetchCrossCheck(sessionId);
  };

  // Demo loader
  const loadDemo = async () => {
    setIsProcessing(true);
    setCurrentView('processing');
    setProcStep(1);

    try {
      const res = await fetch('/api/demo', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSessionId(data.data.sessionId);
        setProcStep(4);
        setTimeout(() => {
          setIsProcessing(false);
          loadSessionData(data.data.sessionId);
          setCurrentView('dashboard');
          showToast('Demo dataset (Sarah Johnson) loaded successfully!', 'success');
        }, 1000);
      }
    } catch (e: any) {
      showToast('Failed to load demo: ' + e.message, 'error');
      setCurrentView('upload');
      setIsProcessing(false);
    }
  };

  // Load session data after analysis or demo
  const loadSessionData = async (sId: string) => {
    fetchTimeline(sId);
    fetchLabs(sId);
    fetchMeds(sId);
  };

  const fetchTimeline = async (sId: string) => {
    try {
      const res = await fetch(`/api/timeline/${sId}`);
      const d = await res.json();
      if (d.success) {
        setTimelineEvents(d.data.events || []);
        if (d.data.patient) {
          setPatientName(d.data.patient.name || 'Sarah Johnson');
          setPatientMeta(`${d.data.patient.age || 52} yrs • ${d.data.patient.gender || 'Female'}`);
          setAllergies(d.data.patient.allergies || []);
        }
      }
    } catch {}
  };

  const fetchLabs = async (sId: string) => {
    try {
      const res = await fetch(`/api/analyze-labs/${sId}`);
      const d = await res.json();
      if (d.success) {
        setLabTrends(d.data.labTrends || []);
        setLabSummary(d.data.overallSummary || '');
      }
    } catch {}
  };

  const fetchMeds = async (sId: string) => {
    try {
      const res = await fetch(`/api/check-medications/${sId}`);
      const d = await res.json();
      if (d.success) {
        setMedications(d.data.currentMedications || []);
        setRiskFlags(d.data.risks || []);
        setStats({
          docs: d.data.documentCount || 3,
          visits: 3,
          meds: (d.data.currentMedications || []).length,
          risks: (d.data.risks || []).length,
        });
      }
    } catch {}
  };

  const fetchCrossCheck = async (sId: string) => {
    try {
      const res = await fetch('/api/cross-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientRecord: {
            name: patientName,
            age: 52,
            gender: 'Female',
            medications,
            allergies,
          },
        }),
      });
      const d = await res.json();
      if (d.success) {
        setRiskFlags(d.riskFlags || []);
      }
    } catch {}
  };

  // Upload handler
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...files]);
    }
  };

  const analyzeDocs = async () => {
    if (selectedFiles.length === 0) return;
    setIsProcessing(true);
    setCurrentView('processing');
    setProcStep(1);

    try {
      const formData = new FormData();
      selectedFiles.forEach((f) => formData.append('documents', f));

      const upRes = await fetch('/api/upload-documents', { method: 'POST', body: formData });
      const upData = await upRes.json();

      if (!upData.success) throw new Error(upData.message);

      const sId = upData.data.sessionId;
      setSessionId(sId);
      setProcStep(2);

      const extRes = await fetch('/api/extract-medical-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sId }),
      });
      const extData = await extRes.json();

      if (extData.success) {
        setProcStep(4);
        setTimeout(() => {
          setIsProcessing(false);
          loadSessionData(sId);
          setCurrentView('dashboard');
          showToast('Analysis completed successfully!', 'success');
        }, 1000);
      }
    } catch (err: any) {
      showToast('Error during document analysis: ' + err.message, 'error');
      setCurrentView('upload');
      setIsProcessing(false);
    }
  };

  // Wound Analyzer
  const handleWoundImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setWoundImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const analyzeWound = async () => {
    if (!woundImage) return;
    setWoundLoading(true);
    try {
      const res = await fetch('/api/wound/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: woundImage, userNotes: woundNotes }),
      });
      const d = await res.json();
      if (d.success) {
        setWoundResult(d.woundAnalysis);
        showToast('Wound triage analysis complete!', 'success');
      }
    } catch (e: any) {
      showToast('Wound analysis failed: ' + e.message, 'error');
    } finally {
      setWoundLoading(false);
    }
  };

  // Chat
  const sendChatMessage = async (overrideMsg?: string) => {
    const msg = overrideMsg || chatInput;
    if (!msg.trim()) return;

    const userMsg = { role: 'user', text: msg };
    setChatMessages((prev) => [...prev, userMsg]);
    if (!overrideMsg) setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId || 'demo_session',
          message: msg,
          language: chatLang,
        }),
      });
      const d = await res.json();
      if (d.success) {
        setChatMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            text: d.data.answer || d.data.text,
            confidence: d.data.confidence || d.data.confidenceScore,
            findings: d.data.keyFindings,
            disclaimer: d.data.disclaimer,
          },
        ]);
      }
    } catch (e: any) {
      setChatMessages((prev) => [...prev, { role: 'ai', text: 'Error getting AI response.' }]);
    } finally {
      setChatLoading(false);
    }
  };



  if (currentView === 'landing') {
    return (
      <div className="landing-page-wrapper">
        
    <nav className="navbar">
        <a href="#" className="nav-logo" onClick={(e) => { e.preventDefault(); navigateTo('dashboard'); }}>
            <i className='bx bx-pulse'></i>
            MedScan AI
        </a>
        <div className="nav-links">
            <a href="#features" className="nav-link">Features</a>
            <a href="#how-it-works" className="nav-link">How It Works</a>
            <a href="#privacy" className="nav-link">Privacy</a>
            <button onClick={() => navigateTo('upload')} className="btn btn-primary btn-sm">Open App</button>
        </div>
    </nav>

    {/* Hero Section */}
    <section className="hero slide-up">
        <div className="hero-content">
            <div className="hero-badge">
                <i className='bx bx-plus-medical'></i>
                 AI HEALTHCARE INTELLIGENCE
            </div>
            <h1>Understand Your Medical History with AI</h1>
            <p>Upload multiple medical documents. Detect risks, track health changes, and understand your records clearly.</p>
            <div className="hero-actions">
                <button onClick={() => navigateTo('upload')} className="btn btn-primary">Analyze My Medical Records</button>
                <button onClick={loadDemo} className="btn btn-secondary"><i className='bx bx-play-circle'></i> Try Demo</button>
            </div>
            <div className="trust-row">
                <div className="trust-item"><i className='bx bxs-lock-alt'></i> Private & Secure</div>
                <div className="trust-item"><i className='bx bx-bolt-circle'></i> AI-Powered Analysis</div>
                <div className="trust-item"><i className='bx bx-file-blank'></i> Multi-Document Support</div>
            </div>
        </div>
        
        <div className="hero-visual fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="mock-card">
                <div className="mock-header">
                    <div className="mock-avatar">JS</div>
                    <div>
                        <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>John Smith</div>
                        <div style={{ color: 'var(--color-text-2)', fontSize: '0.85rem' }}>Analysis Complete</div>
                    </div>
                </div>
                
                <div className="risk-card high" style={{ marginBottom: '24px' }}>
                    <i className='bx bx-error-circle risk-icon'></i>
                    <div>
                        <div style={{ fontWeight: 600, color: 'var(--color-danger)', marginBottom: '4px' }}>Medication Interaction Detected</div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-2)' }}>Lisinopril and Ibuprofen may reduce blood pressure control. Consult your doctor.</div>
                    </div>
                </div>

                <div className="chart-header">
                    <div style={{ fontWeight: 600 }}>Blood Glucose Trend</div>
                    <div className="chart-trend-badge chart-trend-down">
                        <i className='bx bx-trending-down'></i> -12 mg/dL
                    </div>
                </div>
                <div style={{ height: '120px', background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-3)' }}>
                    Chart Render Area
                </div>
            </div>
        </div>
    </section>

    {/* How It Works Section */}
    <section id="how-it-works" className="section">
        <h2 className="section-title">How It Works</h2>
        <div className="steps-container">
            <div className="steps-line"></div>
            
            <div className="step-item">
                <div className="step-icon-wrapper">
                    <i className='bx bx-cloud-upload'></i>
                    <div className="step-badge">1</div>
                </div>
                <h3>Upload Documents</h3>
                <p>Upload lab reports, prescriptions, doctor notes</p>
            </div>
            
            <div className="step-item">
                <div className="step-icon-wrapper">
                    <i className='bx bx-brain'></i>
                    <div className="step-badge">2</div>
                </div>
                <h3>AI Extraction</h3>
                <p>Gemini AI reads and understands your documents</p>
            </div>
            
            <div className="step-item">
                <div className="step-icon-wrapper">
                    <i className='bx bx-time-five'></i>
                    <div className="step-badge">3</div>
                </div>
                <h3>Medical Timeline</h3>
                <p>See your complete health history in order</p>
            </div>
            
            <div className="step-item">
                <div className="step-icon-wrapper">
                    <i className='bx bx-line-chart'></i>
                    <div className="step-badge">4</div>
                </div>
                <h3>Smart Analysis</h3>
                <p>Detect risks, track trends, get AI answers</p>
            </div>
        </div>
    </section>

    {/* Features Section */}
    <section id="features" className="section" style={{ background: 'var(--color-bg-2)' }}>
        <h2 className="section-title">Everything You Need to Understand Your Health</h2>
        <div className="features-grid">
            
            <div className="feature-card">
                <div className="feature-icon"><i className='bx bx-scan'></i></div>
                <h3>AI Medical Extraction</h3>
                <p>Automatically extracts patient info, diagnoses, medications, and lab values from any document format.</p>
            </div>
            
            <div className="feature-card">
                <div className="feature-icon"><i className='bx bx-calendar'></i></div>
                <h3>Patient Timeline</h3>
                <p>See your complete medical history organized chronologically across all visits and care providers.</p>
            </div>
            
            <div className="feature-card">
                <div className="feature-icon"><i className='bx bx-shield-plus'></i></div>
                <h3>Prescription Safety</h3>
                <p>Detect drug interactions, duplicate medications, and dosage conflicts before they cause harm.</p>
            </div>
            
            <div className="feature-card">
                <div className="feature-icon"><i className='bx bx-line-chart'></i></div>
                <h3>Lab Trend Analysis</h3>
                <p>Track how your blood glucose, cholesterol, and other values change over time with clear charts.</p>
            </div>
            
            <div className="feature-card">
                <div className="feature-icon"><i className='bx bx-bot'></i></div>
                <h3>AI Medical Assistant</h3>
                <p>Ask questions about your records and get instant, evidence-based answers based on your actual history.</p>
            </div>
            
            <div className="feature-card">
                <div className="feature-icon"><i className='bx bx-lock-alt'></i></div>
                <h3>Privacy First</h3>
                <p>Documents are processed and never stored permanently. Your health data stays yours entirely.</p>
            </div>

        </div>
    </section>

    {/* Safety Section */}
    <section id="privacy" className="section safety-section">
        <div className="safety-container">
            <div className="safety-content">
                <h2 style={{ fontSize: '2.5rem', marginBottom: '16px' }}>Built with Safety in Mind</h2>
                <p style={{ color: 'var(--color-text-2)', fontSize: '1.1rem' }}>Your health data is highly sensitive. We've built MedScan AI from the ground up to protect your privacy and ensure clinical safety.</p>
                
                <ul className="safety-list">
                    <li>
                        <i className='bx bx-check-shield'></i>
                        <div>
                            <strong>End-to-End Encryption</strong><br />
                            <span style={{ color: 'var(--color-text-2)', fontSize: '0.95rem' }}>All documents are encrypted in transit and at rest.</span>
                        </div>
                    </li>
                    <li>
                        <i className='bx bx-trash'></i>
                        <div>
                            <strong>No Permanent Storage</strong><br />
                            <span style={{ color: 'var(--color-text-2)', fontSize: '0.95rem' }}>Once your session ends, your uploaded files are securely deleted.</span>
                        </div>
                    </li>
                    <li>
                        <i className='bx bx-share-alt' style={{ transform: 'rotate(45deg)', color: 'var(--color-danger)' }}></i>
                        <div>
                            <strong>Zero Data Sharing</strong><br />
                            <span style={{ color: 'var(--color-text-2)', fontSize: '0.95rem' }}>We never sell or share your medical data with third parties.</span>
                        </div>
                    </li>
                </ul>
            </div>
            
            <div className="safety-disclaimer">
                <i className='bx bx-message-square-error disclaimer-icon'></i>
                <h3 style={{ color: 'var(--color-warning)', marginBottom: '16px' }}>Medical Disclaimer</h3>
                <p style={{ color: 'var(--color-text-2)', lineHeight: '1.6' }}>
                    <strong>⚠️ Important:</strong> AI-generated insights are for educational purposes only and do not constitute medical diagnosis, advice, or treatment. 
                    <br /><br />
                    MedScan AI may occasionally make errors or miss critical information. Always consult a qualified healthcare professional before making any decisions about your health.
                </p>
            </div>
        </div>
    </section>

    {/* CTA Section */}
    <section className="cta-section">
        <h2>Ready to Understand Your Medical History?</h2>
        <button onClick={() => navigateTo('upload')} className="btn btn-primary cta-btn pulse">Start Free Analysis</button>
    </section>

    {/* Footer */}
    <footer className="footer">
        <div className="nav-logo" style={{ fontSize: '1.25rem', cursor: 'pointer' }} onClick={() => navigateTo('dashboard')}>
            <i className='bx bx-pulse'></i>
            MedScan AI
        </div>
        <div>
        </div>
        <div>
            &copy; 2026 MedScan AI. All rights reserved.
        </div>
    </footer>


      </div>
    );
  }

  return (
    <div className="app-layout">{/* SIDEBAR */}
      <aside className="sidebar" id="sidebar">
        <div className="sidebar-logo" onClick={() => navigateTo('dashboard')} style={{ cursor: 'pointer' }}>
          <i className='bx bx-pulse' style={{ fontSize: '1.8rem', color: 'var(--color-danger)', marginRight: '8px' }}></i>
          <span className="logo-text">MedScan AI</span>
        </div>

        <nav className="sidebar-nav">
          <a onClick={() => navigateTo('upload')} className={`nav-item ${currentView === 'upload' ? 'active' : ''}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <span>Upload</span>
          </a>
          <a onClick={() => navigateTo('dashboard')} className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            <span>Dashboard</span>
          </a>
          <a onClick={() => navigateTo('cross-check')} className={`nav-item ${currentView === 'cross-check' ? 'active' : ''}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span>Cross-Checker</span>
          </a>
          <a onClick={() => navigateTo('wound')} className={`nav-item ${currentView === 'wound' ? 'active' : ''}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
            <span>Wound Vision</span>
          </a>
          <a onClick={() => navigateTo('timeline')} className={`nav-item ${currentView === 'timeline' ? 'active' : ''}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><circle cx="12" cy="12" r="4"/></svg>
            <span>Timeline</span>
          </a>
          <a onClick={() => navigateTo('labs')} className={`nav-item ${currentView === 'labs' ? 'active' : ''}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            <span>Lab Trends</span>
          </a>
          <a onClick={() => navigateTo('medications')} className={`nav-item ${currentView === 'medications' ? 'active' : ''}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.5 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v3"/><circle cx="18" cy="18" r="3"/></svg>
            <span>Medications</span>
            {riskFlags.length > 0 && <span className="nav-badge">{riskFlags.length}</span>}
          </a>
          <a onClick={() => navigateTo('chat')} className={`nav-item ${currentView === 'chat' ? 'active' : ''}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span>AI Assistant</span>
          </a>
        </nav>

        <div className="sidebar-footer">
          {sessionId && (
            <div className="session-info">
              <div className="session-dot"></div>
              <span>{patientName !== '—' ? patientName : 'Session Active'}</span>
            </div>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="main-content">
        {/* TOAST */}
        {toast && (
          <div className={`toast show toast-${toast.type}`}>
            {toast.msg}
          </div>
        )}

        {/* ==================== VIEW: UPLOAD ==================== */}
        {currentView === 'upload' && (
          <section className="view">
            <div className="view-header">
              <div>
                <h1 className="view-title">Upload Medical Documents</h1>
                <p className="view-subtitle">Upload lab reports, prescriptions, doctor notes, or discharge summaries. AI will extract and analyze all information.</p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={loadDemo}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                Try Demo
              </button>
            </div>

            <div className="upload-zone" onClick={() => document.getElementById('fileInput')?.click()}>
              <input type="file" id="fileInput" multiple accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={handleFileSelect} />
              <div className="upload-icon-wrap">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              </div>
              <p className="upload-title">Drop medical documents here</p>
              <p className="upload-subtitle">PDF, JPG, PNG up to 15 MB each</p>
              <button className="btn btn-primary" type="button">Choose Files</button>
              <div className="upload-types">
                <span className="type-tag">Lab Reports</span>
                <span className="type-tag">Prescriptions</span>
                <span className="type-tag">Doctor Notes</span>
                <span className="type-tag">Discharge Summaries</span>
              </div>
            </div>

            {selectedFiles.length > 0 && (
              <div className="mt-24">
                <div className="section-header">
                  <h3 className="section-title">Selected Documents ({selectedFiles.length})</h3>
                  <button className="btn btn-ghost btn-sm" onClick={() => setSelectedFiles([])}>Clear all</button>
                </div>
                <div className="file-list">
                  {selectedFiles.map((f, i) => (
                    <div className="file-item" key={i}>
                      <div className={`file-icon ${f.name.endsWith('.pdf') ? 'pdf' : 'img'}`}>
                        {f.name.endsWith('.pdf') ? 'PDF' : 'IMG'}
                      </div>
                      <div className="file-info">
                        <div className="file-name">{f.name}</div>
                        <div className="file-meta">{(f.size / 1024).toFixed(1)} KB</div>
                      </div>
                      <button className="file-remove" onClick={() => setSelectedFiles(selectedFiles.filter((_, idx) => idx !== i))}>✕</button>
                    </div>
                  ))}
                </div>
                <div className="upload-actions">
                  <button className="btn btn-primary btn-lg" onClick={analyzeDocs}>
                    Analyze Documents
                  </button>
                </div>
              </div>
            )}

            <div className="disclaimer-box mt-24">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span><strong>Privacy:</strong> Documents are processed securely and not stored permanently. <strong>Disclaimer:</strong> AI insights are educational only and not a medical diagnosis.</span>
            </div>
          </section>
        )}

        {/* ==================== VIEW: PROCESSING ==================== */}
        {currentView === 'processing' && (
          <section className="view">
            <div className="processing-container">
              <div className="processing-spinner"></div>
              <h2 className="processing-title">Analyzing Your Documents</h2>
              <p className="processing-subtitle">AI is extracting clinical entity data, cross-checking prescriptions, and building patient health timeline.</p>

              <div className="processing-steps">
                <div className="processing-step">
                  <div className={`step-icon ${procStep >= 1 ? 'done' : 'pending'}`}>1</div>
                  <div className="step-content">
                    <div className="step-label">Uploading Documents</div>
                    <div className="step-desc">Transferring files to secure processing queue</div>
                  </div>
                </div>
                <div className="processing-step">
                  <div className={`step-icon ${procStep >= 2 ? 'done' : procStep === 1 ? 'loading' : 'pending'}`}>2</div>
                  <div className="step-content">
                    <div className="step-label">OCR & Text Extraction</div>
                    <div className="step-desc">Reading lab values and prescription dosages</div>
                  </div>
                </div>
                <div className="processing-step">
                  <div className={`step-icon ${procStep >= 3 ? 'done' : procStep === 2 ? 'loading' : 'pending'}`}>3</div>
                  <div className="step-content">
                    <div className="step-label">Clinical Risk & Safety Cross-Check</div>
                    <div className="step-desc">Checking drug-drug interactions & allergy triggers</div>
                  </div>
                </div>
                <div className="processing-step">
                  <div className={`step-icon ${procStep >= 4 ? 'done' : 'pending'}`}>4</div>
                  <div className="step-content">
                    <div className="step-label">Building Medical Timeline</div>
                    <div className="step-desc">Synthesizing findings across all visits</div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ==================== VIEW: DASHBOARD ==================== */}
        {currentView === 'dashboard' && (
          <section className="view">
            <div className="view-header">
              <div>
                <h1 className="view-title">Medical Overview</h1>
                <p className="view-subtitle">Analysis complete. Here is a summary of your medical records.</p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-secondary btn-sm" onClick={loadDemo}>
                  <i className='bx bx-play-circle'></i> Try Demo
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => navigateTo('upload')}>
                  <i className='bx bx-cloud-upload'></i> New Analysis
                </button>
              </div>
            </div>

            {/* PROFILE HERO BANNER */}
            <div className="dashboard-hero">
              <div className="hero-avatar-ring">
                <div className="hero-avatar">
                  <i className='bx bx-user'></i>
                </div>
              </div>
              <div className="hero-info">
                <div className="hero-name">{patientName}</div>
                <div className="hero-meta">{patientMeta}</div>
                <div className="hero-tags">
                  {allergies.length > 0 ? allergies.map((a, i) => (
                    <span className="badge badge-danger hero-allergy-tag" key={i}>
                      <i className='bx bx-shield-x'></i> Allergy: {a}
                    </span>
                  )) : (
                    <span className="badge badge-success hero-allergy-tag">
                      <i className='bx bx-shield-check'></i> No Known Allergies
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* KPI STATS GRID */}
            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-icon kpi-blue"><i className='bx bx-file'></i></div>
                <div className="kpi-content">
                  <div className="kpi-value">{stats.docs || 3}</div>
                  <div className="kpi-label">Documents</div>
                </div>
              </div>
              
              <div className="kpi-card">
                <div className="kpi-icon kpi-purple"><i className='bx bx-calendar-event'></i></div>
                <div className="kpi-content">
                  <div className="kpi-value">{stats.visits || 3}</div>
                  <div className="kpi-label">Visits Detected</div>
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-icon kpi-green"><i className='bx bx-capsule'></i></div>
                <div className="kpi-content">
                  <div className="kpi-value">{stats.meds || 5}</div>
                  <div className="kpi-label">Medications</div>
                </div>
              </div>

              <div className={`kpi-card ${riskFlags.length > 0 ? 'kpi-danger-pulse' : ''}`}>
                <div className={`kpi-icon ${riskFlags.length > 0 ? 'kpi-red' : 'kpi-gray'}`}>
                  <i className='bx bx-error-circle'></i>
                </div>
                <div className="kpi-content">
                  <div className="kpi-value">{riskFlags.length}</div>
                  <div className="kpi-label">Risk Alerts</div>
                </div>
              </div>
            </div>

            {/* FEATURE GRID */}
            <h3 className="section-heading mt-32 mb-16">Quick Actions</h3>
            <div className="feature-grid">
              <div className="feature-card" onClick={() => navigateTo('cross-check')}>
                <div className="feature-card-icon"><i className='bx bx-shield-plus'></i></div>
                <div className="feature-card-title">Cross-Checker</div>
                <div className="feature-card-desc">Check for drug interactions and contraindications.</div>
              </div>

              <div className="feature-card" onClick={() => navigateTo('wound')}>
                <div className="feature-card-icon"><i className='bx bx-scan'></i></div>
                <div className="feature-card-title">Wound Vision</div>
                <div className="feature-card-desc">AI-powered visual infection triage & cleaning guidance.</div>
              </div>

              <div className="feature-card" onClick={() => navigateTo('timeline')}>
                <div className="feature-card-icon"><i className='bx bx-time-five'></i></div>
                <div className="feature-card-title">Patient Timeline</div>
                <div className="feature-card-desc">Chronological history of all medical visits & events.</div>
              </div>

              <div className="feature-card" onClick={() => navigateTo('labs')}>
                <div className="feature-card-icon"><i className='bx bx-line-chart'></i></div>
                <div className="feature-card-title">Lab Trends</div>
                <div className="feature-card-desc">Track and visualize changes in your lab values.</div>
              </div>

              <div className="feature-card" onClick={() => navigateTo('medications')}>
                <div className="feature-card-icon"><i className='bx bx-capsule'></i></div>
                <div className="feature-card-title">Medications</div>
                <div className="feature-card-desc">View your active prescriptions and dosages.</div>
              </div>

              <div className="feature-card" onClick={() => navigateTo('chat')}>
                <div className="feature-card-icon"><i className='bx bx-bot'></i></div>
                <div className="feature-card-title">AI Assistant</div>
                <div className="feature-card-desc">Ask questions about your medical history.</div>
              </div>
            </div>
          </section>
        )}

        {/* ==================== VIEW: CROSS-CHECKER ==================== */}
        {currentView === 'cross-check' && (
          <section className="view">
            <div className="view-header">
              <div>
                <h1 className="view-title">Prescription Safety & Risk Cross-Checker</h1>
                <p className="view-subtitle">Deterministically & AI-evaluated safety checks across all prescriptions, allergies, and lab parameters.</p>
              </div>
            </div>

            {riskFlags.length === 0 ? (
              <div className="empty-state">
                <p>No high-risk prescription conflicts detected.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {riskFlags.map((risk: any, i: number) => (
                  <div key={i} className={`risk-card ${risk.severity === 'high' || risk.severity === 'critical' ? 'danger' : 'warning'}`}>
                    <div className="risk-header">
                      <span className={`badge ${risk.severity === 'high' || risk.severity === 'critical' ? 'badge-danger' : 'badge-warning'}`}>
                        {risk.severity?.toUpperCase()}
                      </span>
                      <span className="risk-type-tag">{risk.category || risk.riskType}</span>
                    </div>
                    <div className="risk-title">{risk.title}</div>
                    <p className="risk-desc">{risk.description}</p>
                    {risk.mechanism && <p className="risk-desc"><strong>Mechanism:</strong> {risk.mechanism}</p>}
                    <div className="risk-rec">
                      <span>💡 <strong>Recommendation:</strong> {risk.clinicalRecommendation || risk.recommendation}</span>
                    </div>
                    {risk.affectedMedications && (
                      <div className="risk-drugs-row">
                        {risk.affectedMedications.map((d: string, idx: number) => (
                          <span key={idx} className="drug-pill">{d}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ==================== VIEW: WOUND VISION ==================== */}
        {currentView === 'wound' && (
          <section className="view">
            <div className="view-header">
              <div>
                <h1 className="view-title">AI Wound Vision & Symptom Triage</h1>
                <p className="view-subtitle">Upload a photo of a skin wound, burn, or rash for AI visual infection triage and cleaning guidance.</p>
              </div>
            </div>

            <div className="wound-grid">
              {/* LEFT PANE - UPLOAD */}
              <div className="wound-card upload-pane">
                <div className="wound-section-title">
                  <i className='bx bx-camera'></i>
                  Image Capture
                </div>
                
                <div 
                  className={`wound-dropzone ${woundImage ? 'has-image' : ''}`}
                  onClick={() => document.getElementById('woundFileInput')?.click()}
                >
                  <input type="file" id="woundFileInput" accept="image/*" onChange={handleWoundImageSelect} style={{ display: 'none' }} />
                  
                  {woundImage ? (
                    <>
                      <img src={woundImage} alt="Wound photo" className="wound-preview-image" />
                      <div className="wound-image-overlay">
                        <i className='bx bx-refresh'></i>
                        <span>Change Photo</span>
                      </div>
                    </>
                  ) : (
                    <div className="wound-empty-upload">
                      <i className='bx bx-image-add'></i>
                      <span>Click to upload or drag photo here</span>
                      <small>Supports JPG, PNG, up to 10MB</small>
                    </div>
                  )}
                </div>

                <div className="wound-section-title mt-24">
                  <i className='bx bx-notepad'></i>
                  Clinical Symptoms
                </div>
                
                <div className="wound-textarea-wrapper">
                  <textarea
                    className="wound-textarea"
                    placeholder="Describe symptoms (e.g. pain level, duration, fever)..."
                    value={woundNotes}
                    onChange={(e) => setWoundNotes(e.target.value)}
                  />
                  <div className="textarea-glow"></div>
                </div>

                <button 
                  className={`btn btn-primary wound-action-btn ${woundLoading ? 'loading' : ''} ${!woundImage ? 'disabled' : 'pulse'}`} 
                  onClick={analyzeWound} 
                  disabled={!woundImage || woundLoading}
                >
                  {woundLoading ? (
                    <><i className='bx bx-loader-alt bx-spin'></i> AI is analyzing...</>
                  ) : (
                    <><i className='bx bx-scan'></i> Analyze Wound</>
                  )}
                </button>
              </div>

              {/* RIGHT PANE - RESULTS */}
              <div className="wound-card result-pane">
                <div className="wound-section-title">
                  <i className='bx bx-clipboard'></i>
                  Triage Results
                </div>

                {!woundResult ? (
                  <div className="wound-empty-state">
                    <div className="empty-icon-glow">
                      <i className='bx bx-shield-plus'></i>
                    </div>
                    <p>Upload a photo and click Analyze to view triage evaluation.</p>
                  </div>
                ) : (
                  <div className="wound-result-content fade-in">
                    <div className="wound-severity-header">
                      <span className={`wound-badge wound-badge-${woundResult.severity?.toLowerCase() || 'routine'}`}>
                        <span className="pulse-dot"></span>
                        {woundResult.severity?.toUpperCase()} TRIAGE LEVEL
                      </span>
                    </div>
                    
                    <h4 className="wound-diagnosis-title">{woundResult.title}</h4>
                    
                    <div className="wound-result-box">
                      <div className="box-header">
                        <i className='bx bx-file-blank'></i> Clinical Explanation
                      </div>
                      <p>{woundResult.englishExplanation}</p>
                    </div>

                    <div className="wound-result-box">
                      <div className="box-header">
                        <i className='bx bx-world'></i> Tamil Translation (தமிழ்)
                      </div>
                      <p>{woundResult.tamilExplanation}</p>
                    </div>

                    {woundResult.cleaningSteps && woundResult.cleaningSteps.length > 0 && (
                      <div className="wound-result-box highlight-box">
                        <div className="box-header">
                          <i className='bx bx-band-aid'></i> Hygienic Cleaning Steps
                        </div>
                        <ul className="wound-steps-list">
                          {woundResult.cleaningSteps.map((step: string, idx: number) => (
                            <li key={idx}>
                              <i className='bx bx-check-circle'></i>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ==================== VIEW: TIMELINE ==================== */}
        {currentView === 'timeline' && (
          <section className="view">
            <div className="view-header">
              <div>
                <h1 className="view-title">Patient Timeline</h1>
                <p className="view-subtitle">Chronological history of medical visits, lab readings, diagnoses, and prescriptions.</p>
              </div>
            </div>

            <div className="timeline">
              {timelineEvents.map((ev, i) => (
                <div className="timeline-event high" key={i}>
                  <div className="timeline-dot"></div>
                  <div className="timeline-connector"></div>
                  <div className="timeline-card">
                    <div className="timeline-card-header">
                      <span className="badge badge-info">{ev.eventType || 'event'}</span>
                      <span className="timeline-doc-ref">{ev.eventDate}</span>
                    </div>
                    <div className="timeline-title">{ev.title}</div>
                    <div className="timeline-desc">{ev.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ==================== VIEW: LAB TRENDS ==================== */}
        {currentView === 'labs' && (
          <section className="view">
            <div className="view-header">
              <div>
                <h1 className="view-title">Lab Result Trends</h1>
                <p className="view-subtitle">Track how your lab values change over time with AI explanations.</p>
              </div>
            </div>

            {labSummary && (
              <div className="info-card mb-24">
                <span>📊 <strong>Overall Assessment:</strong> {labSummary}</span>
              </div>
            )}

            <div className="labs-grid">
              {labTrends.map((lab, i) => (
                <div className="lab-card" key={i}>
                  <div className="lab-card-header">
                    <div>
                      <div className="lab-name">{lab.testName}</div>
                      <div className="lab-unit">{lab.readings?.[0]?.unit || ''}</div>
                    </div>
                    <span className={`badge ${lab.trendDirection === 'worsening' ? 'badge-danger' : 'badge-success'}`}>
                      {lab.trendDirection || 'stable'}
                    </span>
                  </div>

                  <div className="lab-values-row">
                    {lab.readings?.map((r: any, idx: number) => (
                      <div className="lab-reading" key={idx}>
                        <div className="lab-reading-date">{r.date || 'Value'}</div>
                        <div className={`lab-reading-value ${r.status === 'High' || r.status === 'Low' ? 'abnormal' : 'ok'}`}>
                          {r.value} {r.unit}
                        </div>
                        <div className="lab-ref">Ref: {r.referenceText || 'Normal range'}</div>
                      </div>
                    ))}
                  </div>

                  {lab.plainExplanation && (
                    <div className="lab-explanation">
                      {lab.plainExplanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ==================== VIEW: MEDICATIONS ==================== */}
        {currentView === 'medications' && (
          <section className="view">
            <div className="view-header">
              <div>
                <h1 className="view-title">Medication Safety</h1>
                <p className="view-subtitle">AI analysis of current prescriptions for conflicts, duplicates, and allergy triggers.</p>
              </div>
            </div>

            <div className="med-grid">
              {medications.map((med, i) => (
                <div className="med-card safe" key={i}>
                  <div className="med-card-header">
                    <div className="med-name">{med.drug_name || med.drugName}</div>
                    <span className="badge badge-info">{med.dosage}</span>
                  </div>
                  <div className="med-detail">
                    <span className="med-label">Frequency</span>
                    <span>{med.frequency}</span>
                  </div>
                  <div className="med-detail">
                    <span className="med-label">Prescribed</span>
                    <span>{med.prescribed_date || med.prescribedDate}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ==================== VIEW: CHAT ==================== */}
        {currentView === 'chat' && (
          <section className="view">
            <div className="view-header">
              <div>
                <h1 className="view-title">AI Medical Assistant</h1>
                <p className="view-subtitle">Ask questions about your uploaded records in English, Tamil, or Tanglish.</p>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setChatLang(chatLang === 'en' ? 'ta' : 'en')}
              >
                Language: {chatLang === 'en' ? 'English 🇬🇧' : 'Tamil 🇮🇳'}
              </button>
            </div>

            <div className="chat-layout">
              <div className="chat-container">
                <div className="chat-messages">
                  {chatMessages.length === 0 ? (
                    <div className="chat-welcome">
                      <div className="chat-welcome-icon">💬</div>
                      <h3>MedScan AI Assistant</h3>
                      <p>Ask anything about your uploaded medical documents.</p>
                      <div className="suggested-questions">
                        <button className="suggestion-btn" onClick={() => sendChatMessage("What medications am I currently taking?")}>What medications am I taking?</button>
                        <button className="suggestion-btn" onClick={() => sendChatMessage("Are there any drug interactions in my prescriptions?")}>Check drug interactions</button>
                        <button className="suggestion-btn" onClick={() => sendChatMessage("Explain my lab results")}>Explain lab results</button>
                        <button className="suggestion-btn" onClick={() => sendChatMessage("என் ரத்த பரிசோதனை பற்றி சொல்லுங்கள் (Tamil)")}>என் ரத்த பரிசோதனை (Tamil)</button>
                      </div>
                    </div>
                  ) : (
                    chatMessages.map((m, i) => (
                      <div key={i} className={`chat-bubble ${m.role}`}>
                        <div className="bubble-content">{m.text}</div>
                        {m.confidence && <span className="confidence-badge high">{m.confidence}% Confidence</span>}
                      </div>
                    ))
                  )}
                  {chatLoading && <div className="typing-dots"><span></span><span></span><span></span></div>}
                </div>

                <div className="chat-input-bar">
                  <textarea
                    className="chat-input"
                    placeholder="Ask about your medical records..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }}
                  />
                  <button className="chat-send-btn" onClick={() => sendChatMessage()} disabled={chatLoading}>
                    ➔
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
