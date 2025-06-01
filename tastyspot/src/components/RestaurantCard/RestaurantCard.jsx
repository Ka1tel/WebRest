// src/components/RestaurantCard/RestaurantCard.js
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  FiStar, FiMapPin, FiClock, FiChevronLeft, FiChevronRight,
  FiDollarSign, FiCoffee, FiTrash2 // Оставляем только FiTrash2 из админских
} from 'react-icons/fi';
import './RestaurantCard.css';

const RestaurantCard = ({ restaurant, isAdmin, onDelete }) => {
  const {
    id, name, photo_url, cuisine_type, rating, address,
    establishment_type, working_hours, price_range,
    distance, distanceFrom
  } = restaurant;

  const photos = photo_url
    ? photo_url.split(',').map(photo => photo.trim()).filter(photo => photo)
    : [];

  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const intervalRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef(null);

  const renderPriceRange = () => {
    switch (price_range) {
      case 'эконом': return '$ (эконом)';
      case 'средний': return '$$ (средний)';
      case 'премиум': return '$$$ (премиум)';
      default: return 'Не указан';
    }
  };

  const startSlideshow = () => {
    if (photos.length <= 1 || !isHovered) return;
    stopSlideshow();
    intervalRef.current = setInterval(() => {
      setCurrentPhotoIndex(prev => (prev + 1) % photos.length);
    }, 3000);
  };

  const stopSlideshow = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const goToNextPhoto = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentPhotoIndex(prev => (prev + 1) % photos.length);
    resetSlideshowTimer();
  };

  const goToPrevPhoto = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentPhotoIndex(prev => (prev - 1 + photos.length) % photos.length);
    resetSlideshowTimer();
  };

  const resetSlideshowTimer = () => {
    stopSlideshow();
    if (isHovered && photos.length > 1) {
        startSlideshow();
    }
  };

  useEffect(() => {
    if (isHovered && photos.length > 1) {
      startSlideshow();
    } else {
      stopSlideshow();
    }
    return stopSlideshow;
  }, [isHovered, photos.length]);

  const handleImageError = (e) => {
    e.target.onerror = null;
    e.target.src = '/placeholder-restaurant.jpg';
  };

  const formatRating = (val) => {
    const num = parseFloat(val);
    if (isNaN(num) || num === 0) return 'Новый';
    return num.toFixed(1);
  };

  const showDistanceFromUser = distanceFrom === "Мое местоположение" && typeof distance === 'number' && distance !== null;

  const handleDeleteClick = (e) => {
    e.preventDefault(); // Предотвращаем стандартное действие (если кнопка внутри ссылки)
    e.stopPropagation(); // Останавливаем всплытие события к родительским элементам
    if (onDelete) { // ПРОВЕРЯЕМ, ЧТО onDelete СУЩЕСТВУЕТ
      onDelete(id, name); // ВЫЗЫВАЕМ onDelete С ПРАВИЛЬНЫМИ АРГУМЕНТАМИ
    } else {
      // Это может помочь в отладке, если onDelete не передается
      console.warn("RestaurantCard: onDelete prop is not defined!");
    }
  };

  return (
    <div
      className="restaurant-card-wrapper"
      data-is-admin={isAdmin} // Оставляем, если влияет на другие стили (например, rating-badge)
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      ref={cardRef}
    >
      {isAdmin && (
        <div className="restaurant-card-admin-actions">
          {/* Убрали кнопку редактирования */}
          <button
            type="button"
            className="restaurant-card-admin-button delete" // Можно убрать класс .delete, если он не нужен для специфичных стилей
            title="Удалить заведение"
            aria-label={`Удалить ${name}`}
            onClick={handleDeleteClick}
          >
            <FiTrash2 />
          </button>
        </div>
      )}

      <Link
        to={`/restaurants/${id}`}
        className="restaurant-card"
      >
        {/* ... остальной JSX карточки остается без изменений ... */}
        <div className="card-image-container">
          {photos.length > 0 ? (
            <img
              src={photos[currentPhotoIndex]}
              alt={restaurant.name}
              onError={handleImageError}
              className={`card-image ${photos.length > 1 ? 'slideshow-active' : ''}`}
              loading="lazy"
            />
          ) : (
            <img
              src="/placeholder-restaurant.jpg"
              alt={restaurant.name}
              className="card-image"
            />
          )}

          {showDistanceFromUser && (
            <div className="restaurant-card-distance-overlay">
              <FiMapPin size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              {distance.toFixed(1)} км
            </div>
          )}

          {photos.length > 1 && (
            <>
              <div className="photo-counter">
                {currentPhotoIndex + 1}/{photos.length}
              </div>
              <button
                className="nav-button prev-button"
                onClick={goToPrevPhoto}
                aria-label="Previous photo"
              >
                <FiChevronLeft />
              </button>
              <button
                className="nav-button next-button"
                onClick={goToNextPhoto}
                aria-label="Next photo"
              >
                <FiChevronRight />
              </button>
            </>
          )}

          <div className="image-overlay">
            <h3 className="restaurant-title">{name}</h3>
            <div className="restaurant-type">
              <span className="type-icon" role="img" aria-label={establishment_type}>
                {getEstablishmentIcon(establishment_type)}
              </span>
              {establishment_type || 'Заведение'}
            </div>
          </div>

          <span className="rating-badge">
            <FiStar className="rating-icon" />
            {formatRating(rating)}
          </span>
        </div>

        <div className="card-content">
          <div className="details">
            <p className="address">
             
              {address || 'Адрес не указан'}
            </p>

            {working_hours && (
              <p className="hours">
                
                {working_hours}
              </p>
            )}

            {cuisine_type && (
              <p className="cuisine">
                <FiCoffee className="detail-icon" />
                {cuisine_type}
              </p>
            )}

            {price_range && (
              <p className="price-range">
                <FiDollarSign className="detail-icon" />
                {renderPriceRange()}
              </p>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
};

const getEstablishmentIcon = (type) => {
  const typeLower = type?.toLowerCase();
  const types = {
    'ресторан': '🍽️', 'кафе': '☕', 'бар': '🍸', 'фастфуд': '🍔',
    'кофейня': '🥐', 'пиццерия': '🍕', 'столовая': '🍲', 'суши-бар': '🍣'
  };
  return types[typeLower] || '🏠';
};

export default RestaurantCard;