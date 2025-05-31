// src/components/RestaurantCard/RestaurantCard.js
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FiStar, FiMapPin, FiClock, FiChevronLeft, FiChevronRight, FiDollarSign, FiCoffee } from 'react-icons/fi';
import './RestaurantCard.css'; // Make sure your CSS supports the new overlay

const RestaurantCard = ({ restaurant }) => {
  // Destructure props, including distance and distanceFrom
  const {
    id,
    name,
    photo_url,
    cuisine_type,
    rating,
    address,
    // isOpen, // Not directly used from props here, assumed handled by parent or derived
    establishment_type,
    working_hours,
    price_range,
    distance,       // NEW: Expected from RestaurantsPage
    distanceFrom    // NEW: Expected from RestaurantsPage ("Мое местоположение" or city name)
  } = restaurant;

  const photos = photo_url 
    ? photo_url.split(',').map(photo => photo.trim()).filter(photo => photo)
    : [];
  
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const intervalRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef(null);

  const renderPriceRange = () => {
    switch(price_range) {
      case 'эконом': return '$ (эконом)';
      case 'средний': return '$$ (средний)';
      case 'премиум': return '$$$ (премиум)';
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
    if (isHovered && photos.length > 1) startSlideshow(); // only restart if slideshow is active
  };

  useEffect(() => {
    if (isHovered && photos.length > 1) {
      startSlideshow();
    } else {
      stopSlideshow();
      // setCurrentPhotoIndex(0); // Optionally reset to first photo on mouse leave
    }

    return stopSlideshow;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHovered, photos.length]); // photos.length is important here

  const handleImageError = (e) => {
    e.target.onerror = null; // Prevent infinite loop if placeholder also fails
    e.target.src = '/placeholder-restaurant.jpg'; // Ensure you have this in your public folder
  };

  const formatRating = (val) => {
    const num = parseFloat(val);
    if (isNaN(num) || num === 0) return 'Новый'; // Or some other indicator for no rating
    return num.toFixed(1);
  };

  // Condition to show distance from user
  const showDistanceFromUser = distanceFrom === "Мое местоположение" && typeof distance === 'number' && distance !== null;

  return (
    <Link 
      to={`/restaurants/${id}`} 
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
            loading="lazy"
          />
        ) : (
          <img 
            src="/placeholder-restaurant.jpg" 
            alt={restaurant.name}
            className="card-image"
          />
        )}

        {/* Distance Overlay - Display if applicable */}
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
              onClick={(e) => {
                e.preventDefault(); // Prevent link navigation
                goToPrevPhoto();
              }}
              aria-label="Previous photo"
            >
              <FiChevronLeft />
            </button>
            <button 
              className="nav-button next-button"
              onClick={(e) => {
                e.preventDefault(); // Prevent link navigation
                goToNextPhoto();
              }}
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
            <FiMapPin className="detail-icon" />
            {address || 'Адрес не указан'}
          </p>
          
          {working_hours && (
            <p className="hours">
              <FiClock className="detail-icon" />
              {working_hours}
            </p>
          )}
          
          {cuisine_type && (
            <p className="cuisine">
              <FiCoffee className="detail-icon" /> {/* FiCoffee might be for cafe, general food icon might be better */}
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
  );
};

const getEstablishmentIcon = (type) => {
  const typeLower = type?.toLowerCase();
  const types = {
    'ресторан': '🍽️',
    'кафе': '☕',
    'бар': '🍸',
    'фастфуд': '🍔',
    'кофейня': '🥐', // More specific for coffee shop
    'пиццерия': '🍕',
    'столовая': '🍲',
    'суши-бар': '🍣'
  };
  return types[typeLower] || '🏠'; // Default icon
};

export default RestaurantCard;