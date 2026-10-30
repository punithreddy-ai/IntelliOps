
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useEffect, useState } from 'react';

import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Cpu,
  LoaderCircle,
  MapPin,
  RadioTower,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Zap
} from 'lucide-react';

const API = 'http://127.0.0.1:8000';

const initialForm = {
  location: 'Building A · Floor 2',
  incident_type: 'Gas leakage',
  description:
    'A gas sensor alert was reported near the laboratory equipment. A staff member noticed an unusual smell in the area.',
  sensor_reading: '75 ppm (sample reading)'
};

function Severity({ value }) {
  return (
    <span className={`severity ${String(value).toLowerCase()}`}>
      {value}
    </span>
  );
}

export default function App() {
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load incident history
  async function loadHistory() {
    try {
      const response = await fetch(`${API}/api/incidents`);

      if (response.ok) {
        setHistory(await response.json());
      }
    } catch {
      // API connection errors are handled separately.
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  // Update form fields
  function updateField(event) {
    setForm({
      ...form,
      [event.target.name]: event.target.value
    });
  }

  // Analyse incident using AI
  async function analyse(event) {
    event.preventDefault();

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch(
        `${API}/api/incidents/analyze`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...form,
            sensor_reading:
              form.sensor_reading.trim() || null
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || 'Could not analyse incident.'
        );
      }

      setResult(data);
      await loadHistory();

    } catch (err) {
      setError(
        err.message ||
        'Could not connect to the API. Is FastAPI running?'
      );
    } finally {
      setLoading(false);
    }
  }

  // Dashboard metric
  const criticalCount = history.filter(
    x => x.severity === 'CRITICAL'
  ).length;

  // Export incident history as PDF
  function exportIncidentPDF() {
    if (history.length === 0) {
      alert('No incident history available to export.');
      return;
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Severity counts
    const critical = history.filter(
      x => x.severity === 'CRITICAL'
    ).length;

    const high = history.filter(
      x => x.severity === 'HIGH'
    ).length;

    const medium = history.filter(
      x => x.severity === 'MEDIUM'
    ).length;

    const low = history.filter(
      x => x.severity === 'LOW'
    ).length;

    // Report heading
    doc.setFontSize(22);
    doc.setTextColor(30, 50, 80);
    doc.text('INTELLIOPS', 14, 18);

    doc.setFontSize(11);
    doc.setTextColor(90, 90, 90);
    doc.text('Incident History Report', 14, 26);

    doc.setFontSize(9);
    doc.text(
      `Generated: ${new Date().toLocaleString()}`,
      14,
      33
    );

    // Incident summary
    doc.setFontSize(12);
    doc.setTextColor(30, 30, 30);
    doc.text('Incident Summary', 14, 43);

    doc.setFontSize(10);
    doc.text(
      `Total Incidents: ${history.length}`,
      14,
      51
    );

    doc.text(`Critical: ${critical}`, 80, 51);
    doc.text(`High: ${high}`, 130, 51);
    doc.text(`Medium: ${medium}`, 175, 51);
    doc.text(`Low: ${low}`, 225, 51);

    // Prepare incident table
    const tableData = history.map(item => [
      item.id ?? 'N/A',

      item.created_at
        ? new Date(item.created_at).toLocaleString()
        : 'N/A',

      item.location || 'N/A',

      item.incident_type || 'N/A',

      item.severity || 'N/A',

      item.analysis || 'Not available',

      Array.isArray(item.recommendations)
        ? item.recommendations
            .map((r, i) => `${i + 1}. ${r}`)
            .join('\n')
        : 'Not available'
    ]);

    // Generate PDF table
    autoTable(doc, {
      startY: 58,

      head: [[
        'ID',
        'Date',
        'Location',
        'Incident Type',
        'Severity',
        'AI Analysis',
        'Recommendations'
      ]],

      body: tableData,

      theme: 'grid',

      styles: {
        fontSize: 7,
        cellPadding: 3,
        overflow: 'linebreak',
        valign: 'top'
      },

      headStyles: {
        fillColor: [30, 50, 80],
        textColor: 255,
        fontStyle: 'bold'
      },

      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 30 },
        2: { cellWidth: 32 },
        3: { cellWidth: 28 },
        4: { cellWidth: 20 },
        5: { cellWidth: 65 },
        6: { cellWidth: 85 }
      },

      didDrawPage: function () {
        const pageCount =
          doc.internal.getNumberOfPages();

        doc.setFontSize(8);
        doc.setTextColor(120);

        doc.text(
          `IntelliOps | Page ${
            doc.internal.getCurrentPageInfo().pageNumber
          } of ${pageCount}`,
          14,
          doc.internal.pageSize.height - 8
        );
      }
    });

    // Download PDF
    doc.save(
      'IntelliOps-Incident-History-Report.pdf'
    );
  }

  return (
    <main className="app-shell">

      {/* Sidebar */}
      <aside className="sidebar">

        <div className="brand">
          <div className="brand-mark">
            <RadioTower size={21} />
          </div>

          <div>
            <strong>IntelliOps</strong>
            <small>INFRASTRUCTURE INTELLIGENCE</small>
          </div>
        </div>

        <div className="side-label">
          WORKSPACE
        </div>

        <div className="nav-item active">
          <Activity size={17} />
          Incident analysis
        </div>

        <div className="side-bottom">
          <div className="side-status">
            <span className="live-dot" />
            Prototype workspace
          </div>

          <p>
            AI-assisted triage · Human-led response
          </p>
        </div>

      </aside>

      {/* Main area */}
      <section className="main-area">

        {/* Header */}
        <header className="topbar">

          <div>
            <span className="eyebrow">
              OPERATIONS CENTER / OVERVIEW
            </span>

            <h1>Incident intelligence</h1>
          </div>

          <div className="top-right">

            <span className="system-pill">
              <span className="live-dot" />
              AI service ready when API is connected
            </span>

            <div className="avatar">
              IO
            </div>

          </div>
        </header>

        <div className="content">

          {/* Welcome section */}
          <section className="welcome">

            <div>

              <div className="welcome-kicker">
                <Sparkles size={14} />
                AI-POWERED OPERATIONS
              </div>

              <h2>
                Turn incident reports into
                <br />
                <span>actionable intelligence.</span>
              </h2>

              <p>
                Submit an infrastructure incident.
                IntelliOps uses an LLM to summarise
                the event, assess priority and suggest
                next steps for a human operator.
              </p>

            </div>

            <div className="welcome-art">
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />

              <div className="core">
                <Cpu size={34} />
              </div>

              <span className="node node-a" />
              <span className="node node-b" />
              <span className="node node-c" />
            </div>

          </section>

          {/* Dashboard metrics */}
          <section className="metrics">

            <div className="metric-card">
              <div className="metric-icon blue">
                <Activity size={18} />
              </div>

              <div>
                <span>Incidents analysed</span>
                <strong>{history.length}</strong>
              </div>

              <small>Recent records</small>
            </div>

            <div className="metric-card">
              <div className="metric-icon red">
                <TriangleAlert size={18} />
              </div>

              <div>
                <span>Critical assessments</span>
                <strong>{criticalCount}</strong>
              </div>

              <small>AI-classified</small>
            </div>

            <div className="metric-card">
              <div className="metric-icon green">
                <ShieldCheck size={18} />
              </div>

              <div>
                <span>Analysis engine</span>
                <strong className="engine-text">
                  LLM enabled
                </strong>
              </div>

              <small>Via Groq API</small>
            </div>

          </section>

          {/* Input and output panels */}
          <div className="work-grid">

            {/* Incident form */}
            <section className="panel form-panel">

              <div className="panel-heading">

                <div>
                  <span className="eyebrow">
                    NEW REPORT
                  </span>

                  <h3>Submit an incident</h3>
                </div>

                <span className="step-tag">
                  01 / INPUT
                </span>

              </div>

              <form onSubmit={analyse}>

                <label>Incident location</label>

                <div className="input-wrap">
                  <MapPin size={16} />

                  <input
                    name="location"
                    value={form.location}
                    onChange={updateField}
                    required
                    maxLength="120"
                  />
                </div>

                <label>Incident category</label>

                <select
                  name="incident_type"
                  value={form.incident_type}
                  onChange={updateField}
                >
                  <option>Gas leakage</option>
                  <option>Fire or smoke</option>
                  <option>Unauthorised entry</option>
                  <option>Equipment overheating</option>
                  <option>Power failure</option>
                  <option>Other</option>
                </select>

                <label>Incident description</label>

                <textarea
                  name="description"
                  value={form.description}
                  onChange={updateField}
                  required
                  minLength="10"
                  maxLength="3000"
                  rows="5"
                />

                <label>
                  Sensor reading
                  <span className="optional">
                    OPTIONAL
                  </span>
                </label>

                <input
                  name="sensor_reading"
                  value={form.sensor_reading}
                  onChange={updateField}
                  placeholder="e.g. 75 ppm, 42°C, or not available"
                />

                <button
                  className="analyse-btn"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <LoaderCircle
                        className="spin"
                        size={17}
                      />
                      Analysing incident...
                    </>
                  ) : (
                    <>
                      <Sparkles size={17} />
                      Analyse with AI
                      <ArrowUpRight size={17} />
                    </>
                  )}
                </button>

                <p className="privacy-note">
                  <ShieldCheck size={13} />
                  Submitted details are sent to the
                  configured AI provider for analysis.
                </p>

              </form>

              {error && (
                <div className="error-box">
                  <AlertTriangle size={16} />
                  <span>{error}</span>
                </div>
              )}

            </section>

            {/* AI result panel */}
            <section className="panel result-panel">

              <div className="panel-heading">

                <div>
                  <span className="eyebrow">
                    AI OUTPUT
                  </span>

                  <h3>Incident assessment</h3>
                </div>

                <span className="step-tag">
                  02 / ANALYSIS
                </span>

              </div>

              {!result ? (

                <div className="empty-state">

                  <div className="empty-icon">
                    <Zap size={25} />
                  </div>

                  <h4>Awaiting incident data</h4>

                  <p>
                    Complete the incident form and run
                    AI analysis. The assessment and
                    recommended next steps will appear here.
                  </p>

                  <div className="empty-flow">
                    <span>Incident input</span>
                    <ArrowUpRight size={14} />
                    <span>LLM analysis</span>
                    <ArrowUpRight size={14} />
                    <span>Recommendations</span>
                  </div>

                </div>

              ) : (

                <div className="analysis-output">

                  <div className="result-top">

                    <div>
                      <span className="eyebrow">
                        ASSESSED PRIORITY
                      </span>

                      <div className="severity-line">
                        <Severity value={result.severity} />

                        <span>
                          AI-generated assessment
                        </span>
                      </div>
                    </div>

                    <div className="result-check">
                      <CheckCircle2 size={21} />
                    </div>

                  </div>

                  <div className="result-meta">

                    <span>
                      <MapPin size={13} />
                      {result.location}
                    </span>

                    <span>
                      <AlertTriangle size={13} />
                      {result.incident_type}
                    </span>

                  </div>

                  <div className="analysis-block">

                    <h4>
                      <Sparkles size={15} />
                      AI analysis
                    </h4>

                    <p>{result.analysis}</p>

                  </div>

                  <div className="recommendations">

                    <h4>Recommended next steps</h4>

                    {result.recommendations.map(
                      (item, i) => (
                        <div
                          className="recommendation"
                          key={i}
                        >
                          <span>
                            {String(i + 1).padStart(2, '0')}
                          </span>

                          <p>{item}</p>
                        </div>
                      )
                    )}

                  </div>

                  <div className="human-note">

                    <ShieldCheck size={16} />

                    <p>
                      <strong>
                        Human verification required.
                      </strong>
                      Recommendations are advisory,
                      not automated safety controls.
                      Follow your site's approved
                      emergency procedures.
                    </p>

                  </div>

                </div>

              )}

            </section>

          </div>

          {/* Incident history and PDF export */}
          <section className="panel history-panel">

            <div className="panel-heading">

              <div>
                <span className="eyebrow">
                  AUDIT TRAIL
                </span>

                <h3>Recent incident history</h3>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap'
                }}
              >

                <span className="history-count">
                  {history.length} RECORDS
                </span>

                <button
                  type="button"
                  onClick={exportIncidentPDF}
                  disabled={history.length === 0}
                  style={{
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    cursor:
                      history.length === 0
                        ? 'not-allowed'
                        : 'pointer',
                    opacity:
                      history.length === 0 ? 0.5 : 1,
                    fontWeight: '600'
                  }}
                >
                  ↓ Export PDF
                </button>

              </div>

            </div>

            {history.length === 0 ? (

              <div className="history-empty">
                <Clock3 size={16} />
                No analysed incidents yet.
                Your first analysis will be saved here.
              </div>

            ) : (

              <div className="history-list">

                {history.slice(0, 5).map(item => (

                  <div
                    className="history-row"
                    key={item.id}
                  >

                    <div className="history-type">

                      <div className="history-icon">
                        <AlertTriangle size={16} />
                      </div>

                      <div>
                        <strong>
                          {item.incident_type}
                        </strong>

                        <small>
                          {item.location}
                        </small>
                      </div>

                    </div>

                    <Severity value={item.severity} />

                    <small className="history-date">
                      {new Date(
                        item.created_at
                      ).toLocaleString()}
                    </small>

                  </div>

                ))}

              </div>

            )}

          </section>

          <footer>
            INTELLIOPS PROTOTYPE
            <span>·</span>
            AI decision support, with human oversight
          </footer>

        </div>

      </section>

    </main>
  );
}
