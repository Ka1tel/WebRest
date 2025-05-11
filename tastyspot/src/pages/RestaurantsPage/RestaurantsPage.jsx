import React, { useState, useEffect } from 'react';
import axios from 'axios';
import RestaurantCard from '../../components/RestaurantCard/RestaurantCard';
import SearchBar from '../../components/SearchBar/SearchBar';
import TypeFilter from '../../components/TypeFilter/TypeFilter';
import './RestaurantsPage.css';

const RestaurantsPage = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/restaurants');
        // Обрабатываем photo_url - берем первую фотографию из списка
        const processedRestaurants = response.data.map(restaurant => ({
          ...restaurant,
          // Разделяем строку по запятым, берем первую фотографию
          mainPhoto: restaurant.photo_url 
            ? restaurant.photo_url.split(',')[0].trim() 
            : null
        }));
        setRestaurants(processedRestaurants);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, []);

  const filteredRestaurants = restaurants.filter(restaurant => {
    const matchesSearch = restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         restaurant.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || restaurant.establishment_type === filter;
    return matchesSearch && matchesFilter;
  });

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay message={error} />;

  return (
    <div className="restaurants-container">
      <div className="restaurants-header">
        <h1>Наши заведения</h1>
        
        <div className="controls">
          <SearchBar value={searchTerm} onChange={setSearchTerm} />
          <TypeFilter value={filter} onChange={setFilter} />
        </div>
      </div>

      <RestaurantsList restaurants={filteredRestaurants} />
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

const RestaurantsList = ({ restaurants }) => {
  if (restaurants.length === 0) {
    return (
      <div className="no-results">
        <p>Ничего не найдено. Попробуйте изменить параметры поиска.</p>
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
            // Передаем обработанное фото в компонент карточки
            photo_url: restaurant.mainPhoto
          }} 
        />
      ))}
    </div>
  );
};

export default RestaurantsPage;