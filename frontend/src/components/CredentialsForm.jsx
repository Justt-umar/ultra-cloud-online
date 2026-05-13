import { useState, useEffect } from 'react';
import { Loader2, ArrowRight, Save, Trash2, ChevronDown, Lock, Cloud } from 'lucide-react';
import CorsInstructions from './CorsInstructions';

const STORAGE_KEY = 'ultracloud_saved_credentials';

// Provider definitions
const PROVIDERS = [
  {
    id: 'aws',
    name: 'AWS S3',
    icon: '☁️',
    color: '#FF9900',
    freeTier: '5 GB · 12 months free',
  },
  {
    id: 'azure',
    name: 'Azure Blob',
    icon: '🔷',
    color: '#0078D4',
    freeTier: '5 GB · 12 months free',
  },
  {
    id: 'gcp',
    name: 'Google Cloud',
    icon: '🔵',
    color: '#4285F4',
    freeTier: '5 GB · always free',
  },
  {
    id: 'backblaze',
    name: 'Backblaze B2',
    icon: '🔴',
    color: '#E21E29',
    freeTier: '10 GB · always free',
  },
];

// AWS region list
const AWS_REGIONS = [
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
  'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-central-1',
  'ap-south-1', 'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1',
  'ap-northeast-2', 'ap-northeast-3', 'sa-east-1', 'ca-central-1',
  'me-south-1', 'af-south-1',
];

// Backblaze regions
const B2_REGIONS = [
  'us-west-004', 'us-west-002', 'us-west-001',
  'eu-central-003',
];

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
  const filtered = existing.filter(
    (c) => !(c.bucket === cred.bucket && c.provider === cred.provider)
  );
  const providerInfo = PROVIDERS.find((p) => p.id === cred.provider) || PROVIDERS[0];
  const label = cred.label || `${cred.bucket || cred.containerName} (${providerInfo.name})`;
  filtered.push({ ...cred, label, savedAt: new Date().toISOString() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

function deleteSavedCredential(index) {
  const existing = getSavedCredentials();
  existing.splice(index, 1);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

// Blocks any attempt to copy/cut/drag text out of a protected field
function blockCopy(e) {
  e.preventDefault();
  return false;
}

export default function CredentialsForm({ onConnect, isAdditional, onCancel }) {
  const [provider, setProvider] = useState('aws');
  const [form, setForm] = useState({
    accessKeyId: '',
    secretAccessKey: '',
    region: 'us-east-1',
    bucket: '',
    connectionString: '',
    containerName: '',
    projectId: '',
    credentialsJson: '',
  });
  const [loading, setLoading] = useState(false);
  const [showCors, setShowCors] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [savedList, setSavedList] = useState([]);
  const [showSaved, setShowSaved] = useState(false);

  // When true: credentials are locked — shown as masked, non-selectable, non-copyable
  const [testMode, setTestMode] = useState(false);
  // GCP: toggle between HMAC keys and Service Account JSON
  const [gcpUseHmac, setGcpUseHmac] = useState(true);

  useEffect(() => {
    setSavedList(getSavedCredentials());
  }, []);

  const handleChange = (e) => {
    // If in test mode, block all manual edits to protected fields
    if (testMode && ['accessKeyId', 'secretAccessKey', 'connectionString', 'credentialsJson'].includes(e.target.name)) return;
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleProviderChange = (newProvider) => {
    setProvider(newProvider);
    setTestMode(false);
    // Reset form when switching providers
    setForm({
      accessKeyId: '',
      secretAccessKey: '',
      region: newProvider === 'backblaze' ? 'us-west-004' : 'us-east-1',
      bucket: '',
      connectionString: '',
      containerName: '',
      projectId: '',
      credentialsJson: '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields before sending
    if (provider === 'aws' || provider === 'backblaze') {
      if (!form.accessKeyId || form.accessKeyId.trim() === '') {
        alert(`Access Key ID is empty. If using Test Credentials, make sure your .env file has ${provider === 'backblaze' ? 'VITE_TEST_B2_ACCESS_KEY' : 'VITE_TEST_AWS_ACCESS_KEY'} set.`);
        return;
      }
      if (!form.secretAccessKey || form.secretAccessKey.trim() === '') {
        alert(`Secret Access Key is empty. Check your .env file.`);
        return;
      }
      if (!form.bucket || form.bucket.trim() === '') {
        alert('Bucket name is required.');
        return;
      }
    } else if (provider === 'azure') {
      if (!form.connectionString || form.connectionString.trim() === '') {
        alert('Connection String is empty. If using Test Credentials, set VITE_TEST_AZURE_CONNECTION_STRING in your .env file.');
        return;
      }
      if (!form.containerName || form.containerName.trim() === '') {
        alert('Container Name is required.');
        return;
      }
    } else if (provider === 'gcp') {
      if (gcpUseHmac) {
        if (!form.accessKeyId || form.accessKeyId.trim() === '') {
          alert('HMAC Access Key is empty. Set VITE_TEST_GCP_HMAC_ACCESS_KEY in your .env file.');
          return;
        }
        if (!form.secretAccessKey || form.secretAccessKey.trim() === '') {
          alert('HMAC Secret Key is empty. Set VITE_TEST_GCP_HMAC_SECRET_KEY in your .env file.');
          return;
        }
      } else {
        if (!form.credentialsJson || form.credentialsJson.trim() === '' || form.credentialsJson.trim() === '{}') {
          alert('Service Account JSON is empty. Set VITE_TEST_GCP_CREDENTIALS_JSON in your .env file.');
          return;
        }
      }
      if (!form.bucket || form.bucket.trim() === '') {
        alert('Bucket name is required.');
        return;
      }
    }

    setLoading(true);
    try {
      await onConnect({ ...form, provider });
      if (rememberMe && !testMode) {
        saveCredential({ ...form, provider });
        setSavedList(getSavedCredentials());
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSaved = (cred) => {
    setTestMode(false);
    setProvider(cred.provider || 'aws');
    setForm({
      accessKeyId: cred.accessKeyId || '',
      secretAccessKey: cred.secretAccessKey || '',
      region: cred.region || 'us-east-1',
      bucket: cred.bucket || '',
      connectionString: cred.connectionString || '',
      containerName: cred.containerName || '',
      projectId: cred.projectId || '',
      credentialsJson: cred.credentialsJson || '',
    });
    setShowSaved(false);
  };

  const handleDeleteSaved = (index, e) => {
    e.stopPropagation();
    deleteSavedCredential(index);
    setSavedList(getSavedCredentials());
  };

  const handleTestCredentials = () => {
    const testData = {
      aws: {
        provider: 'aws',
        accessKeyId: import.meta.env.VITE_TEST_AWS_ACCESS_KEY || '',
        secretAccessKey: import.meta.env.VITE_TEST_AWS_SECRET_KEY || '',
        region: import.meta.env.VITE_TEST_AWS_REGION || 'us-east-1',
        bucket: import.meta.env.VITE_TEST_AWS_BUCKET || '',
        connectionString: '',
        containerName: '',
        projectId: '',
        credentialsJson: '',
      },
      azure: {
        provider: 'azure',
        accessKeyId: '',
        secretAccessKey: '',
        region: '',
        bucket: '',
        connectionString: import.meta.env.VITE_TEST_AZURE_CONNECTION_STRING || '',
        containerName: import.meta.env.VITE_TEST_AZURE_CONTAINER || '',
        projectId: '',
        credentialsJson: '',
      },
      gcp: {
        provider: 'gcp',
        accessKeyId: import.meta.env.VITE_TEST_GCP_HMAC_ACCESS_KEY || '',
        secretAccessKey: import.meta.env.VITE_TEST_GCP_HMAC_SECRET_KEY || '',
        region: '',
        bucket: import.meta.env.VITE_TEST_GCP_BUCKET || '',
        connectionString: '',
        containerName: '',
        projectId: import.meta.env.VITE_TEST_GCP_PROJECT_ID || '',
        credentialsJson: import.meta.env.VITE_TEST_GCP_CREDENTIALS_JSON || '',
      },
      backblaze: {
        provider: 'backblaze',
        accessKeyId: import.meta.env.VITE_TEST_B2_ACCESS_KEY || '',
        secretAccessKey: import.meta.env.VITE_TEST_B2_SECRET_KEY || '',
        region: import.meta.env.VITE_TEST_B2_REGION || 'us-west-004',
        bucket: import.meta.env.VITE_TEST_B2_BUCKET || '',
        connectionString: '',
        containerName: '',
        projectId: '',
        credentialsJson: '',
      },
    };

    const creds = testData[provider] || testData.aws;

    // Check if test credentials are actually configured
    const hasCredentials = provider === 'azure'
      ? creds.connectionString && creds.connectionString !== ''
      : provider === 'gcp'
        ? gcpUseHmac
          ? creds.accessKeyId && creds.accessKeyId !== ''
          : creds.credentialsJson && creds.credentialsJson !== '' && creds.credentialsJson !== '{}'
        : creds.accessKeyId && creds.accessKeyId !== '';

    if (!hasCredentials) {
      const envVarNames = {
        aws: 'VITE_TEST_AWS_ACCESS_KEY & VITE_TEST_AWS_SECRET_KEY',
        azure: 'VITE_TEST_AZURE_CONNECTION_STRING',
        gcp: gcpUseHmac
          ? 'VITE_TEST_GCP_HMAC_ACCESS_KEY & VITE_TEST_GCP_HMAC_SECRET_KEY'
          : 'VITE_TEST_GCP_CREDENTIALS_JSON',
        backblaze: 'VITE_TEST_B2_ACCESS_KEY & VITE_TEST_B2_SECRET_KEY',
      };
      alert(
        `No test credentials found for ${currentProvider.name}.\n\n` +
        `Add these to your frontend/.env file:\n${envVarNames[provider]}\n\n` +
        `Then restart the dev server.`
      );
      return;
    }

    setForm(creds);
    setTestMode(true);
  };

  const currentProvider = PROVIDERS.find((p) => p.id === provider) || PROVIDERS[0];

  // Shared props applied to protected fields in test mode
  const lockedFieldProps = {
    readOnly: true,
    onCopy: blockCopy,
    onCut: blockCopy,
    onDragStart: blockCopy,
    onContextMenu: blockCopy,
    onMouseDown: (e) => e.preventDefault(),
    onKeyDown: (e) => {
      if (e.ctrlKey || e.metaKey) e.preventDefault();
    },
    style: {
      userSelect: 'none',
      WebkitUserSelect: 'none',
      cursor: 'default',
      letterSpacing: '0.15em',
    },
  };

  const getProviderIcon = (providerId) => {
    const p = PROVIDERS.find(pr => pr.id === providerId);
    return p ? p.icon : '☁️';
  };

  return (
    <div className="credentials-container">
      <form className="credentials-card" onSubmit={handleSubmit}>
        <h2>{isAdditional ? 'Add Another Connection' : 'Connect to Cloud Storage'}</h2>
        <p>
          {isAdditional
            ? 'Connect to a different provider or bucket to manage files across clouds'
            : 'Choose your provider and enter credentials to manage your files'}
        </p>
        {isAdditional && onCancel && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel} style={{ marginBottom: 12 }}>
            ← Back to files
          </button>
        )}

        {/* ── Provider Selector ── */}
        <div className="provider-selector" id="provider-selector">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`provider-tab ${provider === p.id ? 'active' : ''}`}
              onClick={() => handleProviderChange(p.id)}
              style={{
                '--provider-color': p.color,
              }}
            >
              <span className="provider-tab-icon">{p.icon}</span>
              <span className="provider-tab-name">{p.name}</span>
              <span className="provider-tab-free">{p.freeTier}</span>
            </button>
          ))}
        </div>

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
                      <span className="saved-credential-label">
                        {getProviderIcon(cred.provider)} {cred.label}
                      </span>
                      <span className="saved-credential-key">
                        {cred.accessKeyId
                          ? cred.accessKeyId.slice(0, 8) + '••••'
                          : cred.provider?.toUpperCase() || 'AWS'}
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

        {/* ── AWS / Backblaze Fields ── */}
        {(provider === 'aws' || provider === 'backblaze') && (
          <>
            <div className="form-group">
              <label htmlFor="accessKeyId">
                {provider === 'backblaze' ? 'Application Key ID' : 'Access Key ID'}
                {testMode && (
                  <span className="locked-badge">
                    <Lock size={11} /> Protected
                  </span>
                )}
              </label>
              <input
                id="accessKeyId"
                name="accessKeyId"
                type={testMode ? 'password' : 'text'}
                placeholder={provider === 'backblaze' ? 'Your Application Key ID' : 'AKIAIOSFODNN7EXAMPLE'}
                value={testMode ? '••••••••••••••••••••' : form.accessKeyId}
                onChange={handleChange}
                required
                autoComplete="off"
                {...(testMode ? lockedFieldProps : {})}
              />
            </div>

            <div className="form-group">
              <label htmlFor="secretAccessKey">
                {provider === 'backblaze' ? 'Application Key' : 'Secret Access Key'}
                {testMode && (
                  <span className="locked-badge">
                    <Lock size={11} /> Protected
                  </span>
                )}
              </label>
              <input
                id="secretAccessKey"
                name="secretAccessKey"
                type="password"
                placeholder="••••••••••••••••••••"
                value={testMode ? '••••••••••••••••••••••••••••••••••••••••' : form.secretAccessKey}
                onChange={handleChange}
                required
                autoComplete="off"
                {...(testMode ? lockedFieldProps : {})}
              />
            </div>

            <div className="form-group">
              <label htmlFor="region">Region</label>
              <select
                id="region"
                name="region"
                value={form.region}
                onChange={handleChange}
                disabled={testMode}
              >
                {(provider === 'backblaze' ? B2_REGIONS : AWS_REGIONS).map((r) => (
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
                placeholder={provider === 'backblaze' ? 'my-b2-bucket' : 'my-s3-bucket'}
                value={form.bucket}
                onChange={handleChange}
                required
                autoComplete="off"
                readOnly={testMode}
                style={testMode ? { cursor: 'default', opacity: 0.75 } : {}}
              />
            </div>
          </>
        )}

        {/* ── Azure Fields ── */}
        {provider === 'azure' && (
          <>
            <div className="form-group">
              <label htmlFor="connectionString">
                Connection String
                {testMode && (
                  <span className="locked-badge">
                    <Lock size={11} /> Protected
                  </span>
                )}
              </label>
              <textarea
                id="connectionString"
                name="connectionString"
                placeholder="DefaultEndpointsProtocol=https;AccountName=...;AccountKey=...;EndpointSuffix=core.windows.net"
                value={testMode ? '••••••••••••••••••••••••••••••••••••••••••••••••' : form.connectionString}
                onChange={handleChange}
                required
                autoComplete="off"
                rows={3}
                className="form-textarea"
                {...(testMode ? lockedFieldProps : {})}
              />
            </div>

            <div className="form-group">
              <label htmlFor="containerName">Container Name</label>
              <input
                id="containerName"
                name="containerName"
                type="text"
                placeholder="my-container"
                value={form.containerName}
                onChange={handleChange}
                required
                autoComplete="off"
                readOnly={testMode}
                style={testMode ? { cursor: 'default', opacity: 0.75 } : {}}
              />
            </div>
          </>
        )}

        {/* ── GCP Fields ── */}
        {provider === 'gcp' && (
          <>
            {/* HMAC / JSON toggle */}
            <div className="gcp-auth-toggle">
              <button
                type="button"
                className={`auth-toggle-btn ${!gcpUseHmac ? 'active' : ''}`}
                onClick={() => { setGcpUseHmac(false); setTestMode(false); }}
              >
                Service Account JSON
              </button>
              <button
                type="button"
                className={`auth-toggle-btn ${gcpUseHmac ? 'active' : ''}`}
                onClick={() => { setGcpUseHmac(true); setTestMode(false); }}
              >
                HMAC Keys (S3-compatible)
              </button>
            </div>

            {gcpUseHmac ? (
              <>
                <div className="form-group">
                  <label htmlFor="accessKeyId">
                    HMAC Access Key
                    {testMode && (
                      <span className="locked-badge">
                        <Lock size={11} /> Protected
                      </span>
                    )}
                  </label>
                  <input
                    id="accessKeyId"
                    name="accessKeyId"
                    type={testMode ? 'password' : 'text'}
                    placeholder="GOOG3B..."
                    value={testMode ? '••••••••••••••••••••' : form.accessKeyId}
                    onChange={handleChange}
                    required
                    autoComplete="off"
                    {...(testMode ? lockedFieldProps : {})}
                  />
                  <span className="form-hint">
                    Get from: Cloud Storage → Settings → Interoperability → User account HMAC
                  </span>
                </div>

                <div className="form-group">
                  <label htmlFor="secretAccessKey">
                    HMAC Secret Key
                    {testMode && (
                      <span className="locked-badge">
                        <Lock size={11} /> Protected
                      </span>
                    )}
                  </label>
                  <input
                    id="secretAccessKey"
                    name="secretAccessKey"
                    type={testMode ? 'password' : 'text'}
                    placeholder="Your HMAC secret key"
                    value={testMode ? '••••••••••••••••••••••••••••••••••••••••' : form.secretAccessKey}
                    onChange={handleChange}
                    required
                    autoComplete="off"
                    {...(testMode ? lockedFieldProps : {})}
                  />
                </div>
              </>
            ) : (
              <div className="form-group">
                <label htmlFor="credentialsJson">
                  Service Account JSON
                  {testMode && (
                    <span className="locked-badge">
                      <Lock size={11} /> Protected
                    </span>
                  )}
                </label>
                <textarea
                  id="credentialsJson"
                  name="credentialsJson"
                  placeholder='Paste your service account JSON key here...'
                  value={testMode ? '{ ••••••••••••••••••••••••••• }' : form.credentialsJson}
                  onChange={handleChange}
                  required
                  autoComplete="off"
                  rows={5}
                  className="form-textarea"
                  {...(testMode ? lockedFieldProps : {})}
                />
                <span className="form-hint">
                  Generate from: IAM → Service Accounts → Keys → Add Key → JSON
                </span>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="projectId">Project ID <span className="optional-badge">optional</span></label>
              <input
                id="projectId"
                name="projectId"
                type="text"
                placeholder="my-gcp-project"
                value={form.projectId}
                onChange={handleChange}
                autoComplete="off"
                readOnly={testMode}
                style={testMode ? { cursor: 'default', opacity: 0.75 } : {}}
              />
            </div>

            <div className="form-group">
              <label htmlFor="bucket">Bucket Name</label>
              <input
                id="bucket"
                name="bucket"
                type="text"
                placeholder="my-gcs-bucket"
                value={form.bucket}
                onChange={handleChange}
                required
                autoComplete="off"
                readOnly={testMode}
                style={testMode ? { cursor: 'default', opacity: 0.75 } : {}}
              />
            </div>
          </>
        )}

        {/* ── Test mode info banner ── */}
        {testMode && (
          <div className="test-mode-banner">
            <Lock size={14} />
            <span>
              Test credentials are active and <strong>protected</strong> — they cannot be viewed or copied.{' '}
              <button
                type="button"
                className="test-mode-clear-btn"
                onClick={() => { setTestMode(false); setForm({ accessKeyId: '', secretAccessKey: '', region: 'us-east-1', bucket: '', connectionString: '', containerName: '', projectId: '', credentialsJson: '' }); }}
              >
                Clear & use your own
              </button>
            </span>
          </div>
        )}

        {!testMode && (
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
        )}

        <button className="btn btn-primary" type="submit" disabled={loading} id="connect-btn">
          {loading ? (
            <>
              <Loader2 size={18} className="spinner" />
              Connecting to {currentProvider.name}...
            </>
          ) : (
            <>
              Connect to {currentProvider.name}
              <ArrowRight size={18} />
            </>
          )}
        </button>

        <div className="cors-toggle">
          <button type="button" onClick={() => setShowCors(!showCors)}>
            {showCors ? 'Hide' : 'Show'} {currentProvider.name} Setup Instructions
          </button>
        </div>

        {showCors && <CorsInstructions provider={provider} />}
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
          gap: '8px',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = 'var(--shadow-glow)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
        }}
      >
        ✨ Use Test Credentials ({currentProvider.name})
      </button>
    </div>
  );
}
