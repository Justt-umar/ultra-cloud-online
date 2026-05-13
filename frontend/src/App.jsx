import { useState, useEffect, useCallback } from 'react';
import { ToastProvider, useToast } from './context/ToastContext';
import * as api from './services/api';
import Header from './components/Header';
import CredentialsForm from './components/CredentialsForm';
import FileExplorer from './components/FileExplorer';
import SessionTabBar from './components/SessionTabBar';
import SettingsPanel from './components/SettingsPanel';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import Toast from './components/Toast';
import Footer from './components/Footer';
import './index.css';

function AppContent() {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showAddConnection, setShowAddConnection] = useState(false);
  const [encryption, setEncryption] = useState({ enabled: false, passphrase: '' });
  const [theme, setTheme] = useState(() => localStorage.getItem('ultra-cloud-theme') || 'dark');
  const { addToast } = useToast();

  // Drag state for cross-provider transfer
  const [dragSource, setDragSource] = useState(null);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ultra-cloud-theme', theme);
  }, [theme]);

  const handleToggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  // Check connection status on mount
  useEffect(() => {
    api.getStatus()
      .then((res) => {
        if (res.data.connected) {
          // Fetch full session list
          return api.listSessions().then(sessRes => {
            const sessionList = sessRes.data.data || [];
            setSessions(sessionList);
            setActiveSessionId(res.data.activeSessionId || sessionList[0]?.sessionId);
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const refreshSessions = useCallback(async () => {
    try {
      const res = await api.listSessions();
      setSessions(res.data.data || []);
    } catch {}
  }, []);

  const handleConnect = useCallback(async (credentials) => {
    try {
      const res = await api.connect(credentials);
      if (res.data.success) {
        const data = res.data.data || {};
        const newSessionId = data.sessionId;

        addToast(`Connected to ${data.providerDisplayName || 'cloud storage'}`, 'success');
        setShowAddConnection(false);

        // Refresh session list
        const sessRes = await api.listSessions();
        const sessionList = sessRes.data.data || [];
        setSessions(sessionList);

        // Activate the new session
        if (newSessionId) {
          await api.activateSession(newSessionId);
          setActiveSessionId(newSessionId);
        }
      } else {
        addToast(res.data.message || 'Connection failed', 'error');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to connect', 'error');
      throw err;
    }
  }, [addToast]);

  const handleDisconnect = useCallback(async (sessionId) => {
    try {
      await api.disconnect(sessionId);
      addToast('Disconnected', 'info');

      // Refresh sessions
      const sessRes = await api.listSessions();
      const sessionList = sessRes.data.data || [];
      setSessions(sessionList);

      if (sessionList.length > 0) {
        const nextActive = sessionList[0].sessionId;
        await api.activateSession(nextActive);
        setActiveSessionId(nextActive);
      } else {
        setActiveSessionId(null);
      }
    } catch (err) {
      addToast('Failed to disconnect', 'error');
    }
  }, [addToast]);

  const handleActivateSession = useCallback(async (sessionId) => {
    try {
      await api.activateSession(sessionId);
      setActiveSessionId(sessionId);
    } catch (err) {
      addToast('Failed to switch session', 'error');
    }
  }, [addToast]);

  // Cross-provider drag-and-drop
  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    if (!dragSource) return;

    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      // The drop target is the currently active session
      // The source is from dragSource.sessionId
      if (dragSource.sessionId === activeSessionId) {
        addToast('Cannot transfer to the same session', 'warning');
        return;
      }

      addToast(`Transferring ${data.name}...`, 'info');

      await api.transferFile(dragSource.sessionId, data.key, activeSessionId, '');
      addToast(`${data.name} transferred successfully!`, 'success');
    } catch (err) {
      addToast('Transfer failed: ' + (err.response?.data?.message || err.message), 'error');
    } finally {
      setDragSource(null);
    }
  }, [dragSource, activeSessionId, addToast]);

  const connected = sessions.length > 0;
  const activeSession = sessions.find(s => s.sessionId === activeSessionId);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="loading-state">
          <div className="spinner" style={{ width: '32px', height: '32px' }} />
          <span>Initializing...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header
        connected={connected}
        bucket={activeSession?.bucket || ''}
        provider={activeSession?.provider || ''}
        providerDisplayName={activeSession?.providerDisplayName || ''}
        onDisconnect={() => activeSessionId && handleDisconnect(activeSessionId)}
        onOpenSettings={() => setShowSettings(true)}
        onOpenAnalytics={() => setShowAnalytics(true)}
        encryption={encryption}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        sessionCount={sessions.length}
      />

      {connected && sessions.length > 0 && (
        <SessionTabBar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onActivate={handleActivateSession}
          onDisconnect={handleDisconnect}
          onAddNew={() => setShowAddConnection(true)}
        />
      )}

      {connected && !showAddConnection ? (
        <div
          className="file-explorer-drop-target"
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
          onDrop={handleDrop}
        >
          <FileExplorer
            key={activeSessionId}
            encryption={encryption}
          />
        </div>
      ) : (
        <CredentialsForm
          onConnect={handleConnect}
          isAdditional={sessions.length > 0}
          onCancel={sessions.length > 0 ? () => setShowAddConnection(false) : undefined}
        />
      )}

      <Toast />
      <Footer />

      {showSettings && (
        <SettingsPanel
          onClose={() => setShowSettings(false)}
          encryption={encryption}
          onEncryptionChange={setEncryption}
        />
      )}

      {showAnalytics && (
        <AnalyticsDashboard onClose={() => setShowAnalytics(false)} />
      )}
    </>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
