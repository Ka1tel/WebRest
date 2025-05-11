import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Header.css';
import { BiSearch } from 'react-icons/bi';
import { FiUser, FiLogOut } from 'react-icons/fi';

export default function Header() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Проверяем наличие данных пользователя при загрузке компонента
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleSearchClick = () => {
    const input = document.querySelector('.inputtext');
    if (input.value.trim() === '') {
      alert('Пожалуйста, введите поисковый запрос');
    } else {
      alert(`Ищем: ${input.value}`);
      // Здесь можно добавить логику поиска
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  return (
    <header>
      <div className='header'>
        <Link to="/" className='LogoText'>TastySpot</Link>
        
        <nav className="nav-links">
          <Link to="/" className="nav-link">Главная</Link>
          <Link to="/restaurants" className="nav-link">Заведения</Link>
          <Link to="/reviews" className="nav-link">Отзывы</Link>
          <Link to="/dishes" className="nav-link">Блюда</Link>
          <Link to="/about" className="nav-link">О нас</Link>
        </nav>
        
        <div className="search-container">
          
          
          {user ? (
            <div className="user-profile">
              <div className="avatar-container">
                <FiUser className="user-avatar" />
              </div>
              <span className="username">{user.username}</span>
              <button className="logout-btn" onClick={handleLogout} title="Выйти">
                <FiLogOut />
              </button>
            </div>
          ) : (
            <button className='SignUp' onClick={() => navigate('/login')}>
              Войти
            </button>
          )}
        </div>
      </div>        
    </header>
  );
}