import { useState, useEffect, useCallback } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart3, HardDrive, Files, FolderTree, RefreshCw, X } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import * as api from '../services/api';

const COLORS = ['#f97316', '#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

function formatSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export default function AnalyticsDashboard({ onClose }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAnalytics();
      setAnalytics(res.data.data);
    } catch (err) {
      addToast('Failed to load analytics: ' + (err.response?.data?.message || err.message), 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="analytics-panel" onClick={e => e.stopPropagation()}>
          <div className="loading-state" style={{ padding: 40 }}>
            <div className="spinner" />
            <span>Analyzing storage...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  const { totalSize, totalFiles, totalFolders, distribution, largestFiles, provider, bucket } = analytics;

  const pieData = distribution?.map(d => ({
    name: d.type,
    value: d.size,
    count: d.count,
  })) || [];

  const barData = largestFiles?.map(f => ({
    name: f.name.length > 20 ? f.name.substring(0, 20) + '...' : f.name,
    size: f.size,
    fullName: f.name,
  })) || [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="analytics-panel" onClick={e => e.stopPropagation()}>
        <div className="analytics-header">
          <div>
            <h3><BarChart3 size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />Storage Analytics</h3>
            <span className="analytics-subtitle">{provider} · {bucket}</span>
          </div>
          <div className="analytics-header-actions">
            <button className="btn btn-ghost btn-sm" onClick={fetchAnalytics}><RefreshCw size={14} /></button>
            <button className="modal-close" onClick={onClose}><X size={18} /></button>
          </div>
        </div>

        <div className="analytics-body">
          {/* KPI Cards */}
          <div className="analytics-kpis">
            <div className="kpi-card">
              <HardDrive size={24} style={{ color: '#f97316' }} />
              <div className="kpi-value">{formatSize(totalSize)}</div>
              <div className="kpi-label">Total Storage</div>
            </div>
            <div className="kpi-card">
              <Files size={24} style={{ color: '#a855f7' }} />
              <div className="kpi-value">{totalFiles}</div>
              <div className="kpi-label">Files</div>
            </div>
            <div className="kpi-card">
              <FolderTree size={24} style={{ color: '#3b82f6' }} />
              <div className="kpi-value">{totalFolders}</div>
              <div className="kpi-label">Folders</div>
            </div>
          </div>

          {/* Charts */}
          <div className="analytics-charts">
            {/* File Type Distribution */}
            <div className="chart-card">
              <h4>File Type Distribution</h4>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatSize(value)}
                      contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: '0.8rem' }}
                      labelStyle={{ color: 'var(--text-primary)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-empty">No file data</div>
              )}
              <div className="chart-legend">
                {pieData.map((d, i) => (
                  <div key={d.name} className="legend-item">
                    <span className="legend-dot" style={{ background: COLORS[i % COLORS.length] }} />
                    <span>{d.name}</span>
                    <span className="legend-value">{d.count} files · {formatSize(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Largest Files */}
            <div className="chart-card">
              <h4>Largest Files</h4>
              {barData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                    <XAxis type="number" tickFormatter={formatSize} style={{ fontSize: '0.7rem' }} />
                    <YAxis type="category" dataKey="name" width={120} style={{ fontSize: '0.68rem' }} tick={{ fill: 'var(--text-secondary)' }} />
                    <Tooltip
                      formatter={(value) => formatSize(value)}
                      labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                      contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: '0.8rem' }}
                    />
                    <Bar dataKey="size" radius={[0, 4, 4, 0]}>
                      {barData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-empty">No files found</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
