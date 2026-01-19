import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import { Plus, Trash2, Calendar, Clock, LogOut, ShieldCheck, BarChart2, FileText, User, Sun, Moon, Edit2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
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
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [entries, setEntries] = useState<WorkEntry[]>([]);

    // Form State
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [shift, setShift] = useState('Mañana');
    const [task, setTask] = useState('Sacos');
    const [amount, setAmount] = useState<string | number>(1); // Default 1 hour
    const [inputMode, setInputMode] = useState<'decimal' | 'time'>('decimal');
    const [hours, setHours] = useState<string | number>(1);
    const [minutes, setMinutes] = useState<string | number>(0);
    const [isLoading, setIsLoading] = useState(false);
    const [notification, setNotification] = useState<string | null>(null);

    // Filter/Chart State
    const [chartData, setChartData] = useState<any[]>([]);
    const [summaryDate, setSummaryDate] = useState(new Date()); // For monthly summary filter
    const [chartMode, setChartMode] = useState<'hours' | 'euros'>('hours');

    // Edit State
    const [editingEntry, setEditingEntry] = useState<WorkEntry | null>(null);
    const [editDate, setEditDate] = useState('');
    const [editShift, setEditShift] = useState('');
    const [editTask, setEditTask] = useState('');
    const [editAmount, setEditAmount] = useState<string | number>(0);
    const [editInputMode, setEditInputMode] = useState<'decimal' | 'time'>('decimal');
    const [editHours, setEditHours] = useState<string | number>(0);
    const [editMinutes, setEditMinutes] = useState<string | number>(0);

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

    // Export function
    const handleExport = async () => {
        try {
            const year = summaryDate.getFullYear();
            const month = summaryDate.getMonth() + 1;
            const response = await api.get(`/export/month?year=${year}&month=${month}`, {
                responseType: 'blob',
            });

            // Create blob link to download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `resumen_${year}_${month}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
        } catch (err) {
            alert('Error al exportar');
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

    const handleTimeChange = (hStr: string, mStr: string) => {
        setHours(hStr);
        setMinutes(mStr);

        const h = hStr === "" ? 0 : parseInt(hStr);
        const m = mStr === "" ? 0 : parseInt(mStr);

        if (!isNaN(h) && !isNaN(m)) {
            const decimal = h + (m / 60);
            setAmount(parseFloat(decimal.toFixed(2)));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Date validation
        const selectedYear = new Date(date).getFullYear();
        const currentYear = new Date().getFullYear();
        if (selectedYear < 2025 || selectedYear > currentYear) {
            alert(`Fecha no permitida. Solo años entre 2025 y ${currentYear}.`);
            return;
        }

        setIsLoading(true);
        let finalAmount = 0;

        if (inputMode === 'decimal') {
            finalAmount = parseFloat(amount.toString().replace(',', '.'));
        } else {
            const h = hours === "" ? 0 : Number(hours);
            const m = minutes === "" ? 0 : Number(minutes);
            finalAmount = h + (m / 60);
        }

        // Round to 2 decimals to avoid weird floating point issues
        finalAmount = Math.round(finalAmount * 100) / 100;

        try {
            await api.post('/entries/', { date, shift, task, amount: finalAmount });
            fetchMonthlyEntries();
            fetchChartData();

            // Show notification
            setNotification('¡Horas registradas con éxito!');
            setTimeout(() => setNotification(null), 3000);

            // Reset form
            setAmount(1);
            setHours(1);
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


    const startEdit = (entry: WorkEntry) => {
        setEditingEntry(entry);

        // Ensure date is in YYYY-MM-DD format for date input
        const dateStr = entry.date.toString();
        const formattedDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
        setEditDate(formattedDate);

        setEditShift(entry.shift);
        setEditTask(entry.task);
        setEditAmount(entry.amount);

        // Calculate hours and minutes from amount
        const h = Math.floor(entry.amount);
        const m = Math.round((entry.amount - h) * 60);
        setEditHours(h);
        setEditMinutes(m);
    };

    const handleEditDecimalChange = (val: string) => {
        const cleanVal = val.replace(/[^0-9.,]/g, '').replace(',', '.');
        setEditAmount(val);

        const numVal = parseFloat(cleanVal);
        if (!isNaN(numVal)) {
            setEditHours(Math.floor(numVal));
            setEditMinutes(Math.round((numVal - Math.floor(numVal)) * 60));
        }
    };

    const handleEditTimeChange = (hStr: string, mStr: string) => {
        setEditHours(hStr);
        setEditMinutes(mStr);

        const h = hStr === "" ? 0 : parseInt(hStr);
        const m = mStr === "" ? 0 : parseInt(mStr);

        if (!isNaN(h) && !isNaN(m)) {
            const decimal = h + (m / 60);
            setEditAmount(parseFloat(decimal.toFixed(2)));
        }
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingEntry) return;

        setIsLoading(true);
        let finalAmount = 0;

        if (editInputMode === 'decimal') {
            finalAmount = parseFloat(editAmount.toString().replace(',', '.'));
        } else {
            const h = editHours === "" ? 0 : Number(editHours);
            const m = editMinutes === "" ? 0 : Number(editMinutes);
            finalAmount = h + (m / 60);
        }

        finalAmount = Math.round(finalAmount * 100) / 100;

        const updateData = {
            date: editDate,
            shift: editShift,
            task: editTask,
            amount: finalAmount
        };

        console.log('Sending update data:', updateData);

        try {
            await api.put(`/entries/${editingEntry.id}`, updateData);

            fetchMonthlyEntries();
            fetchChartData();
            setEditingEntry(null);

            setNotification('¡Entrada actualizada con éxito!');
            setTimeout(() => setNotification(null), 3000);
        } catch (err: any) {
            console.error('Error al actualizar:', err);
            console.error('Error response:', err?.response?.data);
            const errorMsg = err?.response?.data?.detail || 'Error al actualizar la entrada';
            alert(errorMsg);
        } finally {
            setIsLoading(false);
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
                    <button onClick={toggleTheme} className="btn-icon" title="Cambiar Tema">
                        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                    <button onClick={() => navigate('/profile')} className="btn-icon">
                        <User size={20} />
                        <span>Perfil</span>
                    </button>
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

            {notification && (
                <div className="notification-toast animate-fade-in">
                    {notification}
                </div>
            )}

            {/* CHART SECTION */}
            <section className="chart-section glass-card mb-4" style={{ marginBottom: '2rem' }}>
                <div className="section-title space-between">
                    <div className="d-flex-center">
                        <BarChart2 size={20} className="text-primary" />
                        <h3>Evolución Mensual</h3>
                    </div>
                    <div className="mode-toggle" style={{ paddingBottom: 0 }}>
                        <button
                            className={`mode-btn ${chartMode === 'hours' ? 'active' : ''}`}
                            onClick={() => setChartMode('hours')}
                        >Horas</button>
                        <button
                            className={`mode-btn ${chartMode === 'euros' ? 'active' : ''}`}
                            onClick={() => setChartMode('euros')}
                        >Euros</button>
                    </div>
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
                                formatter={(value: number | undefined) => {
                                    if (value === undefined) return [];
                                    return [
                                        chartMode === 'euros' ? `${value.toFixed(2)} €` : `${value.toFixed(2)} h`,
                                        chartMode === 'euros' ? 'Euros' : 'Horas'
                                    ];
                                }}
                            />
                            <Bar
                                dataKey={chartMode}
                                fill={chartMode === 'euros' ? '#10b981' : 'var(--primary)'}
                                radius={[4, 4, 0, 0]}
                            />
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
                            <input
                                type="date"
                                className="input-field"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                min="2025-01-01"
                                max={`${new Date().getFullYear()}-12-31`}
                                required
                            />
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
                                <option>Filtros FO/Lodos</option>
                                <option>Magnesio</option>
                                <option>Derrames/Fugas</option>
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
                                    <input
                                        type="number"
                                        className="input-field"
                                        value={hours}
                                        onChange={e => handleTimeChange(e.target.value, minutes.toString())}
                                        min="0"
                                        required
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Minutos</label>
                                    <input
                                        type="number"
                                        className="input-field"
                                        value={minutes}
                                        onChange={e => handleTimeChange(hours.toString(), e.target.value)}
                                        min="0"
                                        max="59"
                                        required
                                    />
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

                    <button onClick={handleExport} className="btn" style={{
                        width: '100%',
                        marginBottom: '1rem',
                        background: '#10b981',
                        color: 'white',
                        justifyContent: 'center',
                        fontSize: '1rem',
                        padding: '1rem'
                    }}>
                        <FileText size={20} /> Descargar Excel del Mes
                    </button>

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
                                        {Number(entry.amount).toFixed(2)}h
                                    </div>
                                    <button onClick={() => startEdit(entry)} className="btn-edit" title="Editar">
                                        <Edit2 size={18} />
                                    </button>
                                    <button onClick={() => deleteEntry(entry.id)} className="btn-delete" title="Borrar">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </div>

            {/* EDIT MODAL */}
            {editingEntry && (
                <div className="modal-overlay" onClick={() => setEditingEntry(null)}>
                    <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
                        <div className="section-title">
                            <Edit2 size={20} className="text-primary" />
                            <h3>Editar Entrada</h3>
                        </div>
                        <form onSubmit={handleEditSubmit}>
                            <div className="input-group">
                                <label className="input-label">Fecha</label>
                                <input
                                    type="date"
                                    className="input-field"
                                    value={editDate}
                                    onChange={e => setEditDate(e.target.value)}
                                    min="2025-01-01"
                                    max={`${new Date().getFullYear()}-12-31`}
                                    required
                                />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Turno</label>
                                <select className="input-field" value={editShift} onChange={e => setEditShift(e.target.value)}>
                                    <option>Mañana</option>
                                    <option>Tarde</option>
                                    <option>Noche</option>
                                </select>
                            </div>
                            <div className="input-group">
                                <label className="input-label">Tarea</label>
                                <select className="input-field" value={editTask} onChange={e => setEditTask(e.target.value)}>
                                    <option>Sacos</option>
                                    <option>Quemadores</option>
                                    <option>Filtros FO/Lodos</option>
                                    <option>Magnesio</option>
                                    <option>Derrames/Fugas</option>
                                </select>
                            </div>

                            {/* DUAL INPUT MODE FOR EDIT */}
                            <div className="mode-toggle mb-2">
                                <span className="text-sm text-muted">Modo: </span>
                                <button
                                    type="button"
                                    className={`mode-btn ${editInputMode === 'decimal' ? 'active' : ''}`}
                                    onClick={() => setEditInputMode('decimal')}
                                >Decimal</button>
                                <button
                                    type="button"
                                    className={`mode-btn ${editInputMode === 'time' ? 'active' : ''}`}
                                    onClick={() => setEditInputMode('time')}
                                >Horas:Min</button>
                            </div>

                            {editInputMode === 'decimal' ? (
                                <div className="input-group">
                                    <label className="input-label">Horas (Decimal)</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        value={editAmount}
                                        onChange={e => handleEditDecimalChange(e.target.value)}
                                        placeholder="Ej: 1.5"
                                        required
                                    />
                                    <div className="helper-text">
                                        Equivale a: {editHours}h {editMinutes}m
                                    </div>
                                </div>
                            ) : (
                                <div className="time-inputs">
                                    <div className="input-group">
                                        <label className="input-label">Horas</label>
                                        <input
                                            type="number"
                                            className="input-field"
                                            value={editHours}
                                            onChange={e => handleEditTimeChange(e.target.value, editMinutes.toString())}
                                            min="0"
                                            required
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label className="input-label">Minutos</label>
                                        <input
                                            type="number"
                                            className="input-field"
                                            value={editMinutes}
                                            onChange={e => handleEditTimeChange(editHours.toString(), e.target.value)}
                                            min="0"
                                            max="59"
                                            required
                                        />
                                    </div>
                                    <div className="helper-text full-width">
                                        Total Decimal: {typeof editAmount === 'number' ? editAmount.toFixed(2) : editAmount} h
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setEditingEntry(null)}
                                    className="btn"
                                    style={{ flex: 1, background: 'var(--surface)', color: 'var(--text)' }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    style={{ flex: 1 }}
                                    disabled={isLoading}
                                >
                                    {isLoading ? 'Actualizando...' : 'Actualizar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Dashboard;


