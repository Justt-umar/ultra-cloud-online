import { Database, LogOut, Settings, Sun, Moon, BarChart3 } from 'lucide-react';

const PROVIDER_ICONS = {
  aws: '☁️', azure: '🔷', gcp: '🔵', backblaze: '🔴',
};

export default function Header({ connected, bucket, provider, providerDisplayName, onDisconnect, onOpenSettings, onOpenAnalytics, encryption, theme, onToggleTheme, sessionCount }) {
  const icon = PROVIDER_ICONS[provider] || '☁️';
  const displayName = providerDisplayName || 'Cloud Storage';

  return (
    <header className="app-header">
      <div className="header-left">
        <Database size={24} style={{ color: '#f97316' }} />
        <span className="header-title">Ultra Cloud</span>
        {sessionCount > 1 && (
          <span className="session-count-badge">{sessionCount} sessions</span>
        )}
      </div>
      <div className="header-right">
        <div className="connection-status">
          <span className={`status-dot ${connected ? 'connected' : ''}`} />
          {connected ? (
            <span>
              {icon} <strong>{bucket}</strong>
              <span className="provider-badge">{displayName}</span>
              {encryption?.enabled && (
                <span className="encryption-badge" title="Client-side encryption active">🔒</span>
              )}
            </span>
          ) : (
            <span>Disconnected</span>
          )}
        </div>

        <button
          className="btn btn-ghost btn-sm theme-toggle"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {connected && (
          <>
            <button className="btn btn-ghost btn-sm" onClick={onOpenAnalytics} title="Storage Analytics">
              <BarChart3 size={16} />
            </button>
            <button className="btn btn-ghost btn-sm" onClick={onOpenSettings} title="Settings">
              <Settings size={16} />
            </button>
            <button className="btn btn-ghost btn-sm" onClick={onDisconnect}>
              <LogOut size={16} />
            </button>
          </>
        )}
      </div>
    </header>
  );
}
