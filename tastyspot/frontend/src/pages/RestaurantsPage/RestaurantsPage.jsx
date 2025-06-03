// pages/RestaurantsPage/RestaurantsPage.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { FaSearch, FaClock, FaStar, FaUtensils, FaMapMarkerAlt, FaExclamationTriangle, FaCity } from 'react-icons/fa';
import { FiDollarSign, FiPlus, FiAlertCircle } from 'react-icons/fi';
import RestaurantCard from '../../components/RestaurantCard/RestaurantCard';
import AddRestaurantPage from '../AddRestaurantPage/AddRestaurantPage';
import './RestaurantsPage.css'; 
import { Link, useNavigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'; 
const ALL_CITIES_OPTION = "Любой город";


const loadYmaps = () => {
  return new Promise((resolve, reject) => {
    if (window.ymaps) {
      window.ymaps.ready(() => resolve(window.ymaps));
      return;
    }
    const script = document.createElement('script');
   
    script.src = 'https://api-maps.yandex.ru/2.1/?apikey=bbaaf96a-e8f7-4897-8ace-d6791f94450e&lang=ru_RU';
    script.onload = () => {
      if (window.ymaps) {
        window.ymaps.ready(() => resolve(window.ymaps));
      } else {
        console.error("[RestaurantsPage] Yandex Maps API: window.ymaps is not available after script load.");
        reject(new Error("Yandex Maps API: window.ymaps is not available after script load."));
      }
    };
    script.onerror = () => {
        console.error("[RestaurantsPage] Failed to load Yandex Maps API script.");
        reject(new Error("Failed to load Yandex Maps API script."));
    }
    document.head.appendChild(script);
  });
};


const RestaurantsPage = () => {
  const navigate = useNavigate();
  

  const [restaurants, setRestaurants] = useState([]);
  const [uniqueCuisines, setUniqueCuisines] = useState(['all']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState(0);
  const [openNowFilter, setOpenNowFilter] = useState(false);
  const [cuisineFilter, setCuisineFilter] = useState('all');
  const [priceRangeFilter, setPriceRangeFilter] = useState('all');
  const [selectedCity, setSelectedCity] = useState(ALL_CITIES_OPTION);

  const [userLocation, setUserLocation] = useState(null);
  const [distanceFilter, setDistanceFilter] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [distanceCalculations, setDistanceCalculations] = useState({});

  const [currentTime, setCurrentTime] = useState(new Date());
  const [isAdmin, setIsAdmin] = useState(false);


  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setIsAdmin(parsedUser.is_admin === true || parsedUser.role === 'admin');
      } catch (e) {
        console.error("[RestaurantsPage] Error parsing user from localStorage for admin check:", e);
        setIsAdmin(false);
      }
    }
  }, []);

  const priceRanges = useMemo(() => [
    { value: 'all', label: 'Любой' },
    { value: 'эконом', label: '$ (эконом)' },
    { value: 'средний', label: '$$ (средний)' },
    { value: 'премиум', label: '$$$ (премиум)' }
  ], []);

  const cities = useMemo(() => [
    { name: ALL_CITIES_OPTION, coords: null },
    { name: "Мое местоположение", coords: null },
    { name: "Минск", coords: { lat: 53.902496, lng: 27.561481 } },
    { name: "Гродно", coords: { lat: 53.669353, lng: 23.813131 } },
    { name: "Брест", coords: { lat: 52.097622, lng: 23.734051 } },
    { name: "Витебск", coords: { lat: 55.184217, lng: 30.202878 } },
    { name: "Гомель", coords: { lat: 52.424160, lng: 31.014281 } },
    { name: "Могилев", coords: { lat: 53.900716, lng: 30.332364 } },
  ], []);

  useEffect(() => {
    if (selectedCity === "Мое местоположение") {
      setLocationLoading(true);
      setLocationError(null);
      setUserLocation(null);
      if (!navigator.geolocation) {
        setLocationError("Геолокация не поддерживается вашим браузером.");
        setLocationLoading(false);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log("[RestaurantsPage] Geolocation success:", position.coords);
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
          setLocationLoading(false);
        },
        (geoError) => {
          let errorMessage = "Не удалось определить ваше местоположение.";
          switch (geoError.code) {
            case geoError.PERMISSION_DENIED: errorMessage = "Вы запретили доступ к геолокации."; break;
            case geoError.POSITION_UNAVAILABLE: errorMessage = "Информация о местоположении недоступна."; break;
            case geoError.TIMEOUT: errorMessage = "Время ожидания запроса геолокации истекло."; break;
            default: errorMessage = "Произошла неизвестная ошибка при определении местоположения.";
          }
          console.warn('[RestaurantsPage] Geolocation Error:', errorMessage, geoError);
          setLocationError(errorMessage);
          setLocationLoading(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
      );
    } else {
      setUserLocation(null);
      setLocationLoading(false);
      setLocationError(null);
    }
  }, [selectedCity]);

  const correctCuisineType = useCallback((cuisine) => {
    if (!cuisine) return '';
    return String(cuisine).toLowerCase().trim().replace('италианская', 'итальянская');
  }, []);

  const checkIfOpen = useCallback((workingHours, time) => {
    if (!workingHours || typeof workingHours !== 'string') return false;
    try {
      const parts = workingHours.split('-');
      if (parts.length !== 2) return false;
      const [openTimeStr, closeTimeStr] = parts.map(s => s.trim());
      const parseTime = (timeStr) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
          throw new Error(`Invalid time string: ${timeStr} in workingHours: ${workingHours}`);
        }
        return { hours, minutes };
      };
      const { hours: openHours, minutes: openMinutes } = parseTime(openTimeStr);
      const { hours: closeHours, minutes: closeMinutes } = parseTime(closeTimeStr);

      const openDateTime = new Date(time);
      openDateTime.setHours(openHours, openMinutes, 0, 0);
      const closeDateTime = new Date(time);
      closeDateTime.setHours(closeHours, closeMinutes, 0, 0);

      if (closeDateTime <= openDateTime) {
        if (time >= openDateTime || time < closeDateTime) {
             if (time < closeDateTime && time.getHours() < openHours) {
                openDateTime.setDate(openDateTime.getDate() - 1);
             } else if (time >= openDateTime && time.getHours() >= openHours) {
                closeDateTime.setDate(closeDateTime.getDate() + 1);
             } else {
                 return false;
             }
        } else {
            return false;
        }
      }
      return time >= openDateTime && time < closeDateTime;
    } catch (e) {
      // console.error(`[RestaurantsPage] Error parsing working hours "${workingHours}":`, e.message);
      return false;
    }
  }, []);

  useEffect(() => {
    const fetchRestaurants = async () => {
      setLoading(true);
      setError(null);
      console.log("[RestaurantsPage] Fetching restaurants...");
      try {
        const response = await axios.get(`${API_BASE_URL}/api/restaurants`);
        if (!Array.isArray(response.data)) {
          console.error("[RestaurantsPage] API response is not an array:", response.data);
          setError('Ошибка: данные от API не являются списком.');
          setRestaurants([]); setLoading(false); return;
        }
        console.log("[RestaurantsPage] Restaurants fetched successfully:", response.data.length, "items");

        const initialTime = new Date();
        const processedRestaurants = response.data.map(restaurant => ({
          ...restaurant,
          mainPhoto: restaurant.photo_url?.split(',')[0].trim() || null,
          rating: parseFloat(restaurant.rating) || 0,
          isOpen: checkIfOpen(restaurant.working_hours, initialTime),
          cuisine_type: correctCuisineType(restaurant.cuisine_type),
          latitude: typeof restaurant.latitude === 'string' ? parseFloat(restaurant.latitude.replace(',', '.')) : Number(restaurant.latitude),
          longitude: typeof restaurant.longitude === 'string' ? parseFloat(restaurant.longitude.replace(',', '.')) : Number(restaurant.longitude),
          city: restaurant.city || null,
        }));
        
        setRestaurants(processedRestaurants);

        const allCuisines = processedRestaurants
          .map(r => correctCuisineType(r.cuisine_type))
          .filter(Boolean);
        setUniqueCuisines(['all', ...new Set(allCuisines)].sort((a, b) => a.localeCompare(b, 'ru')));

      } catch (err) {
        console.error('[RestaurantsPage] Error loading restaurants:', err);
        const message = err.response?.data?.message || err.response?.data?.error || err.message || 'Неизвестная ошибка загрузки.';
        setError(message);
        setRestaurants([]);
      } finally {
        setLoading(false);
      }
    };
    fetchRestaurants();
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, [checkIfOpen, correctCuisineType]);

  useEffect(() => {
    if (restaurants.length > 0) {
      setRestaurants(prevRestaurants =>
        prevRestaurants.map(r => ({ ...r, isOpen: checkIfOpen(r.working_hours, currentTime) }))
      );
    }
  }, [currentTime, checkIfOpen, restaurants.length]);

  const calculateDistances = useCallback(() => {
    // console.log(`[RestaurantsPage] Calculating distances. Selected city: ${selectedCity}, User location:`, userLocation);
    let fromCoords;
    const cityDataObj = cities.find(c => c.name === selectedCity);

    if (selectedCity === "Мое местоположение") {
      if (userLocation?.lat != null && userLocation?.lng != null) {
        fromCoords = { lat: userLocation.lat, lng: userLocation.lng };
      } else {
        if (!locationLoading) console.warn("[RestaurantsPage] Cannot calculate distances: User location not available yet for 'Мое местоположение'.");
        setDistanceCalculations({}); return;
      }
    } else if (cityDataObj?.coords) {
      fromCoords = cityDataObj.coords;
    } else {
      setDistanceCalculations({}); return;
    }

    if (!fromCoords) {
        setDistanceCalculations({}); return;
    }
    
    if (selectedCity !== "Мое местоположение" && !distanceFilter) {
        setDistanceCalculations({}); return;
    }

    const haversineDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const newDistances = {};
    restaurants.forEach(restaurant => {
      if (restaurant.id &&
          restaurant.latitude != null && restaurant.longitude != null &&
          !isNaN(restaurant.latitude) && !isNaN(restaurant.longitude)) {
        const dist = haversineDistance(
          fromCoords.lat, fromCoords.lng,
          restaurant.latitude, restaurant.longitude
        );
        newDistances[restaurant.id] = dist;
      } else {
        newDistances[restaurant.id || `unknown_${Date.now()}_${Math.random()}`] = Infinity;
      }
    });
    setDistanceCalculations(newDistances);
  }, [restaurants, selectedCity, cities, userLocation, distanceFilter, locationLoading]);

  useEffect(() => {
    if (restaurants.length > 0) {
      if (distanceFilter !== null || selectedCity === "Мое местоположение") {
        calculateDistances();
      } else {
        setDistanceCalculations({});
      }
    } else {
        setDistanceCalculations({});
    }
  }, [distanceFilter, selectedCity, userLocation, restaurants.length, calculateDistances]);

  const handleDeleteRestaurant = async (restaurantId, restaurantName) => {
    console.log(`[RestaurantsPage] handleDeleteRestaurant called for ID: ${restaurantId}, Name: ${restaurantName}`);
    if (!isAdmin) {
      console.warn("[RestaurantsPage] Delete attempt by non-admin user.");
      setError("У вас нет прав для выполнения этого действия.");
      return;
    }
    if (!restaurantId) {
      console.error("[RestaurantsPage] Restaurant ID for deletion is undefined or null.");
      setError("Не удалось определить ID ресторана для удаления.");
      return;
    }
    const confirmDelete = window.confirm(
      `Вы уверены, что хотите удалить ресторан "${restaurantName || `ID: ${restaurantId}`}"? Это действие необратимо.`
    );
    if (confirmDelete) {
      console.log(`[RestaurantsPage] User confirmed deletion for ID: ${restaurantId}`);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError("Ошибка авторизации: токен не найден. Пожалуйста, войдите снова.");
          console.error("[RestaurantsPage] Auth token not found for deletion.");
          navigate('/login');
          return;
        }
        console.log(`[RestaurantsPage] Attempting to delete with token...`);
        const response = await axios.delete(`${API_BASE_URL}/api/restaurants/${restaurantId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('[RestaurantsPage] Server response for delete:', response.data);
        if (response.status === 200 || response.status === 204 || response.data.success) {
          setRestaurants(prevRestaurants => {
            const updatedRestaurants = prevRestaurants.filter(r => r.id !== restaurantId);
            console.log(`[RestaurantsPage] Restaurants state updated. Old count: ${prevRestaurants.length}, New count: ${updatedRestaurants.length}`);
            return updatedRestaurants;
          });
          setDistanceCalculations(prevDistances => {
            const newDistances = {...prevDistances};
            delete newDistances[restaurantId];
            return newDistances;
          });
        } else {
          const serverMessage = response.data.message || response.data.error || "Сервер вернул неожиданный ответ при удалении.";
          setError(`Не удалось удалить ресторан: ${serverMessage}`);
          console.error(`[RestaurantsPage] Server indicated delete failure: ${serverMessage}`, response.data);
        }
      } catch (err) {
        console.error('[RestaurantsPage] Error during restaurant deletion API call:', err);
        let errorMessage = 'Произошла ошибка при удалении ресторана.';
        if (err.response) {
          console.error('[RestaurantsPage] Server Error Response:', err.response.data, "Status:", err.response.status);
          if (err.response.status === 401 || err.response.status === 403) {
            errorMessage = err.response.data.error || "Ошибка авторизации или доступа. Попробуйте войти снова.";
          } else {
            errorMessage = err.response.data.message || err.response.data.error || `Ошибка сервера (${err.response.status})`;
          }
        } else if (err.request) {
          console.error('[RestaurantsPage] No response received:', err.request);
          errorMessage = 'Нет ответа от сервера. Проверьте ваше соединение.';
        } else {
          console.error('[RestaurantsPage] Error setting up request:', err.message);
          errorMessage = `Ошибка при отправке запроса: ${err.message}`;
        }
        setError(errorMessage);
      }
    } else {
      console.log(`[RestaurantsPage] User cancelled deletion for ID: ${restaurantId}`);
    }
  };

  const filteredRestaurants = useMemo(() => {
    // console.log(`[RestaurantsPage] Filtering restaurants. Count before: ${restaurants.length}, City: "${selectedCity}", Search: "${searchTerm}"`);
    let currentRestaurants = [...restaurants];
    if (selectedCity !== ALL_CITIES_OPTION && selectedCity !== "Мое местоположение") {
      currentRestaurants = currentRestaurants.filter(restaurant =>
        restaurant.city && String(restaurant.city).trim().toLowerCase() === selectedCity.trim().toLowerCase()
      );
    }
    currentRestaurants = currentRestaurants.filter(restaurant => {
      const nameMatch = String(restaurant.name || '').toLowerCase();
      const addressMatch = String(restaurant.address || '').toLowerCase();
      const searchTermLower = searchTerm.toLowerCase();
      const matchesSearch = searchTerm ? nameMatch.includes(searchTermLower) || addressMatch.includes(searchTermLower) : true;
      const matchesType = typeFilter === 'all' || restaurant.establishment_type === typeFilter;
      const matchesRating = restaurant.rating >= ratingFilter;
      const matchesOpenNow = !openNowFilter || restaurant.isOpen;
      const matchesCuisine = cuisineFilter === 'all' || (restaurant.cuisine_type && String(restaurant.cuisine_type).toLowerCase() === cuisineFilter.toLowerCase());
      const matchesPriceRange = priceRangeFilter === 'all' || (restaurant.price_range && restaurant.price_range === priceRangeFilter);
      let matchesDistance = true;
      if (distanceFilter !== null && restaurant.id && distanceCalculations[restaurant.id] !== undefined) {
        const distance = distanceCalculations[restaurant.id];
        matchesDistance = typeof distance === 'number' && isFinite(distance) && distance <= distanceFilter;
      }
      return matchesSearch && matchesType && matchesRating && matchesOpenNow && matchesCuisine && matchesPriceRange && matchesDistance;
    });
    // console.log(`[RestaurantsPage] Filtering complete. Count after: ${currentRestaurants.length}`);
    return currentRestaurants;
  }, [restaurants, searchTerm, typeFilter, ratingFilter, openNowFilter, cuisineFilter, priceRangeFilter, selectedCity, distanceFilter, distanceCalculations]);

  if (loading && restaurants.length === 0) return <LoadingSpinner />;
  if (error && restaurants.length === 0 && !loading) return <ErrorDisplay message={error} />;

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
          <div className="search-input-wrapper">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Поиск по названию или адресу..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
             </div>
            {isAdmin && (
              <Link to="/restaurants/add" className="add-restaurant-button">
                <FiPlus style={{ marginRight: '5px' }} /> Добавить заведение
              </Link>
            )}
          </div>
        </div>

        <div className="filters-container">
          <div className="filters-row">
            <div className="filter-pill">
              <FaUtensils className="filter-icon" />
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="filter-select">
                <option value="all">Все типы</option>
                <option value="ресторан">Рестораны</option><option value="кафе">Кафе</option>
                <option value="бар">Бары</option><option value="фастфуд">Фастфуд</option>
                <option value="кофейня">Кофейни</option>
              </select>
            </div>
            <div className="filter-pill">
              <FaUtensils className="filter-icon" />
              <select value={cuisineFilter} onChange={(e) => setCuisineFilter(e.target.value)} className="filter-select">
                {uniqueCuisines.map(cuisine => (
                  <option key={cuisine} value={cuisine.toLowerCase()}>
                    {cuisine === 'all' ? 'Любая кухня' : cuisine.charAt(0).toUpperCase() + cuisine.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-pill">
              <FiDollarSign className="filter-icon" />
              <select value={priceRangeFilter} onChange={(e) => setPriceRangeFilter(e.target.value)} className="filter-select">
                {priceRanges.map(range => <option key={range.value} value={range.value}>{range.label}</option>)}
              </select>
            </div>
            <div className="filter-pill">
              <FaCity className="filter-icon" />
              <select value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)} className="filter-select">
                {cities.map(city => <option key={city.name} value={city.name}>{city.name}</option>)}
              </select>
            </div>
            <div className="filter-pill">
              <FaMapMarkerAlt className="filter-icon" />
              <select
                value={distanceFilter === null ? '' : distanceFilter}
                onChange={(e) => setDistanceFilter(e.target.value ? Number(e.target.value) : null)}
                className="filter-select"
                disabled={
                    (selectedCity === "Мое местоположение" && (locationLoading || (!userLocation && !!locationError))) ||
                    (selectedCity === ALL_CITIES_OPTION) ||
                    (selectedCity !== "Мое местоположение" && !cities.find(c => c.name === selectedCity)?.coords)
                }
              >
                <option value="">Любое расстояние</option>
                <option value="1">До 1 км</option><option value="3">До 3 км</option>
                <option value="5">До 5 км</option><option value="10">До 10 км</option>
                <option value="20">До 20 км</option>
              </select>
            </div>
            {selectedCity === "Мое местоположение" && locationLoading && (
                <div className="location-status-inline filter-pill">
                    <div className="spinner small-spinner" style={{marginRight: '5px'}}></div>
                    Поиск...
                </div>
            )}
            <div className="filter-pill">
              <FaStar className="filter-icon" />
              <select value={ratingFilter} onChange={(e) => setRatingFilter(Number(e.target.value))} className="filter-select">
                <option value="0">Любой рейтинг</option>
                <option value="3">3+ ★</option><option value="4">4+ ★</option>
                <option value="4.5">4.5+ ★</option><option value="5">5 ★</option>
              </select>
            </div>
            <button
              className={`filter-pill filter-button ${openNowFilter ? 'active' : ''}`}
              onClick={() => setOpenNowFilter(!openNowFilter)}
              title={openNowFilter ? "Показать все заведения" : "Показать только открытые сейчас"}
            >
              <FaClock className="filter-icon" /> Открыто сейчас
            </button>
          </div>
          {selectedCity === "Мое местоположение" && locationError && !userLocation && !locationLoading && (
            <div className="location-error filter-related-error">
              <FaExclamationTriangle style={{ marginRight: '5px' }} /> {locationError}
            </div>
          )}
        </div>

        {error && restaurants.length > 0 && !loading && (
          <div className="operation-error-display"> {/* Изменил класс для стилизации */}
            <FiAlertCircle style={{ marginRight: '8px', color: 'var(--danger-color, red)'}}/>
            {error}
          </div>
        )}
        {loading && restaurants.length > 0 && <div className="loading-inline">Обновление списка...</div>}

        <RestaurantsList
          restaurants={filteredRestaurants}
          distanceCalculations={distanceCalculations}
          selectedCity={selectedCity}
          isAdmin={isAdmin}
          onDeleteRestaurant={handleDeleteRestaurant}
        />
      </div>
    </div>
  );
};

// --- Вспомогательные компоненты ---
const LoadingSpinner = () => (
  <div className="loading-spinner-container">
    <div className="spinner large-spinner"></div>
    <p>Загрузка заведений...</p>
  </div>
);

const ErrorDisplay = ({ message }) => (
  <div className="error-display-container">
    <FaExclamationTriangle style={{ fontSize: '2.5rem', color: 'var(--danger-color, red)', marginBottom: '15px'}}/>
    <h4>Упс! Что-то пошло не так</h4>
    <p style={{ color: '#555', maxWidth: '400px', margin: '0 auto 15px auto' }}>{message}</p>
    <button onClick={() => window.location.reload()} className="retry-button">Попробовать снова</button>
  </div>
);

const RestaurantsList = ({ restaurants, distanceCalculations, selectedCity, isAdmin, onDeleteRestaurant }) => {
  if (!restaurants || restaurants.length === 0) {
    return (
      <div className="no-results">
        <div className="no-results-icon">🍽️</div>
        <h3>Ничего не найдено</h3>
        <p>Попробуйте изменить параметры поиска или выбрать другой город.</p>
      </div>
    );
  }
  return (
    <div className="restaurants-grid">
      {restaurants.map(restaurant => {
        let displayDistance = null;
        if (restaurant.id && distanceCalculations[restaurant.id] !== undefined) {
            const dist = distanceCalculations[restaurant.id];
            if (typeof dist === 'number' && isFinite(dist)) {
                displayDistance = dist;
            }
        }
        return (
          <RestaurantCard
            key={restaurant.id}
            restaurant={{
              ...restaurant,
              distance: displayDistance,
              distanceFrom: selectedCity
            }}
            isAdmin={isAdmin}
            onDelete={onDeleteRestaurant}
          />
        );
      })}
    </div>
  );
};
// ---------------------------------

export default RestaurantsPage;