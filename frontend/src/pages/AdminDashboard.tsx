import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Download, Users, FileText, Activity, LogOut, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Summary {
    total_users: number;
    total_entries: number;
    recent_activity: Array<{
        worker: string;
        date: string;
        task: string;
    }>;
}

const AdminDashboard: React.FC = () => {
    const { logout } = useAuth();
    const [summary, setSummary] = useState<Summary | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchSummary();
    }, []);

    const fetchSummary = async () => {
        try {
            const response = await api.get('/admin/summary');
            setSummary(response.data);
        } catch (err) {
            console.error('Error fetching summary', err);
        }
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const response = await api.get('/admin/export', {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'horas_penosas_export.xlsx');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            alert('Error exporting data');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="admin-container">
            <header className="admin-header glass-card">
                <div className="admin-title">
                    <Activity className="text-primary" />
                    <div>
                        <h2>Panel de Administración</h2>
                        <p>Resumen global de actividad</p>
                    </div>
                </div>
                <div className="admin-actions">
                    <button onClick={() => navigate('/')} className="btn-secondary">
                        <ArrowLeft size={18} />
                        <span>Mi Dashboard</span>
                    </button>
                    <button onClick={logout} className="btn-icon-logout">
                        <LogOut size={18} />
                    </button>
                </div>
            </header>

            <div className="stats-grid">
                <div className="stat-card glass-card">
                    <div className="stat-icon user-icon"><Users /></div>
                    <div className="stat-info">
                        <span className="stat-label">Usuarios Totales</span>
                        <span className="stat-value">{summary?.total_users || 0}</span>
                    </div>
                </div>
                <div className="stat-card glass-card">
                    <div className="stat-icon entry-icon"><FileText /></div>
                    <div className="stat-info">
                        <span className="stat-label">Entradas Registradas</span>
                        <span className="stat-value">{summary?.total_entries || 0}</span>
                    </div>
                </div>
                <div className="stat-card glass-card export-card" onClick={handleExport}>
                    <div className="stat-icon export-icon"><Download /></div>
                    <div className="stat-info">
                        <span className="stat-label">Exportar a Excel</span>
                        <span className="stat-value">{isExporting ? 'Procesando...' : 'Descargar'}</span>
                    </div>
                </div>
            </div>

            <div className="activity-section glass-card">
                <div className="section-title">
                    <h3>Actividad Reciente</h3>
                </div>
                <div className="activity-list">
                    {summary?.recent_activity.map((item, idx) => (
                        <div key={idx} className="activity-item">
                            <div className="activity-user">
                                <strong>{item.worker}</strong>
                                <span>registró horas para</span>
                            </div>
                            <div className="activity-task">
                                <span className="activity-task-badge">{item.task}</span>
                                <span className="activity-date">{item.date}</span>
                            </div>
                        </div>
                    ))}
                    {(!summary?.recent_activity || summary.recent_activity.length === 0) && (
                        <div className="empty-state">No hay actividad reciente</div>
                    )}
                </div>
            </div>

            <style>{`
        .admin-container { max-width: 1000px; margin: 0 auto; padding: 2rem 1rem; }
        .admin-header { display: flex; justify-content: space-between; align-items: center; padding: 1.5rem 2rem; margin-bottom: 2rem; }
        .admin-title { display: flex; align-items: center; gap: 1rem; }
        .admin-actions { display: flex; gap: 1rem; align-items: center; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
        .stat-card { display: flex; align-items: center; gap: 1.5rem; padding: 1.5rem; }
        .stat-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
        .user-icon { background: rgba(56, 189, 248, 0.1); color: var(--accent); }
        .entry-icon { background: rgba(99, 102, 241, 0.1); color: var(--primary); }
        .export-icon { background: rgba(34, 197, 94, 0.1); color: var(--success); }
        .export-card { cursor: pointer; border: 1px solid var(--success); transition: 0.2s; }
        .export-card:hover { transform: translateY(-4px); background: rgba(34, 197, 94, 0.05); }
        .stat-info { display: flex; flex-direction: column; }
        .stat-label { font-size: 0.875rem; color: var(--text-muted); }
        .stat-value { font-size: 1.5rem; font-weight: 700; }
        .activity-item { display: flex; justify-content: space-between; align-items: center; padding: 1rem; border-bottom: 1px solid var(--glass-border); }
        .activity-item:last-child { border-bottom: none; }
        .activity-user { display: flex; gap: 0.5rem; align-items: center; }
        .activity-user span { color: var(--text-muted); font-size: 0.875rem; }
        .activity-task { display: flex; align-items: center; gap: 1rem; }
        .activity-task-badge { background: var(--bg-card); padding: 0.25rem 0.75rem; border-radius: 0.5rem; font-size: 0.875rem; }
        .activity-date { color: var(--text-muted); font-size: 0.875rem; }
        .btn-secondary { display: flex; align-items: center; gap: 0.5rem; background: transparent; border: 1px solid var(--glass-border); color: var(--text-main); padding: 0.5rem 1rem; border-radius: 0.5rem; cursor: pointer; }
        .btn-icon-logout { background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 0.5rem; }
        .btn-icon-logout:hover { color: var(--error); }
      `}</style>
        </div>
    );
};

export default AdminDashboard;
