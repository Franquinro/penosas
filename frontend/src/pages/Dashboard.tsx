import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Plus, Trash2, Calendar, Clock, LogOut, ShieldCheck, BarChart2, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

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

    // Form State
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [shift, setShift] = useState('Mañana');
    const [task, setTask] = useState('Sacos');
    const [amount, setAmount] = useState<string | number>(8);
    const [inputMode, setInputMode] = useState<'decimal' | 'time'>('decimal');
    const [hours, setHours] = useState(8);
    const [minutes, setMinutes] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    // Filter/Chart State
    const [chartData, setChartData] = useState([]);
    const [summaryDate, setSummaryDate] = useState(new Date()); // For monthly summary filter

    useEffect(() => {
        fetchMonthlyEntries();
        fetchChartData();
    }, [summaryDate]);

    const fetchMonthlyEntries = async () => {
        try {
            const year = summaryDate.getFullYear();
            const month = summaryDate.getMonth() + 1;
            const response = await api.get(`/entries/?year=${year}&month=${month}`);
            setEntries(response.data);
        } catch (err) {
            console.error('Error fetching entries', err);
        }
    };

    const fetchChartData = async () => {
        try {
            const response = await api.get('/entries/stats/monthly');
            setChartData(response.data);
        } catch (err) {
            console.error('Error fetching chart data', err);
        }
    };

    // Input Handlers
    const handleDecimalChange = (val: string) => {
        // Cleaning input
        const cleanVal = val.replace(/[^0-9.,]/g, '').replace(',', '.');
        setAmount(val); // Keep visuals as user typed

        const numVal = parseFloat(cleanVal);
        if (!isNaN(numVal)) {
            setHours(Math.floor(numVal));
            setMinutes(Math.round((numVal - Math.floor(numVal)) * 60));
        }
    };

    const handleTimeChange = (h: number, m: number) => {
        setHours(h);
        setMinutes(m);
        const decimal = h + (m / 60);
        setAmount(parseFloat(decimal.toFixed(2))); // Sync back decimal
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        let finalAmount = 0;

        if (inputMode === 'decimal') {
            finalAmount = parseFloat(amount.toString().replace(',', '.'));
        } else {
            finalAmount = hours + (minutes / 60);
        }

        try {
            await api.post('/entries/', { date, shift, task, amount: finalAmount });
            fetchMonthlyEntries();
            fetchChartData();
            // Reset form (keep generic logic)
            setAmount(8);
            setHours(8);
            setMinutes(0);
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
            fetchMonthlyEntries();
            fetchChartData();
        } catch (err) {
            alert('Error al borrar');
        }
    };

    const totalHours = entries.reduce((acc, curr) => acc + curr.amount, 0);

    // Helpers for Month Navigation
    const changeMonth = (delta: number) => {
        const newDate = new Date(summaryDate);
        newDate.setMonth(newDate.getMonth() + delta);
        setSummaryDate(newDate);
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

            {/* CHART SECTION */}
            <section className="chart-section glass-card mb-4" style={{ marginBottom: '2rem' }}>
                <div className="section-title">
                    <BarChart2 size={20} className="text-primary" />
                    <h3>Evolución Mensual (Últimos 6 meses)</h3>
                </div>
                <div style={{ width: '100%', height: 250 }}>
                    <ResponsiveContainer>
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                            <XAxis dataKey="name" stroke="#888888" fontSize={12} />
                            <YAxis stroke="#888888" fontSize={12} />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'rgba(23, 23, 23, 0.9)', border: 'none', borderRadius: '8px' }}
                                itemStyle={{ color: '#fff' }}
                                cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                            />
                            <Bar dataKey="hours" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </section>

            <div className="dashboard-grid">
                {/* FORM SECTION */}
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

                        {/* DUAL INPUT MODE */}
                        <div className="mode-toggle mb-2">
                            <span className="text-sm text-muted">Modo: </span>
                            <button
                                type="button"
                                className={`mode-btn ${inputMode === 'decimal' ? 'active' : ''}`}
                                onClick={() => setInputMode('decimal')}
                            >Decimal</button>
                            <button
                                type="button"
                                className={`mode-btn ${inputMode === 'time' ? 'active' : ''}`}
                                onClick={() => setInputMode('time')}
                            >Horas:Min</button>
                        </div>

                        {inputMode === 'decimal' ? (
                            <div className="input-group">
                                <label className="input-label">Horas (Decimal)</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    value={amount}
                                    onChange={e => handleDecimalChange(e.target.value)}
                                    placeholder="Ej: 1.5"
                                    required
                                />
                                <div className="helper-text">
                                    Equivale a: {hours}h {minutes}m
                                </div>
                            </div>
                        ) : (
                            <div className="time-inputs">
                                <div className="input-group">
                                    <label className="input-label">Horas</label>
                                    <input type="number" className="input-field" value={hours} onChange={e => handleTimeChange(Number(e.target.value), minutes)} min="0" required />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Minutos</label>
                                    <input type="number" className="input-field" value={minutes} onChange={e => handleTimeChange(hours, Number(e.target.value))} min="0" max="59" required />
                                </div>
                                <div className="helper-text full-width">
                                    Total Decimal: {typeof amount === 'number' ? amount.toFixed(2) : amount} h
                                </div>
                            </div>
                        )}

                        <button type="submit" className="btn btn-primary w-full" disabled={isLoading}>
                            {isLoading ? 'Guardando...' : 'Guardar Horas'}
                        </button>
                    </form>
                </section>

                {/* LIST SECTION WITH SUMMARY */}
                <section className="list-section glass-card">
                    <div className="section-title space-between">
                        <div className="d-flex-center">
                            <FileText size={20} className="text-primary" />
                            <h3>Resumen Mensual</h3>
                        </div>
                        <div className="month-selector">
                            <button onClick={() => changeMonth(-1)} className="btn-icon-sm">{'<'}</button>
                            <span>{summaryDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}</span>
                            <button onClick={() => changeMonth(1)} className="btn-icon-sm">{'>'}</button>
                        </div>
                    </div>

                    <div className="summary-banner mb-4">
                        <div className="summary-item">
                            <span>Total Horas</span>
                            <strong>{totalHours.toFixed(2)} h</strong>
                        </div>
                        <div className="summary-item">
                            <span>Formato HH:MM</span>
                            <strong>{Math.floor(totalHours)}:{Math.round((totalHours - Math.floor(totalHours)) * 60).toString().padStart(2, '0')} h</strong>
                        </div>
                    </div>

                    <div className="entries-list">
                        {entries.length === 0 ? (
                            <div className="empty-state">No hay registros este mes</div>
                        ) : (
                            entries.map(entry => (
                                <div key={entry.id} className="entry-item">
                                    <div className="entry-main">
                                        <div className="entry-date">
                                            <Calendar size={14} />
                                            {new Date(entry.date).toLocaleDateString()}
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
        .space-between { justify-content: space-between; }
        .d-flex-center { display: flex; align-items: center; gap: 0.75rem; }
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

        /* New Styles for Mode Toggle & Summary */
        .mode-toggle { display: flex; align-items: center; gap: 1rem; padding-bottom: 1rem; }
        .mode-btn { 
            background: transparent; 
            border: 1px solid var(--glass-border); 
            color: var(--text-muted); 
            padding: 0.25rem 0.75rem; 
            border-radius: 1rem; 
            cursor: pointer; 
            font-size: 0.8rem; 
        }
        .mode-btn.active { background: var(--primary); color: white; border-color: var(--primary); }
        .helper-text { font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem; }
        .time-inputs { display: flex; gap: 1rem; flex-wrap: wrap; }
        .time-inputs .input-group { flex: 1; }
        .full-width { width: 100%; }

        .month-selector { display: flex; align-items: center; gap: 0.5rem; font-weight: 600; }
        .btn-icon-sm { background: transparent; border: 1px solid var(--glass-border); color: var(--text-main); width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .btn-icon-sm:hover { background: rgba(255,255,255,0.1); }
        
        .summary-banner {
            display: flex;
            justify-content: space-around;
            background: rgba(99, 102, 241, 0.1);
            border: 1px solid var(--primary);
            border-radius: 0.75rem;
            padding: 1rem;
        }
        .summary-item { display: flex; flex-direction: column; align-items: center; }
        .summary-item span { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
        .summary-item strong { font-size: 1.25rem; color: var(--primary); }
      `}</style>
        </div>
    );
};

export default Dashboard;

