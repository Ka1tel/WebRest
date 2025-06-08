import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FiMail, FiLock } from 'react-icons/fi';
import axios from 'axios';
import './LoginPage.css';
import { jwtDecode } from 'jwt-decode';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'; 

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email: formData.email,
        password: formData.password
      });

      if (response.data.success) {
      
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        
        const from = location.state?.from?.pathname || '/';
        navigate(from, {
          state: { 
            token: response.data.token 
          }
        });
      }
    } catch (err) {
      if (err.response) {
        if (err.response.status === 401) {
          setError('Неверные учетные данные');
        } else if (err.response.status === 403) {
          navigate('/verify', { 
            state: { 
              email: formData.email,
              message: err.response.data.message || 'Введите код подтверждения'
            }
          });
          return;
        } else {
          setError(err.response.data?.error || 'Ошибка сервера');
        }
      } else {
        setError('Не удалось подключиться к серверу');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-header">
        <h1 className="auth-title">TestySpot</h1>
        <p className="auth-subtitle">Ваш гид по миру вкуса</p>
      </div>

    
      <h2 className="auth-form-title">Вход</h2>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="input-group">
          <label htmlFor="email" className="input-label">Email</label>
          <div className="input-with-icon">
            <FiMail className="input-icon" />
            <input
              id="email"
              type="email"
              name="email"
              className="input-field"
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete="username"
            />
          </div>
        </div>
        
        <div className="input-group">
          <label htmlFor="password" className="input-label">Пароль</label>
          <div className="input-with-icon">
            <FiLock className="input-icon" />
            <input
              id="password"
              type="password"
              name="password"
              className="input-field"
              value={formData.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
            />
          </div>
        </div>
        
        <button 
          type="submit" 
          className="auth-button"
          disabled={isLoading}
          aria-busy={isLoading}
        >
          {isLoading ? (
            <>
              <span className="spinner"></span>
              Вход...
            </>
          ) : (
            'ВОЙТИ'
          )}
        </button>
      </form>

      <div className="auth-footer">
        <p>Еще нет аккаунта? <Link to="/register" className="auth-link">Зарегистрируйтесь</Link></p>
        <Link to="/forgot-password" className="auth-link">Забыли пароль?</Link>
      </div>
    </div>
  );
}