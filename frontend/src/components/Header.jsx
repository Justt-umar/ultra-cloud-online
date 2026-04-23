import { Database, LogOut } from 'lucide-react';

export default function Header({ connected, bucket, onDisconnect }) {
  return (
    <header className="app-header">
      <div className="header-left">
        <Database size={24} style={{ color: '#f97316' }} />
        <span className="header-title">Ultra Cloud</span>
      </div>
      <div className="header-right">
        <div className="connection-status">
          <span className={`status-dot ${connected ? 'connected' : ''}`} />
          <span>{connected ? `Connected to ${bucket}` : 'Disconnected'}</span>
        </div>
        {connected && (
          <button className="btn btn-ghost btn-sm" onClick={onDisconnect}>
            <LogOut size={16} />
            Disconnect
          </button>
        )}
      </div>
    </header>
  );
}
