import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { LogIn, User, Lock, Loader2 } from 'lucide-react';

const LoginPage: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const formData = new FormData();
            formData.append('username', username);
            formData.append('password', password);

            const response = await api.post('/token', formData);
            const { access_token } = response.data;

            // After getting token, get user info
            const userResponse = await api.get('/users/me', {
                headers: { Authorization: `Bearer ${access_token}` }
            });

            login(access_token, userResponse.data);
            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Error al iniciar sesión');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="glass-card animate-fade-in login-card">
                <div className="login-header">
                    <div className="logo-container">
                        <LogIn size={32} className="logo-icon" />
                    </div>
                    <h1>Horas Penosas</h1>
                    <p>Bienvenido de nuevo</p>
                </div>

                <form onSubmit={handleSubmit}>
                    {error && <div className="error-message">{error}</div>}

                    <div className="input-group">
                        <label className="input-label">Usuario / Email</label>
                        <div className="input-wrapper">
                            <User size={18} className="input-icon" />
                            <input
                                type="text"
                                className="input-field"
                                placeholder="Introduzca su usuario"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label className="input-label">Contraseña</label>
                        <div className="input-wrapper">
                            <Lock size={18} className="input-icon" />
                            <input
                                type="password"
                                className="input-field"
                                placeholder="********"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary w-full" disabled={isLoading}>
                        {isLoading ? <Loader2 className="animate-spin" /> : 'Entrar'}
                    </button>
                </form>
            </div>

            <style>{`
        .login-page {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: radial-gradient(circle at top right, #1e293b, #0f172a);
          padding: 1rem;
        }
        .login-card {
          width: 100%;
          max-width: 400px;
          padding: 2.5rem;
        }
        .login-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .logo-container {
          width: 64px;
          height: 64px;
          background: var(--primary);
          border-radius: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1rem;
          box-shadow: 0 8px 15px -3px rgba(99, 102, 241, 0.4);
        }
        .logo-icon { color: white; }
        .login-header h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
        .login-header p { color: var(--text-muted); font-size: 0.875rem; }
        .input-wrapper { position: relative; }
        .input-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
        }
        .input-wrapper .input-field { padding-left: 2.75rem; }
        .error-message {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid var(--error);
          color: var(--error);
          padding: 0.75rem;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          margin-bottom: 1rem;
          text-align: center;
        }
        .w-full { width: 100%; }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
};

export default LoginPage;
