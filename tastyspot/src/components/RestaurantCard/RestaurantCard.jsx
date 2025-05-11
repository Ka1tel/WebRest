import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FiStar, FiMapPin, FiClock } from 'react-icons/fi';
import './RestaurantCard.css';

const RestaurantCard = ({ restaurant }) => {
  const photos = restaurant.photo_url 
    ? restaurant.photo_url.split(',').map(photo => photo.trim()).filter(photo => photo)
    : [];
  
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const intervalRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  const startSlideshow = () => {
    if (photos.length <= 1) return;
    
    intervalRef.current = setInterval(() => {
      setCurrentPhotoIndex(prev => (prev + 1) % photos.length);
    }, 2000);
  };

  const stopSlideshow = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    if (isHovered) {
      startSlideshow();
    } else {
      stopSlideshow();
      setCurrentPhotoIndex(0); // Сбрасываем к первому изображению
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
          <div className="photo-counter">
            {currentPhotoIndex + 1}/{photos.length}
          </div>
        )}

        <div className="image-overlay">
          <h3 className="restaurant-title">{restaurant.name}</h3>
        </div>
        
        <span className="rating-badge">
          <FiStar className="rating-icon" /> 
          {formatRating(restaurant.rating)}
        </span>
      </div>

      <div className="card-content">
        <div className="details">
          <p className="type">
            <span className="type-icon">
              {getEstablishmentIcon(restaurant.establishment_type)}
            </span>
            {restaurant.establishment_type}
          </p>
          <p className="address">
            <FiMapPin className="address-icon" /> 
            {restaurant.address}
          </p>
          {restaurant.working_hours && (
            <p className="hours">
              <FiClock className="hours-icon" /> 
              {restaurant.working_hours}
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
    'кофейня': '🥐',
    'пиццерия': '🍕',
    'столовая': '🍲'
  };
  return types[type?.toLowerCase()] || '🏠';
};

export default RestaurantCard;