import { useState, useEffect, useCallback } from 'react';
import { ToastProvider, useToast } from './context/ToastContext';
import * as api from './services/api';
import Header from './components/Header';
import CredentialsForm from './components/CredentialsForm';
import FileExplorer from './components/FileExplorer';
import Toast from './components/Toast';
import Footer from './components/Footer';
import './index.css';

function AppContent() {
  const [connected, setConnected] = useState(false);
  const [bucket, setBucket] = useState('');
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  // Check connection status on mount
  useEffect(() => {
    api.getStatus()
      .then((res) => {
        setConnected(res.data.connected);
        setBucket(res.data.bucket || '');
      })
      .catch(() => {
        setConnected(false);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleConnect = useCallback(async (credentials) => {
    try {
      const res = await api.connect(credentials);
      if (res.data.success) {
        setConnected(true);
        setBucket(credentials.bucket);
        addToast(`Connected to ${credentials.bucket}`, 'success');
      } else {
        addToast(res.data.message || 'Connection failed', 'error');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to connect to S3', 'error');
      throw err;
    }
  }, [addToast]);

  const handleDisconnect = useCallback(async () => {
    try {
      await api.disconnect();
      setConnected(false);
      setBucket('');
      addToast('Disconnected from S3', 'info');
    } catch (err) {
      addToast('Failed to disconnect', 'error');
    }
  }, [addToast]);

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
      <Header connected={connected} bucket={bucket} onDisconnect={handleDisconnect} />
      {connected ? <FileExplorer /> : <CredentialsForm onConnect={handleConnect} />}
      <Toast />
      <Footer />
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
