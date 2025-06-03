import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Hero.css';
import { GiChefToque, GiMeal, GiHotSpices } from 'react-icons/gi';

export default function MainPage() {
  const navigate = useNavigate();

  return (
    <section className="hero-section">
      <div className="hero-container">
        <div className="hero-content">
          <div className="title-wrapper">
            <h1 className="hero-title">
              <GiChefToque className="title-icon" />
              <span>Гастрономические</span>
              <span className="highlight">Открытия</span>
            </h1>
            <div className="hero-subtitle">
              <p>для истинных ценителей кулинарного искусства</p>
              <GiHotSpices className="spice-icon" />
            </div>
          </div>
          
          <p className="hero-description">
            Мы исследуем лучшие рестораны Беларуси, чтобы вы могли наслаждаться
            идеальными гастрономическими впечатлениями
          </p>

          <div className="cta-buttons">
            <button 
              className="primary-btn"
              onClick={() => navigate('/restaurants')}
            >
              <GiMeal className="btn-icon" />
              Исследовать заведения
            </button>
            <button 
              className="secondary-btn"
              onClick={() => navigate('/dishes')}
            >
              Открыть меню
            </button>
          </div>

          <div className="stats-container">
            <div className="stat-item">
              <span className="stat-number">150+</span>
              <span className="stat-label">Ресторанов</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">500+</span>
              <span className="stat-label">Отзывов</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">24/7</span>
              <span className="stat-label">Обновления</span>
            </div>
          </div>
        </div>

        <div className="hero-image">
          <img 
            src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80" 
            alt="Ресторан премиум-класса" 
            className="main-image"
          />
          <div className="image-overlay"></div>
        </div>
      </div>
    </section>
  );
}