import React from 'react';
import './AboutPage.css';
import { FiSearch, FiHeart, FiCheckCircle } from 'react-icons/fi';

const AboutPage = () => {
  return (
    <div className="about-container">
      {/* Hero-секция */}
      <div className="about-hero">
        <div className="hero-content">
          <h1>TestySpot</h1>
          <p>Ваш гид в мире гастрономии</p>
        </div>
      </div>

      {/* Основной контент */}
      <div className="about-content">
        <section className="about-mission">
          <h2>Наша цель</h2>
          <div className="mission-text">
            <p>
              Мы создаем пространство, где каждый может найти идеальное место 
              для любого случая - от романтического ужина до бизнес-ланча.
            </p>
            <p>
              Наша платформа объединяет лучшие заведения города с теми, 
              кто ценит качество и атмосферу.
            </p>
          </div>
        </section>

        <section className="about-features">
          <h2>Наши преимущества</h2>
          <div className="features-grid">
            <div className="feature-card">
              <FiSearch className="feature-icon" />
              <h3>Умный поиск</h3>
              <p>Фильтруйте по кухне, рейтингу, цене и местоположению</p>
            </div>
            <div className="feature-card">
              <FiHeart className="feature-icon" />
              <h3>Избранное</h3>
              <p>Сохраняйте понравившиеся места в персональную коллекцию</p>
            </div>
            <div className="feature-card">
              <FiCheckCircle className="feature-icon" />
              <h3>Проверенные отзывы</h3>
              <p>Только реальные впечатления от посетителей</p>
            </div>
          </div>
        </section>

        <section className="about-stats">
          <div className="stat-item">
            <span className="stat-number">5,000+</span>
            <span className="stat-label">Заведений</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">1M+</span>
            <span className="stat-label">Пользователей</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">100K+</span>
            <span className="stat-label">Отзывов</span>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AboutPage;