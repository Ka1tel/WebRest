import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Header.css';
import { FiUser, FiLogOut, FiSearch, FiSun, FiMoon, FiMessageSquare } from 'react-icons/fi';
import { GiCook } from 'react-icons/gi';

export default function Header() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState('light');
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      
      // Проверяем, является ли пользователь администратором
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const decoded = JSON.parse(atob(token.split('.')[1]));
          setIsAdmin(decoded.is_admin || false);
        } catch (e) {
          console.error('Ошибка декодирования токена:', e);
        }
      }
      
      // Загружаем аватар, если он есть
      if (parsedUser.avatarUrl) {
        setAvatarUrl(parsedUser.avatarUrl);
      }
    }
    
    // Проверяем сохранённую тему
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAdmin(false);
    navigate('/login');
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const handleAdminReviewsClick = () => {
    navigate('/admin/reviews');
  };

  return (
    <header>
      <div className='header-container'>
        <Link to="/" className='logo-link'>
          <GiCook className="logo-icon" />
          <span className="logo-text">TastySpot</span>
        </Link>
        
        <nav className="main-nav">
          <Link to="/" className="nav-item">Главная</Link>
          <Link to="/restaurants" className="nav-item">Заведения</Link>
          <Link to="/dishes" className="nav-item">Блюда</Link>
          <Link to="/about" className="nav-item">О нас</Link>
        </nav>

        <div className="header-actions">
          <button className="theme-toggle" onClick={toggleTheme}>
            {theme === 'light' ? <FiMoon /> : <FiSun />}
          </button>

          {user ? (
            <div className="user-menu">
              {isAdmin && (
                <button 
                  className="admin-reviews-button"
                  onClick={handleAdminReviewsClick}
                  title="Управление отзывами"
                >
                  <FiMessageSquare />
                  <span className="admin-reviews-text">Отзывы</span>
                </button>
              )}
              <div className="user-info" onClick={handleProfileClick}>
  <span className="user-greeting" title={`Привет, ${user.username}!`}>
    Привет, {user.username}!
  </span>
  <div className="user-avatar">
    {avatarUrl ? (
      <img src={avatarUrl} alt="Аватар" className="avatar-image" />
    ) : (
      <FiUser className="avatar-icon" />
    )}
  </div>
</div>
              <button className="logout-button" onClick={handleLogout} title="Выйти">
                <FiLogOut />
              </button>
            </div>
          ) : (
            <button className='login-button' onClick={() => navigate('/login')}>
              Войти
            </button>
          )}
        </div>
      </div>
    </header>
  );
}