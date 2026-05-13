import { useState, useEffect, useCallback } from 'react';
import {
  X, ScrollText, Webhook, Shield, Download, Trash2, Plus,
  Check, Bell, BellOff, ExternalLink, Clock
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import * as api from '../services/api';

const TABS = [
  { id: 'audit', label: 'Audit Log', icon: ScrollText },
  { id: 'webhooks', label: 'Webhooks', icon: Webhook },
  { id: 'encryption', label: 'Encryption', icon: Shield },
];

export default function SettingsPanel({ onClose, encryption, onEncryptionChange }) {
  const [activeTab, setActiveTab] = useState('audit');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="settings-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="settings-header">
          <h3>⚙️ Settings</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="settings-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon size={15} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="settings-body">
          {activeTab === 'audit' && <AuditLogTab />}
          {activeTab === 'webhooks' && <WebhooksTab />}
          {activeTab === 'encryption' && (
            <EncryptionTab
              encryption={encryption}
              onEncryptionChange={onEncryptionChange}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// AUDIT LOG TAB
// ═══════════════════════════════════════

function AuditLogTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const fetchLogs = useCallback(async () => {
    try {
      const res = await api.getAuditLogs(200);
      setLogs(res.data.data || []);
    } catch {
      // Server might not be connected yet
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  const handleExport = async () => {
    try {
      const res = await api.exportAuditLogs();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ultra-cloud-audit.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      addToast('Audit log exported', 'success');
    } catch {
      addToast('Export failed', 'error');
    }
  };

  const handleClear = async () => {
    try {
      await api.clearAuditLogs();
      setLogs([]);
      addToast('Audit logs cleared', 'success');
    } catch {
      addToast('Clear failed', 'error');
    }
  };

  const getStatusClass = (status) => {
    if (status === 'SUCCESS') return 'audit-status-success';
    if (status === 'FAILURE') return 'audit-status-error';
    return '';
  };

  const getActionIcon = (action) => {
    const icons = {
      CONNECT: '🔗', DISCONNECT: '🔌', UPLOAD: '⬆️', DOWNLOAD: '⬇️',
      DELETE: '🗑️', RENAME: '✏️', CREATE_FOLDER: '📁', SHARE: '🔗',
      WEBHOOK_ADDED: '🔔',
    };
    return icons[action] || '📋';
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="audit-tab">
      <div className="audit-actions">
        <span className="audit-count">{logs.length} event{logs.length !== 1 ? 's' : ''}</span>
        <div className="audit-buttons">
          <button className="btn btn-sm btn-ghost" onClick={handleExport} title="Export CSV">
            <Download size={14} /> Export CSV
          </button>
          <button className="btn btn-sm btn-ghost" onClick={handleClear} title="Clear logs">
            <Trash2 size={14} /> Clear
          </button>
        </div>
      </div>

      <div className="audit-list">
        {loading ? (
          <div className="audit-empty">
            <div className="spinner" style={{ width: 20, height: 20 }} />
            <span>Loading logs...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="audit-empty">
            <ScrollText size={32} />
            <span>No audit events yet</span>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="audit-item">
              <span className="audit-icon">{getActionIcon(log.action)}</span>
              <div className="audit-info">
                <div className="audit-action">
                  <strong>{log.action}</strong>
                  <span className={`audit-status ${getStatusClass(log.status)}`}>
                    {log.status}
                  </span>
                </div>
                <div className="audit-details">{log.details}</div>
                <div className="audit-meta">
                  <Clock size={11} /> {formatTime(log.timestamp)}
                  {log.provider && <span> · {log.provider}</span>}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// WEBHOOKS TAB
// ═══════════════════════════════════════

function WebhooksTab() {
  const [webhooks, setWebhooks] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('generic');
  const { addToast } = useToast();

  const fetchWebhooks = useCallback(async () => {
    try {
      const res = await api.getWebhooks();
      setWebhooks(res.data.data || []);
    } catch {
      setWebhooks([]);
    }
  }, []);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  const handleAdd = async () => {
    if (!newUrl.trim()) {
      addToast('Webhook URL is required', 'warning');
      return;
    }
    try {
      await api.addWebhook(newUrl.trim(), newName.trim() || 'Webhook', newType);
      addToast('Webhook added', 'success');
      setNewUrl('');
      setNewName('');
      setNewType('generic');
      setShowAdd(false);
      fetchWebhooks();
    } catch {
      addToast('Failed to add webhook', 'error');
    }
  };

  const handleRemove = async (id) => {
    try {
      await api.removeWebhook(id);
      addToast('Webhook removed', 'success');
      fetchWebhooks();
    } catch {
      addToast('Failed to remove webhook', 'error');
    }
  };

  const handleToggle = async (id, currentEnabled) => {
    try {
      await api.toggleWebhook(id, !currentEnabled);
      fetchWebhooks();
    } catch {
      addToast('Toggle failed', 'error');
    }
  };

  const getTypeIcon = (type) => {
    if (type === 'slack') return '💬';
    if (type === 'discord') return '🎮';
    return '🌐';
  };

  return (
    <div className="webhooks-tab">
      <p className="settings-description">
        Receive notifications when files are uploaded, deleted, or modified.
        Supports Slack, Discord, and custom webhook endpoints.
      </p>

      {webhooks.length > 0 && (
        <div className="webhook-list">
          {webhooks.map((wh) => (
            <div key={wh.id} className={`webhook-item ${!wh.enabled ? 'disabled' : ''}`}>
              <div className="webhook-info">
                <span className="webhook-type-icon">{getTypeIcon(wh.type)}</span>
                <div>
                  <div className="webhook-name">{wh.name}</div>
                  <div className="webhook-url">{wh.url}</div>
                </div>
              </div>
              <div className="webhook-actions">
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => handleToggle(wh.id, wh.enabled)}
                  title={wh.enabled ? 'Disable' : 'Enable'}
                >
                  {wh.enabled ? <Bell size={14} /> : <BellOff size={14} />}
                </button>
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => handleRemove(wh.id)}
                  title="Remove"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd ? (
        <div className="webhook-add-form">
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              placeholder="My Slack Notifications"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Webhook URL</label>
            <input
              type="url"
              placeholder="https://hooks.slack.com/services/..."
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Type</label>
            <select value={newType} onChange={(e) => setNewType(e.target.value)}>
              <option value="generic">🌐 Generic</option>
              <option value="slack">💬 Slack</option>
              <option value="discord">🎮 Discord</option>
            </select>
          </div>
          <div className="webhook-add-actions">
            <button className="btn btn-sm btn-primary" onClick={handleAdd}>
              <Check size={14} /> Save
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => setShowAdd(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button className="btn btn-sm btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={14} /> Add Webhook
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// ENCRYPTION TAB
// ═══════════════════════════════════════

function EncryptionTab({ encryption, onEncryptionChange }) {
  const [passphrase, setPassphrase] = useState(encryption.passphrase || '');
  const [enabled, setEnabled] = useState(encryption.enabled || false);

  const handleToggle = () => {
    const newEnabled = !enabled;
    setEnabled(newEnabled);
    onEncryptionChange({ enabled: newEnabled, passphrase });
  };

  const handlePassphraseChange = (e) => {
    setPassphrase(e.target.value);
    onEncryptionChange({ enabled, passphrase: e.target.value });
  };

  return (
    <div className="encryption-tab">
      <div className="encryption-hero">
        <Shield size={40} style={{ color: enabled ? 'var(--success)' : 'var(--text-tertiary)' }} />
        <h4>Zero-Knowledge Encryption</h4>
        <p>
          Files are encrypted in your browser using AES-256-GCM before upload.
          Your passphrase never leaves your device — the server only sees encrypted data.
        </p>
      </div>

      <div className="encryption-toggle-row">
        <span>Client-side encryption</span>
        <label className="toggle-switch">
          <input type="checkbox" checked={enabled} onChange={handleToggle} />
          <span className="toggle-slider" />
        </label>
      </div>

      {enabled && (
        <div className="encryption-passphrase">
          <div className="form-group">
            <label htmlFor="enc-passphrase">
              Encryption Passphrase
            </label>
            <input
              id="enc-passphrase"
              type="password"
              placeholder="Enter a strong passphrase"
              value={passphrase}
              onChange={handlePassphraseChange}
              autoComplete="off"
            />
            <span className="form-hint">
              ⚠️ Remember this passphrase — it cannot be recovered. If lost, encrypted files become unrecoverable.
            </span>
          </div>

          <div className="encryption-info-cards">
            <div className="enc-info-card">
              <strong>Algorithm</strong>
              <span>AES-256-GCM</span>
            </div>
            <div className="enc-info-card">
              <strong>Key Derivation</strong>
              <span>PBKDF2 · 100K iterations</span>
            </div>
            <div className="enc-info-card">
              <strong>Encrypted Files</strong>
              <span>.enc extension added</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
