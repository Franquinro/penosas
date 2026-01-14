import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Plus, Trash2, Calendar, Clock, List as ListIcon, LogOut, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

interface WorkEntry {
    id: number;
    date: string;
    shift: string;
    task: string;
    amount: number;
}

const Dashboard: React.FC = () => {
    const { user, logout } = useAuth();
    const [entries, setEntries] = useState<WorkEntry[]>([]);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [shift, setShift] = useState('Mañana');
    const [task, setTask] = useState('Sacos');
    const [amount, setAmount] = useState<string | number>(8);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        fetchEntries();
    }, []);

    const fetchEntries = async () => {
        try {
            const response = await api.get('/entries/');
            setEntries(response.data);
        } catch (err) {
            console.error('Error fetching entries', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        const normalizedAmount = parseFloat(amount.toString().replace(',', '.'));
        try {
            await api.post('/entries/', { date, shift, task, amount: normalizedAmount });
            fetchEntries();
            // Reset form (except date)
            setAmount("8");
        } catch (err) {
            alert('Error al guardar la entrada');
        } finally {
            setIsLoading(false);
        }
    };

    const deleteEntry = async (id: number) => {
        if (!confirm('¿Seguro que quieres borrar esta entrada?')) return;
        try {
            await api.delete(`/entries/${id}`);
            fetchEntries();
        } catch (err) {
            alert('Error al borrar');
        }
    };

    return (
        <div className="dashboard-container">
            <header className="dashboard-header glass-card">
                <div className="user-info">
                    <h2>Hola, {user?.full_name}</h2>
                    <p>Registra tus horas hoy</p>
                </div>
                <div className="header-actions">
                    {user?.role === 'admin' && (
                        <Link to="/admin" className="btn-admin">
                            <ShieldCheck size={20} />
                            <span>Panel Admin</span>
                        </Link>
                    )}
                    <button onClick={logout} className="btn-icon">
                        <LogOut size={20} />
                        <span>Cerrar Sesión</span>
                    </button>
                </div>
            </header>

            <div className="dashboard-grid">
                <section className="form-section glass-card">
                    <div className="section-title">
                        <Plus size={20} className="text-primary" />
                        <h3>Nueva Entrada</h3>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="input-group">
                            <label className="input-label">Fecha</label>
                            <input type="date" className="input-field" value={date} onChange={e => setDate(e.target.value)} required />
                        </div>
                        <div className="input-group">
                            <label className="input-label">Turno</label>
                            <select className="input-field" value={shift} onChange={e => setShift(e.target.value)}>
                                <option>Mañana</option>
                                <option>Tarde</option>
                                <option>Noche</option>
                            </select>
                        </div>
                        <div className="input-group">
                            <label className="input-label">Tarea</label>
                            <select className="input-field" value={task} onChange={e => setTask(e.target.value)}>
                                <option>Sacos</option>
                                <option>Quemadores</option>
                                <option>Filtros</option>
                                <option>Otros</option>
                            </select>
                        </div>
                        <div className="input-group">
                            <label className="input-label">Horas</label>
                            <input
                                type="text"
                                className="input-field"
                                value={amount}
                                onChange={e => {
                                    // Permitir solo números, puntos y comas
                                    const val = e.target.value.replace(/[^0-9.,]/g, '');
                                    // Normalizar: cambiar puntos por comas (o viceversa según prefiera el usuario)
                                    // Para que el Backend lo entienda siempre como número, lo trataremos al enviar.
                                    setAmount(val as any);
                                }}
                                onBlur={() => {
                                    // Al salir, asegurar que el formato sea numérico válido
                                    const normalized = amount.toString().replace(',', '.');
                                    if (!isNaN(parseFloat(normalized))) {
                                        setAmount(normalized as any);
                                    }
                                }}
                                required
                            />
                        </div>
                        <button type="submit" className="btn btn-primary w-full" disabled={isLoading}>
                            {isLoading ? 'Guardando...' : 'Guardar Horas'}
                        </button>
                    </form>
                </section>

                <section className="list-section glass-card">
                    <div className="section-title">
                        <ListIcon size={20} className="text-primary" />
                        <h3>Tus Entradas Recientes</h3>
                    </div>
                    <div className="entries-list">
                        {entries.length === 0 ? (
                            <div className="empty-state">No hay registros todavía</div>
                        ) : (
                            entries.map(entry => (
                                <div key={entry.id} className="entry-item">
                                    <div className="entry-main">
                                        <div className="entry-date">
                                            <Calendar size={14} />
                                            {entry.date}
                                        </div>
                                        <div className="entry-details">
                                            <span className="badge shift-badge">{entry.shift}</span>
                                            <span className="badge task-badge">{entry.task}</span>
                                        </div>
                                    </div>
                                    <div className="entry-amount">
                                        <Clock size={14} />
                                        {entry.amount}h
                                    </div>
                                    <button onClick={() => deleteEntry(entry.id)} className="btn-delete">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </div>

            <style>{`
        .dashboard-container {
          max-width: 1000px;
          margin: 0 auto;
          padding: 2rem 1rem;
        }
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem 2rem;
          margin-bottom: 2rem;
        }
        .header-actions {
          display: flex;
          gap: 1rem;
          align-items: center;
        }
        .btn-admin {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(99, 102, 241, 0.1);
          border: 1px solid var(--primary);
          color: var(--primary);
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: 0.2s;
          text-decoration: none;
          font-weight: 600;
          font-size: 0.875rem;
        }
        .btn-admin:hover {
          background: var(--primary);
          color: white;
        }
        .btn-icon {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: transparent;
          border: 1px solid var(--glass-border);
          color: var(--text-muted);
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: 0.2s;
        }
        .btn-icon:hover {
          color: var(--error);
          border-color: var(--error);
          background: rgba(239, 68, 68, 0.05);
        }
        .dashboard-grid {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 2rem;
        }
        @media (max-width: 768px) {
          .dashboard-grid { grid-template-columns: 1fr; }
        }
        .section-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--glass-border);
        }
        .glass-card { padding: 1.5rem; }
        .text-primary { color: var(--primary); }
        .entry-item {
          display: flex;
          align-items: center;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--glass-border);
          border-radius: 0.75rem;
          margin-bottom: 0.75rem;
          transition: transform 0.2s;
        }
        .entry-item:hover { transform: translateX(4px); background: rgba(255, 255, 255, 0.04); }
        .entry-main { flex: 1; }
        .entry-date { font-size: 0.875rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.4rem; }
        .entry-details { display: flex; gap: 0.5rem; }
        .badge {
          font-size: 0.75rem;
          padding: 0.2rem 0.6rem;
          border-radius: 1rem;
          font-weight: 600;
        }
        .shift-badge { background: rgba(56, 189, 248, 0.1); color: var(--accent); }
        .task-badge { background: rgba(99, 102, 241, 0.1); color: var(--primary); }
        .entry-amount {
          margin: 0 1.5rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .btn-delete {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 0.4rem;
          transition: 0.2s;
        }
        .btn-delete:hover { color: var(--error); background: rgba(239, 68, 68, 0.1); }
        .empty-state { text-align: center; padding: 3rem; color: var(--text-muted); }
      `}</style>
        </div>
    );
};

export default Dashboard;
