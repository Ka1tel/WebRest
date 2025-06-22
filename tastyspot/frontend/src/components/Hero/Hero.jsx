import React, { useState, useEffect } from 'react'; 
import { useNavigate } from 'react-router-dom';
import './Hero.css';
import { GiChefToque, GiMeal, GiHotSpices } from 'react-icons/gi';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'; 

export default function MainPage() {
  const navigate = useNavigate();

  
  const [stats, setStats] = useState({ restaurantCount: 0, reviewCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

 
  useEffect(() => {
   
    const fetchStats = async () => {
      try {
        
        const response = await fetch(`${API_BASE_URL}/api/stats`);
        
        if (!response.ok) {
         
          throw new Error(`Ошибка сети: ${response.status}`);
        }

        const data = await response.json();
        
       
        setStats(data);
      } catch (err) {
        
        setError(err.message);
        console.error("Ошибка при загрузке статистики:", err);
      } finally {
      
        setLoading(false);
      }
    };

    fetchStats(); 
  }, []); 
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
            {error ? (
              <div className="stat-item" style={{ color: 'red', width: '100%' }}>
                Ошибка загрузки данных
              </div>
            ) : (
              <>
                <div className="stat-item">
                  <span className="stat-number">
                   
                    {loading ? '...' : `${stats.restaurantCount}+`}
                  </span>
                  <span className="stat-label">Ресторанов</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">
                    {loading ? '...' : `${stats.reviewCount}+`}
                  </span>
                  <span className="stat-label">Отзывов</span>
                </div>
              </>
            )}
            <div className="stat-item">
              <span className="stat-number">24/7</span>
              <span className="stat-label">Обновление контента</span>
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