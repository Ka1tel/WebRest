import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import axios from 'axios';
import './RegistrationPage.css';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'; 

export default function RegistrationPage() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Проверка совпадения паролей
    if (formData.password !== formData.confirmPassword) {
      setError('Пароли не совпадают');
      setIsLoading(false);
      return;
    }

    // Валидация email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Введите корректный email');
      setIsLoading(false);
      return;
    }
    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      setError(passwordError);
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/register`, {
        username: formData.username,
        email: formData.email,
        password: formData.password
      });

      if (response.data.success) {
        setVerificationSent(true);
        navigate('/verify', { 
          state: { 
            email: formData.email,
            message: 'Код подтверждения отправлен на вашу почту'
          } 
        });
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Ошибка регистрации');
    } finally {
      setIsLoading(false);
    }
  };
  const validatePassword = (password) => {
    if (password.length < 8) {
      return 'Пароль должен содержать не менее 8 символов.';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Пароль должен содержать хотя бы одну большую букву.';
    }
    if (!/[a-z]/.test(password)) {
      return 'Пароль должен содержать хотя бы одну маленькую букву.';
    }
    return ''; 
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (verificationSent) {
    return (
      <div className="auth-container">
        <h1 className="auth-title">Проверьте вашу почту</h1>
        <p className="auth-subtitle">
          Мы отправили код подтверждения на {formData.email}
        </p>
        <Link to="/verify" className="auth-link-sig">
          Перейти к подтверждению
        </Link>
      </div>
    );
  }

  return (
    <div className="registration-container">
      <div className="registration-header">
        <h1>TestySpot</h1>
        <p>Ваш гид по миру вкуса</p>
      </div>

      <div className="registration-card">
        <h2>Создайте аккаунт</h2>
        <p>Присоединяйтесь к нашему кулинарному сообществу</p>

        {error && (
          <div className="alert error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="registration-form">
          <div className="input-group">
            <FiUser className="input-icon" />
            <input
              type="text"
              name="username"
              placeholder="Имя пользователя"
              value={formData.username}
              onChange={handleChange}
              required
              minLength={3}
              maxLength={30}
            />
          </div>

          <div className="input-group">
            <FiMail className="input-icon" />
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-group">
            <FiLock className="input-icon" />
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Пароль (мин. 8 символов, 1 большая, 1 маленькая буква)" 
              value={formData.password}
              onChange={handleChange}
              required
              minLength={8}
            />
            <button 
              type="button" 
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
            >
              {showPassword ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>

          <div className="input-group">
            <FiLock className="input-icon" />
            <input
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              placeholder="Повторите пароль"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              minLength={8} 
            />
            <button 
              type="button" 
              className="password-toggle"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={showConfirmPassword ? "Скрыть пароль" : "Показать пароль"}
            >
              {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>

          <button 
            type="submit" 
            className="submit-button"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner"></span>
                Регистрация...
              </>
            ) : (
              'Зарегистрироваться'
            )}
          </button>
        </form>

        <div className="registration-footer">
          <p>Уже есть аккаунт? <Link to="/login" className="login-link">Войти</Link></p>
          <p className="terms-notice">
            Нажимая "Зарегистрироваться", вы соглашаетесь с нашими 
            <Link to="/terms" className="terms-link"> Условиями использования</Link>
          </p>
        </div>
      </div>
    </div>
  );
}