import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { FaSearch, FaClock, FaStar, FaUtensils, FaMapMarkerAlt, FaExclamationTriangle, FaCity } from 'react-icons/fa';
import RestaurantCard from '../../components/RestaurantCard/RestaurantCard';
import './RestaurantsPage.css';
import { Link } from 'react-router-dom';  // Добавьте этот импорт

// Выносим хук useGeocoding в отдельную функцию
const useGeocoding = () => {
  const [geocodingCache, setGeocodingCache] = useState({});
  
  const geocodeAddress = useCallback(async (address) => {
    if (geocodingCache[address]) {
      return geocodingCache[address];
    }
    
    try {
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: address,
          format: 'json',
          limit: 1,
          countrycodes: 'ru',
          addressdetails: 1
        }
      });
      
      if (response.data && response.data[0]) {
        const coords = {
          lat: parseFloat(response.data[0].lat),
          lng: parseFloat(response.data[0].lon)
        };
        
        setGeocodingCache(prev => ({
          ...prev,
          [address]: coords
        }));
        
        return coords;
      }
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }, [geocodingCache]);

  return { geocodeAddress };
};

const RestaurantsPage = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState(0);
  const [openNowFilter, setOpenNowFilter] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [userLocation, setUserLocation] = useState(null);
  const [distanceFilter, setDistanceFilter] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [geocodingInProgress, setGeocodingInProgress] = useState(false);
  
  const { geocodeAddress } = useGeocoding();
  const user = JSON.parse(localStorage.getItem('user'));
  const isAdmin = user?.is_admin;
  // Список городов для фильтрации
  const cities = [
    { name: "Мое местоположение", coords: null },
    { name: "Минск", coords: { lat: 53.902496, lng: 27.561481 } }, // Координаты центра Минска
    { name: "Гродно", coords: { lat: 53.669353, lng: 23.813131 } },
    { name: "Брест", coords: { lat: 52.097622, lng: 23.734051 } },
    { name: "Витебск", coords: { lat: 55.184217, lng: 30.202878 } },
    { name: "Гомель", coords: { lat: 52.424160, lng: 31.014281 } },
    { name: "Могилев", coords: { lat: 53.900716, lng: 30.332364 } },
  ];

  const [selectedCity, setSelectedCity] = useState("Минск"); // По умолчанию выбран Минск

  // Получаем местоположение пользователя
  useEffect(() => {
    const getLocation = () => {
      setLocationLoading(true);
      setLocationError(null);
      
      if (!navigator.geolocation) {
        setLocationError("Геолокация не поддерживается вашим браузером");
        setLocationLoading(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('Точность:', position.coords.accuracy, 'метров');
          if (position.coords.accuracy > 5000) { // Если точность хуже 5 км
            setLocationError("Определено приблизительное местоположение");
          }
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          let errorMessage = "Не удалось определить ваше местоположение";
          switch(error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = "Доступ к геолокации запрещен. Разрешите доступ в настройках браузера";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Информация о местоположении недоступна";
              break;
            case error.TIMEOUT:
              errorMessage = "Время ожидания определения местоположения истекло";
              break;
          }
          setLocationError(errorMessage);
          setLocationLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    };

    getLocation();
  }, []);

  // Загружаем рестораны и добавляем координаты
  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/restaurants');
        let processedRestaurants = response.data.map(restaurant => ({
          ...restaurant,
          mainPhoto: restaurant.photo_url?.split(',')[0].trim() || null,
          rating: parseFloat(restaurant.rating) || 0,
          isOpen: checkIfOpen(restaurant.working_hours, currentTime)
        }));

        // Добавляем координаты для ресторанов без них
        setGeocodingInProgress(true);
        processedRestaurants = await Promise.all(
          processedRestaurants.map(async restaurant => {
            if (restaurant.latitude && restaurant.longitude) {
              return restaurant;
            }
            
            const coords = await geocodeAddress(restaurant.address);
            return {
              ...restaurant,
              ...(coords ? {
                latitude: coords.lat,
                longitude: coords.lng
              } : {})
            };
          })
        );
        
        setRestaurants(processedRestaurants);
        setGeocodingInProgress(false);
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
  }, [geocodeAddress]);

  // Проверяем, открыт ли ресторан
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

  // Обновляем статус "открыто/закрыто" при изменении времени
  useEffect(() => {
    if (restaurants.length > 0) {
      setRestaurants(prevRestaurants => 
        prevRestaurants.map(restaurant => ({
          ...restaurant,
          isOpen: checkIfOpen(restaurant.working_hours, currentTime)
        })));
    }
  }, [currentTime, restaurants.length]);

  // Рассчитываем расстояние между двумя точками
  const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
    if (lat1 === lat2 && lon1 === lon2) return 0;
    
    const R = 6371; // Радиус Земли в км
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }, []);

  // Фильтруем рестораны с мемоизацией
  const filteredRestaurants = useMemo(() => {
    return restaurants.filter(restaurant => {
      const matchesSearch = searchTerm 
        ? restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
          restaurant.address.toLowerCase().includes(searchTerm.toLowerCase())
        : true;
        
      const matchesType = typeFilter === 'all' || restaurant.establishment_type === typeFilter;
      const matchesRating = restaurant.rating >= ratingFilter;
      const matchesOpenNow = !openNowFilter || restaurant.isOpen;
      
      let matchesDistance = true;
      if (distanceFilter) {
        let baseCoords;
        
        if (selectedCity === "Мое местоположение") {
          baseCoords = userLocation;
        } else {
          const city = cities.find(c => c.name === selectedCity);
          baseCoords = city?.coords;
        }
        
        if (baseCoords && restaurant.latitude && restaurant.longitude) {
          const distance = calculateDistance(
            baseCoords.lat,
            baseCoords.lng,
            restaurant.latitude,
            restaurant.longitude
          );
          restaurant.distance = distance;
          matchesDistance = distance <= distanceFilter;
        } else {
          matchesDistance = false;
        }
      }
      
      return matchesSearch && matchesType && matchesRating && matchesOpenNow && matchesDistance;
    });
  }, [restaurants, searchTerm, typeFilter, ratingFilter, openNowFilter, distanceFilter, userLocation, selectedCity, cities, calculateDistance]);

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

{isAdmin && (
  <Link 
    to="/restaurants/add" 
    className="add-restaurant-button"
    style={{
      marginLeft: '15px',
      padding: '10px 15px',
      backgroundColor: '#ff6b00',
      color: 'white',
      borderRadius: '5px',
      textDecoration: 'none',
      fontWeight: '500',
      transition: 'background-color 0.3s'
    }}
  >
    + Добавить заведение
  </Link>
)}
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
            <FaCity className="filter-icon" />
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="city-select"
            >
              {cities.map(city => (
                <option key={city.name} value={city.name}>
                  {city.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-pill">
            <FaMapMarkerAlt className="filter-icon" />
            <select
              value={distanceFilter || ''}
              onChange={(e) => setDistanceFilter(e.target.value ? Number(e.target.value) : null)}
              className="distance-select"
              disabled={!selectedCity || (selectedCity === "Мое местоположение" && !userLocation)}
            >
              <option value="">Любое расстояние</option>
              <option value="1">До 1 км</option>
              <option value="3">До 3 км</option>
              <option value="5">До 5 км</option>
              <option value="10">До 10 км</option>
              <option value="15">До 15 км</option>
              
            </select>
            {locationLoading && <span className="location-loading">Определение местоположения...</span>}
            {geocodingInProgress && <span className="location-loading">Обработка адресов...</span>}
          </div>
          {userLocation && (
  <div className="location-info">
    <p>Ваши координаты: {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}</p>
    <a 
      href={`https://www.openstreetmap.org/?mlat=${userLocation.lat}&mlon=${userLocation.lng}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      Посмотреть на карте
    </a>
  </div>
)}

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

        {locationError && (
          <div className="location-error">
            <FaExclamationTriangle /> {locationError}
            <button onClick={() => window.location.reload()}>Попробовать снова</button>
          </div>
        )}

        <RestaurantsList 
          restaurants={filteredRestaurants} 
          openNowFilter={openNowFilter}
          userLocation={userLocation} 
        />
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

const RestaurantsList = ({ restaurants, openNowFilter, userLocation }) => {
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
            isOpen: restaurant.isOpen,
            distance: restaurant.distance,
            userLocation: userLocation
          }} 
        />
      ))}
    </div>
  );
};

export default RestaurantsPage;