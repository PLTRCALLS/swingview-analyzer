import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [video, setVideo] = useState(null);
  const [view, setView] = useState('face-on');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleUpload = async () => {
    if (!video) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('video', video);
    formData.append('view', view);

    try {
      const res = await axios.post('http://localhost:8000/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(res.data);
    } catch (err) {
      setError('Analysis failed. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.logo}>Swing<span style={styles.logoAccent}>View</span></h1>
        <p style={styles.tagline}>AI-Powered Golf Swing Analysis</p>
      </div>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Upload Your Swing</h2>

        <div style={styles.viewSelector}>
          {['face-on', 'down-the-line'].map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={view === v ? styles.viewBtnActive : styles.viewBtn}
            >
              {v === 'face-on' ? 'Face On' : 'Down The Line'}
            </button>
          ))}
        </div>

        <div style={styles.uploadArea}>
          <input
            type="file"
            accept="video/*"
            onChange={e => setVideo(e.target.files[0])}
            style={styles.fileInput}
            id="videoUpload"
          />
          <label htmlFor="videoUpload" style={styles.uploadLabel}>
            {video ? `✓ ${video.name}` : '+ Select Swing Video'}
          </label>
        </div>

        <button
          onClick={handleUpload}
          disabled={!video || loading}
          style={!video || loading ? styles.btnDisabled : styles.btn}
        >
          {loading ? 'Analyzing...' : 'Analyze Swing'}
        </button>

        {error && <p style={styles.error}>{error}</p>}
      </div>

      {result && (
        <div style={styles.results}>
          <div style={styles.overallScore}>
            <h2 style={styles.scoreNumber}>{result.overall}</h2>
            <p style={styles.scoreLabel}>Overall Score</p>
          </div>

          <div style={styles.summary}>
            <p style={styles.summaryText}>{result.summary}</p>
          </div>

          <div style={styles.categories}>
            {Object.entries(result.categories).map(([key, val]) => (
              <div key={key} style={styles.category}>
                <div style={styles.categoryHeader}>
                  <span style={styles.categoryName}>{key.replace('_', ' ').toUpperCase()}</span>
                  <span style={styles.categoryScore}>{val.score}</span>
                </div>
                <div style={styles.progressBar}>
                  <div style={{ ...styles.progressFill, width: `${val.score}%` }} />
                </div>
                <p style={styles.categoryFeedback}>{val.feedback}</p>
              </div>
            ))}
          </div>

          <div style={styles.priority}>
            <h3 style={styles.priorityTitle}>🎯 Top Priority</h3>
            <p style={styles.priorityText}>{result.top_priority}</p>
          </div>

          <div style={styles.drill}>
            <h3 style={styles.drillTitle}>📋 Recommended Drill</h3>
            <h4 style={styles.drillName}>{result.drill.name}</h4>
            <p style={styles.drillDesc}>{result.drill.description}</p>
          </div>

          {result.frames && (
            <div style={styles.frames}>
              <h3 style={styles.framesTitle}>Key Frames</h3>
              <div style={styles.framesGrid}>
                {result.frames.map((frame, i) => (
                  <img
                    key={i}
                    src={`data:image/jpeg;base64,${frame}`}
                    alt={`Frame ${i + 1}`}
                    style={styles.frame}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#0a0a0a', color: '#fff', fontFamily: 'sans-serif', padding: '20px' },
  header: { textAlign: 'center', padding: '40px 0 20px' },
  logo: { fontSize: '48px', fontWeight: '900', margin: 0, letterSpacing: '-2px' },
  logoAccent: { color: '#c8ff00' },
  tagline: { color: '#888', fontSize: '16px', margin: '8px 0 0' },
  card: { maxWidth: '600px', margin: '20px auto', backgroundColor: '#111', borderRadius: '16px', padding: '32px' },
  cardTitle: { fontSize: '22px', fontWeight: '700', marginBottom: '24px' },
  viewSelector: { display: 'flex', gap: '12px', marginBottom: '24px' },
  viewBtn: { flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #333', backgroundColor: 'transparent', color: '#888', cursor: 'pointer', fontSize: '14px' },
  viewBtnActive: { flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #c8ff00', backgroundColor: '#c8ff0020', color: '#c8ff00', cursor: 'pointer', fontSize: '14px' },
  uploadArea: { marginBottom: '20px' },
  fileInput: { display: 'none' },
  uploadLabel: { display: 'block', padding: '40px', border: '2px dashed #333', borderRadius: '12px', textAlign: 'center', cursor: 'pointer', color: '#888', fontSize: '16px' },
  btn: { width: '100%', padding: '16px', backgroundColor: '#c8ff00', color: '#000', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: '700', cursor: 'pointer' },
  btnDisabled: { width: '100%', padding: '16px', backgroundColor: '#333', color: '#666', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: '700', cursor: 'not-allowed' },
  error: { color: '#ff4444', marginTop: '12px', textAlign: 'center' },
  results: { maxWidth: '600px', margin: '20px auto' },
  overallScore: { textAlign: 'center', padding: '40px', backgroundColor: '#111', borderRadius: '16px', marginBottom: '16px' },
  scoreNumber: { fontSize: '80px', fontWeight: '900', color: '#c8ff00', margin: 0 },
  scoreLabel: { color: '#888', fontSize: '16px', margin: '8px 0 0' },
  summary: { backgroundColor: '#111', borderRadius: '16px', padding: '24px', marginBottom: '16px' },
  summaryText: { color: '#ccc', lineHeight: '1.6', margin: 0 },
  categories: { display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' },
  category: { backgroundColor: '#111', borderRadius: '16px', padding: '24px' },
  categoryHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '12px' },
  categoryName: { fontSize: '13px', fontWeight: '700', letterSpacing: '1px', color: '#888' },
  categoryScore: { fontSize: '20px', fontWeight: '900', color: '#c8ff00' },
  progressBar: { height: '6px', backgroundColor: '#222', borderRadius: '3px', marginBottom: '12px' },
  progressFill: { height: '100%', backgroundColor: '#c8ff00', borderRadius: '3px' },
  categoryFeedback: { color: '#ccc', fontSize: '14px', lineHeight: '1.5', margin: 0 },
  priority: { backgroundColor: '#111', borderRadius: '16px', padding: '24px', marginBottom: '16px' },
  priorityTitle: { color: '#c8ff00', marginBottom: '12px', marginTop: 0 },
  priorityText: { color: '#ccc', lineHeight: '1.6', margin: 0 },
  drill: { backgroundColor: '#111', borderRadius: '16px', padding: '24px', marginBottom: '16px' },
  drillTitle: { color: '#c8ff00', marginBottom: '12px', marginTop: 0 },
  drillName: { color: '#fff', marginBottom: '8px', marginTop: 0 },
  drillDesc: { color: '#ccc', lineHeight: '1.6', margin: 0 },
  frames: { backgroundColor: '#111', borderRadius: '16px', padding: '24px', marginBottom: '16px' },
  framesTitle: { color: '#c8ff00', marginBottom: '16px', marginTop: 0 },
  framesGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  frame: { width: '100%', borderRadius: '8px' },
};

export default App;