import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Save } from 'lucide-react';
import api from '../services/api';

export default function Profile() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [passwords, setPasswords] = useState({ old: '', new: '', confirm: '' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (passwords.new !== passwords.confirm) {
            setError('Las contraseñas nuevas no coinciden');
            return;
        }

        try {
            await api.put('/users/me/password', {
                old_password: passwords.old,
                new_password: passwords.new
            });
            setSuccess('Contraseña actualizada correctamente');
            setPasswords({ old: '', new: '', confirm: '' });
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Error al actualizar contraseña');
        }
    };

    return (
        <div className="app-container" style={{ padding: '2rem' }}>
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                <button onClick={() => navigate('/')} className="btn" style={{ marginBottom: '1rem', color: 'var(--text-muted)', background: 'transparent' }}>
                    <ArrowLeft size={20} /> Volver al Dashboard
                </button>

                <div className="glass-card" style={{ padding: '2rem' }}>
                    <h2 style={{ marginBottom: '1.5rem' }}>Perfil de Usuario</h2>
                    <div style={{ marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid var(--glass-border)' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Usuario</p>
                        <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{user?.username}</p>
                        {user?.full_name && <p style={{ color: 'var(--text-muted)' }}>{user.full_name}</p>}
                    </div>

                    <h3 style={{ marginBottom: '1rem' }}>Cambiar Contraseña</h3>
                    {error && <div style={{ color: 'var(--error)', marginBottom: '1rem', padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.5rem' }}>{error}</div>}
                    {success && <div style={{ color: 'var(--success)', marginBottom: '1rem', padding: '0.5rem', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '0.5rem' }}>{success}</div>}

                    <form onSubmit={handleSubmit}>
                        <div className="input-group">
                            <label className="input-label">Contraseña Actual</label>
                            <input
                                type="password"
                                className="input-field"
                                value={passwords.old}
                                onChange={e => setPasswords({ ...passwords, old: e.target.value })}
                                required
                            />
                        </div>
                        <div className="input-group">
                            <label className="input-label">Nueva Contraseña</label>
                            <input
                                type="password"
                                className="input-field"
                                value={passwords.new}
                                onChange={e => setPasswords({ ...passwords, new: e.target.value })}
                                required
                            />
                        </div>
                        <div className="input-group">
                            <label className="input-label">Confirmar Nueva Contraseña</label>
                            <input
                                type="password"
                                className="input-field"
                                value={passwords.confirm}
                                onChange={e => setPasswords({ ...passwords, confirm: e.target.value })}
                                required
                            />
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                            <Save size={20} /> Guardar Cambios
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
