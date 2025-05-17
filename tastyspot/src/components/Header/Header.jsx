import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Header.css';
import { FiUser, FiLogOut, FiSearch, FiSun, FiMoon } from 'react-icons/fi';
import { GiCook } from 'react-icons/gi';

export default function Header() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) setUser(JSON.parse(userData));
    
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
    navigate('/login');
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
              <div className="user-greeting">Привет, {user.username}!</div>
              <div className="user-avatar">
                <FiUser />
              </div>
              <button className="logout-button" onClick={handleLogout}>
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