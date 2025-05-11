import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import './RestaurantCards.css';
import { Link } from 'react-router-dom';

const RestaurantCards = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const RESTAURANTS_PER_PAGE = 3; // Теперь показываем по 3 ресторана

  const isValidImageUrl = (url) => {
    if (!url) return false;
    try {
      new URL(url);
      return url.match(/\.(jpeg|jpg|gif|png|webp)$/) != null;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    const fetchTopRatedRestaurants = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/restaurants', {
          params: {
            limit: 9, // Загружаем 9 ресторанов (3 страницы по 3)
            sort: 'rating',
            order: 'desc'
          }
        });

        if (!response.data) throw new Error('Пустой ответ от сервера');

        const processedData = (Array.isArray(response.data) ? response.data : [])
          .map(item => ({
            id: item.id,
            name: item.name || 'Без названия',
            description: item.description || 'Описание отсутствует',
            image: isValidImageUrl(item.image_url) ? item.image_url :
                  isValidImageUrl(item.photo_url) ? item.photo_url :
                  isValidImageUrl(item.phone_url) ? item.phone_url :
                  'https://via.placeholder.com/300x200?text=No+Image',
            rating: item.rating ? parseFloat(item.rating) : 0,
            address: item.address || 'Адрес не указан',
            type: item.establishment_type || 'тип не указан',
            workingHours: item.working_hours || 'Часы работы не указаны'
          }));

        setRestaurants(processedData);
      } catch (err) {
        setError(`Ошибка: ${err.response?.data?.message || err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchTopRatedRestaurants();
  }, []);

  // Автопрокрутка
  useEffect(() => {
    if (restaurants.length > RESTAURANTS_PER_PAGE) {
      const interval = setInterval(() => {
        setCurrentIndex(prev => 
          (prev + RESTAURANTS_PER_PAGE) >= restaurants.length ? 0 : prev + RESTAURANTS_PER_PAGE
        );
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [restaurants.length]);

  const nextSlide = () => {
    setCurrentIndex(prev => 
      (prev + RESTAURANTS_PER_PAGE) >= restaurants.length ? 0 : prev + RESTAURANTS_PER_PAGE
    );
  };

  const prevSlide = () => {
    setCurrentIndex(prev => 
      prev === 0 ? restaurants.length - (restaurants.length % RESTAURANTS_PER_PAGE || RESTAURANTS_PER_PAGE) : prev - RESTAURANTS_PER_PAGE
    );
  };

  // Получаем 3 ресторана для текущего слайда
  const visibleRestaurants = restaurants.slice(
    currentIndex, 
    Math.min(currentIndex + RESTAURANTS_PER_PAGE, restaurants.length)
  );

  if (loading) return (
    <div className="loading-container">
      <div className="spinner"></div>
      <p>Загружаем список ресторанов...</p>
    </div>
  );

  if (error) return (
    <div className="error-container">
      <h3>Ошибка загрузки</h3>
      <p>{error}</p>
      <button className="retry-button" onClick={() => window.location.reload()}>
        Попробовать снова
      </button>
    </div>
  );

  if (restaurants.length === 0) return (
    <div className="empty-state">
      <img 
        src="/images/no-restaurants.png" 
        alt="Нет ресторанов"
        width={200}
        onError={(e) => e.target.src = 'https://via.placeholder.com/200x200?text=No+Image'}
      />
      <h3>Рестораны не найдены</h3>
      <p>Попробуйте обновить страницу или зайти позже</p>
    </div>
  );

  return (
    
    <section className="restaurant-slider">
      
      <h2 className="slider-title">Популярные заведенияпвпыпвыпывпыввпывпы</h2>
      
      <div className="slider-container">
        <button className="nav-arrow left" onClick={prevSlide}>
          <FaChevronLeft />
        </button>
        
        <div className="restaurants-grid">
          {visibleRestaurants.map(restaurant => (
            <div key={restaurant.id} className="restaurant-card">
              <div className="image-container">
                <img 
                  src={restaurant.image} 
                  alt={restaurant.name}
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/300x200?text=No+Image';
                  }}
                />
                <div className="rating-badge">
                  ★ {restaurant.rating.toFixed(1)}
                </div>
              </div>
              
              <div className="details">
                <h3>{restaurant.name}</h3>
                <p className="type">{restaurant.type}</p>
                <p className="address">{restaurant.address}</p>
                <p className="hours">Часы работы: {restaurant.workingHours}</p>
                <Link to={`/restaurants/${restaurant.id}`} className="more-button">
                  Подробнее →
                </Link>
              </div>
            </div>
          ))}
        </div>
        
        <button className="nav-arrow right" onClick={nextSlide}>
          <FaChevronRight />
        </button>
      </div>

      <div className="pagination-dots">
        {Array.from({ length: Math.ceil(restaurants.length / RESTAURANTS_PER_PAGE) }).map((_, i) => (
          <span 
            key={i}
            className={`dot ${currentIndex === i * RESTAURANTS_PER_PAGE ? 'active' : ''}`}
            onClick={() => setCurrentIndex(i * RESTAURANTS_PER_PAGE)}
          />
        ))}
      </div>
    </section>
  );
};

export default RestaurantCards;