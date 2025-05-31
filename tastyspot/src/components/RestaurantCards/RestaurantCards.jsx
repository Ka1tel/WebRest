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
  const RESTAURANTS_PER_PAGE = 3;
  const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/300x200?text=No+Image';

  // Улучшенная проверка URL изображения
  const isValidImageUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return false;
    
    try {
      // Проверяем, что URL абсолютный и имеет правильный формат
      const urlObj = new URL(trimmedUrl);
      if (!['http:', 'https:'].includes(urlObj.protocol)) return false;
      
      // Проверяем расширение файла (необязательно, но полезно)
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      const hasValidExtension = imageExtensions.some(ext => 
        trimmedUrl.toLowerCase().includes(ext)
      );
      
      return hasValidExtension;
    } catch {
      return false;
    }
  };

  // Получаем первую рабочую фотографию из строки с несколькими URL
  const getFirstValidImage = (urlString) => {
    if (!urlString || typeof urlString !== 'string') return PLACEHOLDER_IMAGE;
    
    // Разделяем URL по запятым и фильтруем пустые
    const urls = urlString.split(',')
      .map(url => url.trim())
      .filter(url => url.length > 0);
    
    // Находим первый валидный URL
    const validUrl = urls.find(url => isValidImageUrl(url));
    
    return validUrl || PLACEHOLDER_IMAGE;
  };

  useEffect(() => {
    const fetchTopRatedRestaurants = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/restaurants', {
          params: {
            limit: 9,
            sort: 'rating',
            order: 'desc'
          }
        });
        // console.log('Raw API response data:', response.data); // Оставляем для отладки при необходимости

        if (!response.data) throw new Error('Пустой ответ от сервера');

        const processedData = (Array.isArray(response.data) ? response.data : [])
          .map(item => {
            const imageFields = [
              item.image_url,
              item.photo_url,
              item.phone_url, // phone_url - вероятно, опечатка, но оставляем на всякий случай
              item.image,
              item.photo
            ].filter(Boolean); 
            
            // console.log('Processing item:', item); // Оставляем для отладки при необходимости
            let finalImageUrl = PLACEHOLDER_IMAGE;
            for (const field of imageFields) {
              const url = getFirstValidImage(field);
              if (url !== PLACEHOLDER_IMAGE) {
                finalImageUrl = url;
                break;
              }
            }

            return {
              id: item.id,
              name: item.name || 'Без названия',
              description: item.description || 'Описание отсутствует',
              image: finalImageUrl,
              rating: item.rating ? parseFloat(item.rating) : 0, // Здесь рейтинг становится 0, если не указан
              address: item.address || 'Адрес не указан',
              type: item.establishment_type || 'тип не указан',
              workingHours: item.working_hours || 'Часы работы не указаны'
            };
          });

        setRestaurants(processedData);
      } catch (err) {
        setError(`Ошибка: ${err.response?.data?.message || err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchTopRatedRestaurants();
  }, []);

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

  const visibleRestaurants = restaurants.slice(
    currentIndex, 
    Math.min(currentIndex + RESTAURANTS_PER_PAGE, restaurants.length)
  );

  const handleImageError = (e) => {
    e.target.src = PLACEHOLDER_IMAGE;
    e.target.onerror = null; 
  };

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
        onError={handleImageError} // Добавил обработчик и для этой картинки
      />
      <h3>Рестораны не найдены</h3>
      <p>Попробуйте обновить страницу или зайти позже</p>
    </div>
  );

  return (
    <section className="restaurant-slider">
      <h2 className="slider-title">Популярные заведения</h2>
      
      <div className="slider-container">
        <button className="nav-arrow left" onClick={prevSlide} disabled={restaurants.length <= RESTAURANTS_PER_PAGE}>
          <FaChevronLeft />
        </button>
        
        <div className="restaurants-grid">
          {visibleRestaurants.map(restaurant => (
            <div key={restaurant.id} className="restaurant-card">
              <div className="image-container">
                <img 
                  src={restaurant.image} 
                  alt={restaurant.name}
                  onError={handleImageError}
                />
                <div className="rating-badge">
                  {/* ИЗМЕНЕНИЕ ЗДЕСЬ */}
                  ★ {restaurant.rating === 0 ? 'Новый' : restaurant.rating.toFixed(1)}
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
        
        <button className="nav-arrow right" onClick={nextSlide} disabled={restaurants.length <= RESTAURANTS_PER_PAGE}>
          <FaChevronRight />
        </button>
      </div>

      {restaurants.length > RESTAURANTS_PER_PAGE && (
        <div className="pagination-dots">
          {Array.from({ length: Math.ceil(restaurants.length / RESTAURANTS_PER_PAGE) }).map((_, i) => (
            <span 
              key={i}
              className={`dot ${currentIndex === i * RESTAURANTS_PER_PAGE ? 'active' : ''}`}
              onClick={() => setCurrentIndex(i * RESTAURANTS_PER_PAGE)}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default RestaurantCards;