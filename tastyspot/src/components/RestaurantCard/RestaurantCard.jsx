import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FiStar, FiMapPin, FiClock, FiChevronLeft, FiChevronRight, FiDollarSign, FiCoffee } from 'react-icons/fi';
import './RestaurantCard.css';

const RestaurantCard = ({ restaurant }) => {
  const photos = restaurant.photo_url 
    ? restaurant.photo_url.split(',').map(photo => photo.trim()).filter(photo => photo)
    : [];
  
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const intervalRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef(null);

  const renderPriceRange = () => {
    switch(restaurant.price_range) {
      case 'low': return '₸ (эконом)';
      case 'medium': return '₸₸ (средний)';
      case 'high': return '₸₸₸ (премиум)';
      default: return 'Ценовой диапазон не указан';
    }
  };

  const startSlideshow = () => {
    if (photos.length <= 1) return;
    
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

  const goToNextPhoto = () => {
    setCurrentPhotoIndex(prev => (prev + 1) % photos.length);
    resetSlideshowTimer();
  };

  const goToPrevPhoto = () => {
    setCurrentPhotoIndex(prev => (prev - 1 + photos.length) % photos.length);
    resetSlideshowTimer();
  };

  const resetSlideshowTimer = () => {
    stopSlideshow();
    if (isHovered) startSlideshow();
  };

  useEffect(() => {
    if (isHovered) {
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

  const formatRating = (rating) => {
    if (rating === null || isNaN(rating)) return 'Новый';
    return Number(rating).toFixed(1);
  };

  return (
    <Link 
      to={`/restaurants/${restaurant.id}`} 
      className="restaurant-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      ref={cardRef}
    >
      <div className="card-image-container">
        {photos.length > 0 ? (
          <img
            src={photos[currentPhotoIndex]} 
            alt={restaurant.name}
            onError={handleImageError}
            className={`card-image ${photos.length > 1 ? 'slideshow-active' : ''}`}
          />
        ) : (
          <img 
            src="/placeholder-restaurant.jpg" 
            alt={restaurant.name}
            className="card-image"
          />
        )}

        {photos.length > 1 && (
          <>
            <div className="photo-counter">
              {currentPhotoIndex + 1}/{photos.length}
            </div>
            <button 
              className="nav-button prev-button"
              onClick={(e) => {
                e.preventDefault();
                goToPrevPhoto();
              }}
              aria-label="Previous photo"
            >
              <FiChevronLeft />
            </button>
            <button 
              className="nav-button next-button"
              onClick={(e) => {
                e.preventDefault();
                goToNextPhoto();
              }}
              aria-label="Next photo"
            >
              <FiChevronRight />
            </button>
          </>
        )}

        <div className="image-overlay">
          <h3 className="restaurant-title">{restaurant.name}</h3>
          <div className="restaurant-type">
            <span className="type-icon">
              {getEstablishmentIcon(restaurant.establishment_type)}
            </span>
            {restaurant.establishment_type}
          </div>
        </div>
        
        <span className="rating-badge">
          <FiStar className="rating-icon" /> 
          {formatRating(restaurant.rating)}
        </span>
      </div>

      <div className="card-content">
        <div className="details">
          <p className="address">
            <FiMapPin className="detail-icon" />
            {restaurant.address}
          </p>
          
          {restaurant.working_hours && (
            <p className="hours">
              <FiClock className="detail-icon" />
              {restaurant.working_hours}
            </p>
          )}
          
          {restaurant.cuisine_type && (
            <p className="cuisine">
              <FiCoffee className="detail-icon" />
              {restaurant.cuisine_type}
            </p>
          )}
          
          {restaurant.price_range && (
            <p className="price-range">
              <FiDollarSign className="detail-icon" />
              {renderPriceRange()}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
};

const getEstablishmentIcon = (type) => {
  const types = {
    'ресторан': '🍽️',
    'кафе': '☕',
    'бар': '🍸',
    'фастфуд': '🍔',
    'кофейня': '🧋',
    'пиццерия': '🍕',
    'столовая': '🍲',
    'суши-бар': '🍣'
  };
  return types[type?.toLowerCase()] || '🏠';
};

export default RestaurantCard;