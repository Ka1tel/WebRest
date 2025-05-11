import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiCheck, FiRefreshCw } from 'react-icons/fi';
import axios from 'axios';
import '../../styles/AuthStyles.css';

export default function VerificationPage() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || '';

  useEffect(() => {
    // Если email не передан, перенаправляем на страницу входа
    if (!email) {
      navigate('/login');
    }
  }, [email, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await axios.post('http://localhost:5000/api/auth/verify', {
        email,
        code
      });

      if (response.data.success) {
        // Перенаправляем на страницу входа с сообщением об успехе
        navigate('/login', {
          state: {
            verificationSuccess: true,
            message: 'Email успешно подтвержден! Теперь вы можете войти.'
          }
        });
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Неверный код подтверждения');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (cooldown > 0) return;
    
    setResendLoading(true);
    setResendSuccess(false);
    setError('');

    try {
      await axios.post('http://localhost:5000/api/auth/resend-code', { email });
      setResendSuccess(true);
      startCooldown(60); // 60 секунд cooldown
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка при отправке кода');
    } finally {
      setResendLoading(false);
    }
  };

  const startCooldown = (seconds) => {
    setCooldown(seconds);
    const timer = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) clearInterval(timer);
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <div className="auth-container">
      <h1 className="auth-title">Подтверждение Email</h1>
      <p className="auth-subtitle">Введите код подтверждения, отправленный на {email}</p>
      
      {location.state?.message && (
        <div className="info-message">{location.state.message}</div>
      )}
      
      {error && <div className="error-message">{error}</div>}
      {resendSuccess && <div className="success-message">Новый код отправлен на вашу почту</div>}

      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label className="input-label">Код подтверждения</label>
          <div className="input-with-icon">
            <FiCheck className="input-icon" />
            <input
              type="text"
              name="code"
              className="input-field"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              autoFocus
              maxLength={6}
              placeholder="6-значный код"
            />
          </div>
        </div>
        
        <button 
          type="submit" 
          className="auth-button"
          disabled={isLoading}
        >
          {isLoading ? 'Проверка...' : 'Подтвердить'}
        </button>
      </form>
      
      <div className="resend-section">
        <button 
          onClick={handleResendCode}
          disabled={resendLoading || cooldown > 0}
          className="resend-button"
        >
          <FiRefreshCw className={resendLoading ? 'spin' : ''} />
          {cooldown > 0 
            ? `Отправить повторно (${cooldown} сек)` 
            : resendLoading 
              ? 'Отправка...' 
              : 'Отправить код повторно'}
        </button>
      </div>
      
      <div className="auth-links">
        <Link to="/register" className="auth-link">Зарегистрироваться</Link>
        <span style={{ margin: '0 8px' }}>|</span>
        <Link to="/login" className="auth-link">Войти</Link>
      </div>
    </div>
  );
}