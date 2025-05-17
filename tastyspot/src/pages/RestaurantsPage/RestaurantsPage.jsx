import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaSearch, FaClock, FaStar, FaUtensils } from 'react-icons/fa';
import RestaurantCard from '../../components/RestaurantCard/RestaurantCard';
import './RestaurantsPage.css';

const RestaurantsPage = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState(0);
  const [openNowFilter, setOpenNowFilter] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/restaurants');
        const processedRestaurants = response.data.map(restaurant => ({
          ...restaurant,
          mainPhoto: restaurant.photo_url?.split(',')[0].trim() || null,
          rating: parseFloat(restaurant.rating) || 0,
          isOpen: checkIfOpen(restaurant.working_hours, currentTime)
        }));
        setRestaurants(processedRestaurants);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const checkIfOpen = (workingHours, time) => {
    if (!workingHours) return false;
    
    try {
      const [openTimeStr, closeTimeStr] = workingHours.split('-').map(s => s.trim());
      const [openHours, openMinutes] = openTimeStr.split(':').map(Number);
      const [closeHours, closeMinutes] = closeTimeStr.split(':').map(Number);
      
      const openTime = new Date();
      openTime.setHours(openHours, openMinutes, 0, 0);
      
      const closeTime = new Date();
      closeTime.setHours(closeHours, closeMinutes, 0, 0);
      
      if (closeTime < openTime) {
        closeTime.setDate(closeTime.getDate() + 1);
      }
      
      return time >= openTime && time <= closeTime;
    } catch (e) {
      console.error('Error parsing working hours:', e);
      return false;
    }
  };

  useEffect(() => {
    if (restaurants.length > 0) {
      setRestaurants(prevRestaurants => 
        prevRestaurants.map(restaurant => ({
          ...restaurant,
          isOpen: checkIfOpen(restaurant.working_hours, currentTime)
        })));
    }
  }, [currentTime]);

  const filteredRestaurants = restaurants.filter(restaurant => {
    const matchesSearch = restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         restaurant.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || restaurant.establishment_type === typeFilter;
    const matchesRating = restaurant.rating >= ratingFilter;
    const matchesOpenNow = !openNowFilter || restaurant.isOpen;
    
    return matchesSearch && matchesType && matchesRating && matchesOpenNow;
  });

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay message={error} />;

  return (
    <div className="restaurants-page">
      <div className="restaurants-hero">
        <div className="hero-content">
          <h1>Откройте для себя лучшие заведения</h1>
          <p>Найдите идеальное место для любого случая</p>
        </div>
      </div>

      <div className="restaurants-container">
        <div className="search-section">
          <div className="search-bar-container">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Поиск по названию или адресу..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        <div className="filters-row">
          <div className="filter-pill">
            <FaUtensils className="filter-icon" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="type-select"
            >
              <option value="all">Все типы</option>
              <option value="ресторан">Рестораны</option>
              <option value="кафе">Кафе</option>
              <option value="бар">Бары</option>
              <option value="фастфуд">Фастфуд</option>
            </select>
          </div>

          <div className="filter-pill">
            <FaStar className="filter-icon" />
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(Number(e.target.value))}
              className="rating-select"
            >
              <option value="0">Любой рейтинг</option>
              <option value="3">3+ ★</option>
              <option value="4">4+ ★</option>
              <option value="5">5 ★</option>
            </select>
          </div>

          <button
            className={`filter-pill ${openNowFilter ? 'active' : ''}`}
            onClick={() => setOpenNowFilter(!openNowFilter)}
          >
            <FaClock className="filter-icon" />
            <span>Открыто сейчас</span>
          </button>
        </div>

        <RestaurantsList restaurants={filteredRestaurants} openNowFilter={openNowFilter} />
      </div>
    </div>
  );
};

const LoadingSpinner = () => (
  <div className="loading-spinner">
    <div className="spinner"></div>
    <p>Загрузка ресторанов...</p>
  </div>
);

const ErrorDisplay = ({ message }) => (
  <div className="error-message">
    <p>Ошибка загрузки: {message}</p>
    <button onClick={() => window.location.reload()}>Попробовать снова</button>
  </div>
);

const RestaurantsList = ({ restaurants, openNowFilter }) => {
  if (restaurants.length === 0) {
    return (
      <div className="no-results">
        <div className="no-results-icon">🍽️</div>
        <h3>Ничего не найдено</h3>
        <p>{openNowFilter ? 'Попробуйте отключить фильтр "Открыто сейчас" или изменить другие параметры поиска' : 'Попробуйте изменить параметры поиска'}</p>
      </div>
    );
  }

  return (
    <div className="restaurants-grid">
      {restaurants.map(restaurant => (
        <RestaurantCard 
          key={restaurant.id} 
          restaurant={{
            ...restaurant,
            photo_url: restaurant.mainPhoto,
            isOpen: restaurant.isOpen
          }} 
        />
      ))}
    </div>
  );
};

export default RestaurantsPage;