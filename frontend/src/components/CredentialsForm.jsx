import { useState, useEffect } from 'react';
import { Loader2, ArrowRight, Save, Trash2, ChevronDown } from 'lucide-react';
import CorsInstructions from './CorsInstructions';

const STORAGE_KEY = 'ultracloud_saved_credentials';

function getSavedCredentials() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveCredential(cred) {
  const existing = getSavedCredentials();
  // Avoid duplicates by bucket + accessKeyId
  const filtered = existing.filter(
    (c) => !(c.bucket === cred.bucket && c.accessKeyId === cred.accessKeyId)
  );
  const label = cred.label || `${cred.bucket} (${cred.region})`;
  filtered.push({ ...cred, label, savedAt: new Date().toISOString() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

function deleteSavedCredential(index) {
  const existing = getSavedCredentials();
  existing.splice(index, 1);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

export default function CredentialsForm({ onConnect }) {
  const [form, setForm] = useState({
    accessKeyId: '',
    secretAccessKey: '',
    region: 'us-east-1',
    bucket: '',
  });
  const [loading, setLoading] = useState(false);
  const [showCors, setShowCors] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [savedList, setSavedList] = useState([]);
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    setSavedList(getSavedCredentials());
  }, []);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onConnect(form);
      if (rememberMe) {
        saveCredential(form);
        setSavedList(getSavedCredentials());
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSaved = (cred) => {
    setForm({
      accessKeyId: cred.accessKeyId,
      secretAccessKey: cred.secretAccessKey,
      region: cred.region,
      bucket: cred.bucket,
    });
    setShowSaved(false);
  };

  const handleDeleteSaved = (index, e) => {
    e.stopPropagation();
    deleteSavedCredential(index);
    setSavedList(getSavedCredentials());
  };

  const handleTestCredentials = () => {
    setForm({
      accessKeyId: import.meta.env.VITE_TEST_AWS_ACCESS_KEY || '',
      secretAccessKey: import.meta.env.VITE_TEST_AWS_SECRET_KEY || '',
      region: 'us-east-1',
      bucket: 'my-s3-bucket428792470233',
    });
  };

  const regions = [
    'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
    'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-central-1',
    'ap-south-1', 'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1',
    'ap-northeast-2', 'ap-northeast-3', 'sa-east-1', 'ca-central-1',
    'me-south-1', 'af-south-1',
  ];

  return (
    <div className="credentials-container">
      <form className="credentials-card" onSubmit={handleSubmit}>
        <h2>Connect to S3</h2>
        <p>Enter your AWS credentials to manage your S3 bucket files</p>

        {savedList.length > 0 && (
          <div className="saved-credentials">
            <button
              type="button"
              className="saved-credentials-toggle"
              onClick={() => setShowSaved(!showSaved)}
            >
              <Save size={14} />
              Saved Credentials ({savedList.length})
              <ChevronDown
                size={14}
                style={{
                  transform: showSaved ? 'rotate(180deg)' : 'rotate(0)',
                  transition: 'transform 0.2s ease',
                }}
              />
            </button>
            {showSaved && (
              <div className="saved-credentials-list">
                {savedList.map((cred, index) => (
                  <div
                    key={index}
                    className="saved-credential-item"
                    onClick={() => handleLoadSaved(cred)}
                  >
                    <div className="saved-credential-info">
                      <span className="saved-credential-label">{cred.label}</span>
                      <span className="saved-credential-key">
                        {cred.accessKeyId.slice(0, 8)}••••
                      </span>
                    </div>
                    <button
                      type="button"
                      className="saved-credential-delete"
                      onClick={(e) => handleDeleteSaved(index, e)}
                      title="Remove saved credential"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="accessKeyId">Access Key ID</label>
          <input
            id="accessKeyId"
            name="accessKeyId"
            type="text"
            placeholder="AKIAIOSFODNN7EXAMPLE"
            value={form.accessKeyId}
            onChange={handleChange}
            required
            autoComplete="off"
          />
        </div>

        <div className="form-group">
          <label htmlFor="secretAccessKey">Secret Access Key</label>
          <input
            id="secretAccessKey"
            name="secretAccessKey"
            type="password"
            placeholder="••••••••••••••••••••"
            value={form.secretAccessKey}
            onChange={handleChange}
            required
            autoComplete="off"
          />
        </div>

        <div className="form-group">
          <label htmlFor="region">Region</label>
          <select
            id="region"
            name="region"
            value={form.region}
            onChange={handleChange}
          >
            {regions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="bucket">Bucket Name</label>
          <input
            id="bucket"
            name="bucket"
            type="text"
            placeholder="my-s3-bucket"
            value={form.bucket}
            onChange={handleChange}
            required
            autoComplete="off"
          />
        </div>

        <div className="remember-me">
          <label className="remember-me-label">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <Save size={14} />
            Save credentials for next visit
          </label>
        </div>

        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 size={18} className="spinner" />
              Connecting...
            </>
          ) : (
            <>
              Connect
              <ArrowRight size={18} />
            </>
          )}
        </button>

        <div className="cors-toggle">
          <button type="button" onClick={() => setShowCors(!showCors)}>
            {showCors ? 'Hide' : 'Show'} S3 Bucket Setup Instructions
          </button>
        </div>

        {showCors && <CorsInstructions />}
      </form>

      <button 
        type="button" 
        onClick={handleTestCredentials}
        style={{
          position: 'fixed',
          bottom: '30px',
          right: '30px',
          background: 'var(--accent-gradient)',
          color: 'white',
          border: 'none',
          padding: '12px 24px',
          borderRadius: '30px',
          fontWeight: '600',
          fontSize: '0.9rem',
          cursor: 'pointer',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 1000,
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'translateY(-2px)';
          e.target.style.boxShadow = 'var(--shadow-glow)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'translateY(0)';
          e.target.style.boxShadow = 'var(--shadow-lg)';
        }}
      >
        ✨ Use Test Credentials
      </button>
    </div>
  );
}
