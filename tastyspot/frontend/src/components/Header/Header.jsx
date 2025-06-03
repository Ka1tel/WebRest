// Header.js
import React, { useEffect, useState, useRef } from 'react'; // Добавил useRef
import { useNavigate, Link } from 'react-router-dom';
import './Header.css';
import { FiUser, FiLogOut, FiSearch, FiSun, FiMoon, FiMessageSquare, FiMenu, FiX } from 'react-icons/fi'; // Добавил FiMenu, FiX
import { GiCook } from 'react-icons/gi';

export default function Header() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  // const [searchQuery, setSearchQuery] = useState(''); // Закомментировал, т.к. не используется в предоставленном JSX
  const [theme, setTheme] = useState('light');
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Состояние для мобильного меню
  const mobileMenuRef = useRef(null); // Ref для мобильного меню
  const burgerButtonRef = useRef(null); // Ref для кнопки бургера

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const decoded = JSON.parse(atob(token.split('.')[1]));
          setIsAdmin(decoded.is_admin || false);
        } catch (e) {
          console.error('Ошибка декодирования токена:', e);
        }
      }
      if (parsedUser.avatarUrl) {
        setAvatarUrl(parsedUser.avatarUrl);
      }
    }
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  // Эффект для закрытия меню по клику вне его
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target) &&
        burgerButtonRef.current && // Проверяем что кнопка бургера существует
        !burgerButtonRef.current.contains(event.target) // И клик был не по кнопке бургера
      ) {
        setIsMobileMenuOpen(false);
      }
    }
    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen]);


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
    setIsMobileMenuOpen(false); // Закрываем меню при логауте
    navigate('/login');
  };

  const handleProfileClick = () => {
    setIsMobileMenuOpen(false); // Закрываем меню при переходе
    navigate('/profile');
  };

  const handleAdminReviewsClick = () => {
    setIsMobileMenuOpen(false); // Закрываем меню при переходе
    navigate('/admin/reviews');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleNavLinkClick = () => {
    setIsMobileMenuOpen(false); // Закрываем мобильное меню при клике на ссылку
  };

  return (
    <header>
      <div className='header-container'>
        <Link to="/" className='logo-link'>
          <GiCook className="logo-icon" />
          <span className="logo-text">TastySpot</span>
        </Link>
        
        {/* Основная навигация для десктопа */}
        <nav className="main-nav desktop-nav"> {/* Добавил класс desktop-nav */}
          <Link to="/" className="nav-item" onClick={handleNavLinkClick}>Главная</Link>
          <Link to="/restaurants" className="nav-item" onClick={handleNavLinkClick}>Заведения</Link>
          <Link to="/dishes" className="nav-item" onClick={handleNavLinkClick}>Блюда</Link>
          <Link to="/about" className="nav-item" onClick={handleNavLinkClick}>О нас</Link>
        </nav>

        <div className="header-actions">
          <button className="theme-toggle" onClick={toggleTheme} title={theme === 'light' ? "Темная тема" : "Светлая тема"}>
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
              <div className="user-info" onClick={handleProfileClick} title={`Профиль: ${user.username}`}>
                <span className="user-greeting">
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

          {/* Кнопка бургер-меню для мобильных */}
          <button 
            ref={burgerButtonRef} 
            className="burger-menu-button" 
            onClick={toggleMobileMenu} 
            aria-expanded={isMobileMenuOpen}
            aria-label="Открыть меню"
          >
            {isMobileMenuOpen ? <FiX /> : <FiMenu />}
          </button>
        </div>
      </div>

      {/* Мобильное меню */}
      {isMobileMenuOpen && (
        <nav ref={mobileMenuRef} className="main-nav mobile-nav">
          <Link to="/" className="nav-item" onClick={handleNavLinkClick}>Главная</Link>
          <Link to="/restaurants" className="nav-item" onClick={handleNavLinkClick}>Заведения</Link>
          <Link to="/dishes" className="nav-item" onClick={handleNavLinkClick}>Блюда</Link>
          <Link to="/about" className="nav-item" onClick={handleNavLinkClick}>О нас</Link>
          {/* Можно добавить сюда другие важные ссылки или действия для мобильных */}
        </nav>
      )}
    </header>
  );
}