import { Plus, X } from 'lucide-react';

const PROVIDER_ICONS = {
  aws: '☁️', azure: '🔷', gcp: '🔵', backblaze: '🔴',
};

export default function SessionTabBar({ sessions, activeSessionId, onActivate, onDisconnect, onAddNew }) {
  if (!sessions || sessions.length === 0) return null;

  return (
    <div className="session-tab-bar">
      <div className="session-tabs">
        {sessions.map((s) => (
          <div
            key={s.sessionId}
            className={`session-tab ${s.sessionId === activeSessionId ? 'active' : ''}`}
            onClick={() => onActivate(s.sessionId)}
            draggable={false}
          >
            <span className="session-tab-icon">
              {PROVIDER_ICONS[s.provider] || '☁️'}
            </span>
            <span className="session-tab-label">
              {s.bucket}
            </span>
            <span className="session-tab-provider">
              {s.providerDisplayName}
            </span>
            <button
              className="session-tab-close"
              onClick={(e) => { e.stopPropagation(); onDisconnect(s.sessionId); }}
              title="Disconnect"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
      <button className="session-add-btn" onClick={onAddNew} title="Add Connection">
        <Plus size={14} />
      </button>
    </div>
  );
}
