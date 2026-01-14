import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Download, Users, FileText, Activity, LogOut, ArrowLeft, Trash2, User as UserIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface User {
    id: number;
    username: string;
    full_name: string;
    role: string;
}

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
    const [users, setUsers] = useState<User[]>([]);
    const [isExporting, setIsExporting] = useState(false);
    const [activeTab, setActiveTab] = useState<'activity' | 'users'>('activity');
    const navigate = useNavigate();

    useEffect(() => {
        fetchSummary();
        fetchUsers();
    }, []);

    const fetchSummary = async () => {
        try {
            const response = await api.get('/admin/summary');
            setSummary(response.data);
        } catch (err) {
            console.error('Error fetching summary', err);
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await api.get('/admin/users');
            setUsers(response.data);
        } catch (err) {
            console.error('Error fetching users', err);
        }
    };

    const handleDeleteUser = async (userId: number, username: string) => {
        if (username === 'admin') {
            alert('No se puede eliminar el administrador principal');
            return;
        }
        if (!confirm(`¿Estás seguro de que quieres eliminar al usuario "${username}"? Se borrarán también todas sus horas.`)) return;

        try {
            await api.delete(`/admin/users/${userId}`);
            fetchUsers();
            fetchSummary(); // Refresh stats
        } catch (err) {
            alert('Error al eliminar usuario');
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

            <div className="admin-content-grid">
                <div className="tabs glass-card">
                    <button
                        className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
                        onClick={() => setActiveTab('activity')}
                    >
                        <Activity size={18} />
                        Actividad
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
                        onClick={() => setActiveTab('users')}
                    >
                        <Users size={18} />
                        Usuarios
                    </button>
                </div>

                <div className="main-content glass-card">
                    {activeTab === 'activity' ? (
                        <div className="activity-section">
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
                    ) : (
                        <div className="users-section">
                            <div className="section-title">
                                <h3>Gestión de Usuarios</h3>
                            </div>
                            <div className="users-list">
                                {users.map(u => (
                                    <div key={u.id} className="user-item">
                                        <div className="user-main">
                                            <UserIcon size={18} className="text-muted" />
                                            <div className="user-details">
                                                <strong>{u.full_name}</strong>
                                                <span>@{u.username} • {u.role}</span>
                                            </div>
                                        </div>
                                        {u.username !== 'admin' && (
                                            <button onClick={() => handleDeleteUser(u.id, u.username)} className="btn-delete-user">
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
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
        .admin-content-grid { display: grid; grid-template-columns: 200px 1fr; gap: 1.5rem; }
        @media (max-width: 768px) { .admin-content-grid { grid-template-columns: 1fr; } }
        .tabs { display: flex; flex-direction: column; gap: 0.5rem; padding: 1rem; height: fit-content; }
        .tab-btn { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem; border: none; background: transparent; color: var(--text-muted); cursor: pointer; border-radius: 0.5rem; transition: 0.2s; text-align: left; font-weight: 500; }
        .tab-btn:hover { background: rgba(255, 255, 255, 0.05); color: var(--text-main); }
        .tab-btn.active { background: rgba(99, 102, 241, 0.1); color: var(--primary); }
        .main-content { padding: 1.5rem; }
        .user-item { display: flex; justify-content: space-between; align-items: center; padding: 1rem; border-bottom: 1px solid var(--glass-border); }
        .user-item:last-child { border-bottom: none; }
        .user-main { display: flex; align-items: center; gap: 1rem; }
        .user-details { display: flex; flex-direction: column; }
        .user-details span { font-size: 0.8125rem; color: var(--text-muted); }
        .btn-delete-user { background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 0.5rem; border-radius: 0.5rem; transition: 0.2s; }
        .btn-delete-user:hover { color: var(--error); background: rgba(239, 68, 68, 0.1); }
        .btn-secondary { display: flex; align-items: center; gap: 0.5rem; background: transparent; border: 1px solid var(--glass-border); color: var(--text-main); padding: 0.5rem 1rem; border-radius: 0.5rem; cursor: pointer; }
        .btn-icon-logout { background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 0.5rem; }
        .btn-icon-logout:hover { color: var(--error); }
        .text-muted { color: var(--text-muted); }
      `}</style>
        </div>
    );
};

export default AdminDashboard;
