import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { FaSearch, FaClock, FaStar, FaUtensils, FaMapMarkerAlt, FaExclamationTriangle, FaCity } from 'react-icons/fa';
import { FiDollarSign, FiPlus } from 'react-icons/fi';
import RestaurantCard from '../../components/RestaurantCard/RestaurantCard'; // Проверьте путь
import './RestaurantsPage.css'; // Проверьте путь
import { Link } from 'react-router-dom';

// Загрузка API Яндекс.Карт (если используется для чего-либо)
const loadYmaps = () => {
  return new Promise((resolve, reject) => {
    if (window.ymaps) {
      window.ymaps.ready(() => resolve(window.ymaps));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://api-maps.yandex.ru/2.1/?apikey=YOUR_YANDEX_MAPS_API_KEY&lang=ru_RU'; // ЗАМЕНИТЕ НА СВОЙ КЛЮЧ
    script.onload = () => {
      if (window.ymaps) {
        window.ymaps.ready(() => resolve(window.ymaps));
      } else {
        console.error("Yandex Maps API: window.ymaps is not available after script load.");
        reject(new Error("Yandex Maps API: window.ymaps is not available after script load."));
      }
    };
    script.onerror = () => {
        console.error("Failed to load Yandex Maps API script.");
        reject(new Error("Failed to load Yandex Maps API script."));
    }
    document.head.appendChild(script);
  });
};

const ALL_CITIES_OPTION = "Любой город"; // Константа для опции "Любой город"

const RestaurantsPage = () => {
  // const [ymapsApi, setYmapsApi] = useState(null); // Раскомментируйте, если будете использовать ymaps API напрямую
  const [uniqueCuisines, setUniqueCuisines] = useState(['all']);
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
  const [cuisineFilter, setCuisineFilter] = useState('all');
  const [priceRangeFilter, setPriceRangeFilter] = useState('all');
  const [distanceCalculations, setDistanceCalculations] = useState({});

  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setIsAdmin(parsedUser.is_admin === true || parsedUser.role === 'admin');
      } catch (e) {
        console.error("Error parsing user from localStorage for admin check:", e);
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
    { name: ALL_CITIES_OPTION, coords: null }, // Опция "Любой город"
    { name: "Мое местоположение", coords: null },
    { name: "Минск", coords: { lat: 53.902496, lng: 27.561481 } },
    { name: "Гродно", coords: { lat: 53.669353, lng: 23.813131 } },
    { name: "Брест", coords: { lat: 52.097622, lng: 23.734051 } },
    { name: "Витебск", coords: { lat: 55.184217, lng: 30.202878 } },
    { name: "Гомель", coords: { lat: 52.424160, lng: 31.014281 } },
    { name: "Могилев", coords: { lat: 53.900716, lng: 30.332364 } },
  ], []);

  const [selectedCity, setSelectedCity] = useState(ALL_CITIES_OPTION); // По умолчанию "Любой город"

  // useEffect для загрузки API Яндекс.Карт (опционально, если используется)
  // useEffect(() => {
  //   loadYmaps().then(api => {
  //     setYmapsApi(api);
  //     console.log('Yandex Maps API loaded successfully.');
  //   }).catch(err => {
  //     console.error('Failed to load Yandex Maps API:', err);
  //   });
  // }, []);

  // useEffect для геолокации пользователя
  useEffect(() => {
    if (selectedCity === "Мое местоположение") {
      setLocationLoading(true);
      setLocationError(null);
      if (!navigator.geolocation) {
        setLocationError("Геолокация не поддерживается вашим браузером.");
        setLocationLoading(false);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
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
          console.warn('Geolocation Error:', errorMessage, geoError);
          setLocationError(errorMessage);
          setLocationLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setUserLocation(null);
      setLocationLoading(false);
      setLocationError(null);
    }
  }, [selectedCity]);

  const correctCuisineType = (cuisine) => {
    if (!cuisine) return '';
    return String(cuisine).toLowerCase().trim().replace('италианская', 'итальянская');
  };

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

      if (closeDateTime <= openDateTime) { // Заведение работает ночью (закрывается на следующий день или в 00:00)
        // Если текущее время больше или равно времени открытия (например, 22:00)
        // ИЛИ текущее время меньше времени закрытия (например, 02:00 следующего дня)
        if (time >= openDateTime || time < closeDateTime) {
             // Нужно правильно обработать переход через полночь для closeDateTime
             if (time < closeDateTime && time.getHours() < openHours) { // Например, сейчас 01:00, открылось вчера в 22:00
                openDateTime.setDate(openDateTime.getDate() - 1);
             } else if (time >= openDateTime && time.getHours() >= openHours) { // Например, сейчас 23:00, закроется завтра в 02:00
                closeDateTime.setDate(closeDateTime.getDate() + 1);
             } else { // Случай, когда время не попадает в ночной интервал (например, открыто 22-02, а сейчас 15:00)
                 return false;
             }
        } else {
            return false;
        }
      }
      return time >= openDateTime && time < closeDateTime;
    } catch (e) {
      // console.error(`Error parsing working hours "${workingHours}":`, e.message);
      return false;
    }
  }, []);

  // useEffect для загрузки ресторанов
  useEffect(() => {
    const fetchRestaurants = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get('http://localhost:5000/api/restaurants');
        if (!Array.isArray(response.data)) {
          setError('Ошибка: данные от API не являются списком.');
          setRestaurants([]); setLoading(false); return;
        }
        // ЛОГ: Проверить, что приходит от API, особенно поле 'city'
        // console.log("ДАННЫЕ ОТ API (первые 2 ресторана):", JSON.parse(JSON.stringify(response.data.slice(0, 2))));

        const initialTime = new Date();
        const processedRestaurants = response.data.map(restaurant => ({
          ...restaurant,
          mainPhoto: restaurant.photo_url?.split(',')[0].trim() || null,
          rating: parseFloat(restaurant.rating) || 0,
          isOpen: checkIfOpen(restaurant.working_hours, initialTime),
          cuisine_type: correctCuisineType(restaurant.cuisine_type),
          latitude: typeof restaurant.latitude === 'string' ? parseFloat(restaurant.latitude.replace(',', '.')) : Number(restaurant.latitude),
          longitude: typeof restaurant.longitude === 'string' ? parseFloat(restaurant.longitude.replace(',', '.')) : Number(restaurant.longitude),
          // Убедитесь, что поле 'city' здесь есть, если оно приходит от API.
          // Если имя поля от API другое, например 'city_name', то:
          // city: restaurant.city_name || restaurant.city || null,
        }));
        
        // console.log("ОБРАБОТАННЫЕ РЕСТОРАНЫ (первые 2, проверьте 'city'):", JSON.parse(JSON.stringify(processedRestaurants.slice(0, 2))));
        setRestaurants(processedRestaurants);

        const allCuisines = processedRestaurants
          .map(r => correctCuisineType(r.cuisine_type))
          .filter(Boolean);
        setUniqueCuisines(['all', ...new Set(allCuisines)].sort());

      } catch (err) {
        console.error('Ошибка загрузки ресторанов:', err.response?.data?.message || err.message || err);
        setError(err.response?.data?.message || err.message || 'Неизвестная ошибка загрузки.');
        setRestaurants([]);
      } finally {
        setLoading(false);
      }
    };
    fetchRestaurants();
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, [checkIfOpen]);

  // useEffect для обновления isOpen при изменении currentTime
  useEffect(() => {
    if (restaurants.length > 0) {
      setRestaurants(prevRestaurants =>
        prevRestaurants.map(r => ({ ...r, isOpen: checkIfOpen(r.working_hours, currentTime) }))
      );
    }
  }, [currentTime, checkIfOpen, restaurants.length]);


  // Функция расчета расстояний
  const calculateDistances = useCallback(() => {
    let fromCoords;
    const cityDataObj = cities.find(c => c.name === selectedCity);

    if (selectedCity === "Мое местоположение") {
      if (userLocation?.lat != null && userLocation?.lng != null) { // Проверка на null/undefined
        fromCoords = { lat: userLocation.lat, lng: userLocation.lng };
      } else {
        setDistanceCalculations({}); return;
      }
    } else if (cityDataObj?.coords) {
      fromCoords = cityDataObj.coords;
    } else {
      setDistanceCalculations({}); return;
    }

    if (!fromCoords || (!distanceFilter && selectedCity !== "Мое местоположение")) {
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
          restaurant.latitude != null && restaurant.longitude != null && // Проверка на null/undefined
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
  }, [restaurants, selectedCity, cities, userLocation, distanceFilter]);

  // useEffect для вызова calculateDistances
  useEffect(() => {
    if (restaurants.length > 0) {
      if (distanceFilter || selectedCity === "Мое местоположение") {
        calculateDistances();
      } else {
        setDistanceCalculations({});
      }
    } else {
        setDistanceCalculations({});
    }
  }, [distanceFilter, selectedCity, userLocation, restaurants, calculateDistances]);


  const filteredRestaurants = useMemo(() => {
    // console.log(`--- ФИЛЬТРАЦИЯ --- Город: "${selectedCity}", Фильтр расст.: ${distanceFilter}, Ресторанов до: ${restaurants.length}`);
    // if(restaurants.length > 0 && restaurants[0]) console.log("Первый ресторан для фильтрации (city):", restaurants[0].city);

    let currentRestaurants = [...restaurants];

    // 1. Фильтр по ГОРОДУ
    if (selectedCity !== ALL_CITIES_OPTION && selectedCity !== "Мое местоположение") {
      currentRestaurants = currentRestaurants.filter(restaurant => {
        const restaurantCity = restaurant.city ? String(restaurant.city).trim().toLowerCase() : null;
        const currentSelectedCityLower = selectedCity.trim().toLowerCase();
        const cityMatch = restaurantCity === currentSelectedCityLower;
        // if (restaurant.id === ID_ТЕСТОВОГО_РЕСТОРАНА) {
        //    console.log(`  Фильтр города для "${restaurant.name}": API="${restaurant.city}" (обр:"${restaurantCity}"), Выбран="${currentSelectedCityLower}", Совпадение=${cityMatch}`);
        // }
        return cityMatch;
      });
    }

    // 2. Остальные фильтры
    return currentRestaurants.filter(restaurant => {
      const matchesSearch = searchTerm
        ? String(restaurant.name).toLowerCase().includes(searchTerm.toLowerCase()) ||
          (restaurant.address && String(restaurant.address).toLowerCase().includes(searchTerm.toLowerCase()))
        : true;
      const matchesType = typeFilter === 'all' || restaurant.establishment_type === typeFilter;
      const matchesRating = restaurant.rating >= ratingFilter;
      const matchesOpenNow = !openNowFilter || restaurant.isOpen;
      const matchesCuisine = cuisineFilter === 'all' ||
        (restaurant.cuisine_type && String(restaurant.cuisine_type).toLowerCase() === cuisineFilter.toLowerCase());
      const matchesPriceRange = priceRangeFilter === 'all' ||
        (restaurant.price_range && restaurant.price_range === priceRangeFilter);

      let matchesDistance = true;
      if (distanceFilter && restaurant.id) {
        const distance = distanceCalculations[restaurant.id];
        matchesDistance = typeof distance === 'number' && isFinite(distance) && distance <= distanceFilter;
      } else if (selectedCity === "Мое местоположение" && !distanceFilter) {
        matchesDistance = true;
      }
      
      return matchesSearch &&
             matchesType &&
             matchesRating &&
             matchesOpenNow &&
             matchesCuisine &&
             matchesPriceRange &&
             matchesDistance;
    });
  }, [
    restaurants, searchTerm, typeFilter, ratingFilter, openNowFilter,
    cuisineFilter, priceRangeFilter, selectedCity,
    distanceFilter, distanceCalculations
  ]);

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
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Поиск по названию или адресу..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {isAdmin && (
              <Link to="/add-restaurant" className="add-restaurant-button">
                <FiPlus style={{ marginRight: '5px' }} /> Добавить заведение
              </Link>
            )}
          </div>
        </div>

        <div className="filters-container">
          <div className="filters-row">
            {/* Тип заведения */}
            <div className="filter-pill">
              <FaUtensils className="filter-icon" />
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="filter-select">
                <option value="all">Все типы</option>
                <option value="ресторан">Рестораны</option><option value="кафе">Кафе</option>
                <option value="бар">Бары</option><option value="фастфуд">Фастфуд</option>
                {/* Добавьте другие типы, если они есть */}
              </select>
            </div>
            {/* Кухня */}
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
            {/* Ценовой диапазон */}
            <div className="filter-pill">
              <FiDollarSign className="filter-icon" />
              <select value={priceRangeFilter} onChange={(e) => setPriceRangeFilter(e.target.value)} className="filter-select">
                {priceRanges.map(range => <option key={range.value} value={range.value}>{range.label}</option>)}
              </select>
            </div>
            {/* Город */}
            <div className="filter-pill">
              <FaCity className="filter-icon" />
              <select
                value={selectedCity}
                onChange={(e) => {
                  const newCity = e.target.value;
                  console.log('ГОРОД В ФИЛЬТРЕ ИЗМЕНЕН НА:', newCity);
                  setSelectedCity(newCity);
                }}
                className="filter-select"
              >
                {cities.map(city => <option key={city.name} value={city.name}>{city.name}</option>)}
              </select>
            </div>
            {/* Расстояние */}
            <div className="filter-pill">
              <FaMapMarkerAlt className="filter-icon" />
              <select
                value={distanceFilter === null ? '' : distanceFilter}
                onChange={(e) => setDistanceFilter(e.target.value ? Number(e.target.value) : null)}
                className="filter-select"
                disabled={
                    (selectedCity === "Мое местоположение" && (locationLoading || (!userLocation && !!locationError))) ||
                    (selectedCity === ALL_CITIES_OPTION) || // Блокируем если "Любой город"
                    (selectedCity !== "Мое местоположение" && !cities.find(c => c.name === selectedCity)?.coords) // Блокируем если у города нет координат
                }
              >
                <option value="">Любое расстояние</option>
                <option value="1">До 1 км</option><option value="3">До 3 км</option>
                <option value="5">До 5 км</option><option value="10">До 10 км</option>
                <option value="20">До 20 км</option>
              </select>
            </div>
             {/* Статус геолокации */}
            {selectedCity === "Мое местоположение" && locationLoading && (
                <div className="location-status-inline filter-pill">Определение...</div>
            )}
            {/* Рейтинг */}
            <div className="filter-pill">
              <FaStar className="filter-icon" />
              <select value={ratingFilter} onChange={(e) => setRatingFilter(Number(e.target.value))} className="filter-select">
                <option value="0">Любой рейтинг</option>
                <option value="3">3+ ★</option><option value="4">4+ ★</option>
                <option value="4.5">4.5+ ★</option><option value="5">5 ★</option>
              </select>
            </div>
            {/* Открыто сейчас */}
            <button
              className={`filter-pill filter-button ${openNowFilter ? 'active' : ''}`}
              onClick={() => setOpenNowFilter(!openNowFilter)}
              title={openNowFilter ? "Показать все заведения" : "Показать только открытые сейчас"}
            >
              <FaClock className="filter-icon" /> Открыто сейчас
            </button>
          </div>
          {selectedCity === "Мое местоположение" && locationError && !userLocation && (
            <div className="location-error filter-related-error">
              <FaExclamationTriangle /> {locationError}
            </div>
          )}
        </div>

        {loading && restaurants.length > 0 && <div className="loading-inline">Обновление списка...</div>}
        {error && restaurants.length > 0 && <div className="error-inline">Не удалось обновить: {error}</div>}

        <RestaurantsList
          restaurants={filteredRestaurants}
          distanceCalculations={distanceCalculations}
          selectedCity={selectedCity}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );
};

const LoadingSpinner = () => (
  <div className="loading-spinner-container">
    <div className="spinner"></div>
    <p>Загрузка ресторанов...</p>
  </div>
);

const ErrorDisplay = ({ message }) => (
  <div className="error-display-container">
    <p><FaExclamationTriangle style={{ marginRight: '8px', color: 'var(--warning-color, red)'}}/>Ошибка: {message}</p>
    <button onClick={() => window.location.reload()} className="retry-button">Обновить</button>
  </div>
);

const RestaurantsList = ({ restaurants, distanceCalculations, selectedCity, isAdmin }) => {
  if (!restaurants || restaurants.length === 0) {
    return (
      <div className="no-results">
        <div className="no-results-icon">🍽️</div><h3>Ничего не найдено</h3>
        <p>Попробуйте изменить параметры поиска.</p>
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
          />
        );
      })}
    </div>
  );
};

export default RestaurantsPage;