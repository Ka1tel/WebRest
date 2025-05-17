import { useState, useEffect } from 'react';
import axios from 'axios';
import { FiFilter, FiSearch, FiX } from 'react-icons/fi';
import './DishesPage.css';

const DishesPage = () => {
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    cuisineType: 'all',
    priceRange: [0, 5000],
    weightRange: [0, 1000],
    caloriesRange: [0, 2000],
    isSpicy: false,
    isVegetarian: false,
    selectedIngredients: []
  });
  const [showFilters, setShowFilters] = useState(false);
  const [availableIngredients, setAvailableIngredients] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [availableCuisines, setAvailableCuisines] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dishesRes, ingredientsRes] = await Promise.all([
          axios.get('http://localhost:5000/api/dishes'),
          axios.get('http://localhost:5000/api/ingredients')
        ]);

        setDishes(dishesRes.data);
        
        const categories = [...new Set(dishesRes.data.map(dish => dish.category))];
        const cuisines = [...new Set(dishesRes.data.map(dish => dish.cuisine_type).filter(Boolean))];
        
        setAvailableCategories(categories);
        setAvailableCuisines(cuisines);
        setAvailableIngredients(ingredientsRes.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredDishes = dishes.filter(dish => {
    const matchesSearch = dish.name.toLowerCase().includes(filters.search.toLowerCase()) || 
                        dish.description.toLowerCase().includes(filters.search.toLowerCase());
    const matchesCategory = filters.category === 'all' || dish.category === filters.category;
    const matchesCuisine = filters.cuisineType === 'all' || dish.cuisine_type === filters.cuisineType;
    const matchesPrice = dish.price >= filters.priceRange[0] && dish.price <= filters.priceRange[1];
    const matchesWeight = dish.weight 
      ? dish.weight >= filters.weightRange[0] && dish.weight <= filters.weightRange[1]
      : true;
    const matchesCalories = dish.calories 
      ? dish.calories >= filters.caloriesRange[0] && dish.calories <= filters.caloriesRange[1]
      : true;
    const matchesSpicy = !filters.isSpicy || dish.is_spicy;
    const matchesVegetarian = !filters.isVegetarian || dish.is_vegetarian;
    const matchesIngredients = filters.selectedIngredients.length === 0 || 
      (dish.ingredients && filters.selectedIngredients.every(ing => dish.ingredients.includes(ing)));

    return matchesSearch && matchesCategory && matchesCuisine && 
           matchesPrice && matchesWeight && matchesCalories &&
           matchesSpicy && matchesVegetarian && matchesIngredients;
  });

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleRangeChange = (type, index, value) => {
    const numValue = parseInt(value) || 0;
    const max = type === 'price' ? 5000 : type === 'weight' ? 1000 : 2000;
    const clampedValue = Math.min(Math.max(numValue, 0), max);

    setFilters(prev => {
      const newRange = [...prev[`${type}Range`]];
      newRange[index] = clampedValue;
      
      // Ensure min <= max
      if (index === 0 && newRange[0] > newRange[1]) newRange[1] = newRange[0];
      if (index === 1 && newRange[1] < newRange[0]) newRange[0] = newRange[1];
      
      return { ...prev, [`${type}Range`]: newRange };
    });
  };

  const handleIngredientToggle = (ingredient) => {
    setFilters(prev => {
      const newIngredients = prev.selectedIngredients.includes(ingredient)
        ? prev.selectedIngredients.filter(i => i !== ingredient)
        : [...prev.selectedIngredients, ingredient];
      return { ...prev, selectedIngredients: newIngredients };
    });
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      category: 'all',
      cuisineType: 'all',
      priceRange: [0, 5000],
      weightRange: [0, 1000],
      caloriesRange: [0, 2000],
      isSpicy: false,
      isVegetarian: false,
      selectedIngredients: []
    });
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay message={error} />;

  return (
    <div className="dishes-container">
      <div className="dishes-header">
        <h1>Наше меню</h1>
        
        <div className="controls">
          <div className="search-bar">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Поиск блюд..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
            {filters.search && (
              <button 
                className="clear-search"
                onClick={() => handleFilterChange('search', '')}
              >
                <FiX />
              </button>
            )}
          </div>
          
          <div className="filter-buttons">
            <button 
              className="filter-toggle"
              onClick={() => setShowFilters(!showFilters)}
            >
              <FiFilter /> Фильтры {showFilters ? '▲' : '▼'}
            </button>
            <button 
              className="reset-filters"
              onClick={resetFilters}
            >
              Сбросить
            </button>
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="filters-panel">
          <div className="filter-group">
            <label>Категория</label>
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
            >
              <option value="all">Все категории</option>
              {availableCategories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Кухня</label>
            <select
              value={filters.cuisineType}
              onChange={(e) => handleFilterChange('cuisineType', e.target.value)}
            >
              <option value="all">Все кухни</option>
              {availableCuisines.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Обновленный фильтр цены */}
          <div className="filter-group">
            <label>Цена (₽)</label>
            <div className="double-range-slider">
              <input
                type="range"
                min="0"
                max="5000"
                step="100"
                value={filters.priceRange[0]}
                onChange={(e) => handleRangeChange('price', 0, e.target.value)}
                className="thumb thumb--left"
              />
              <input
                type="range"
                min="0"
                max="5000"
                step="100"
                value={filters.priceRange[1]}
                onChange={(e) => handleRangeChange('price', 1, e.target.value)}
                className="thumb thumb--right"
              />
              <div className="slider">
                <div className="slider__track"></div>
                <div className="slider__range" style={{
                  left: `${(filters.priceRange[0] / 5000) * 100}%`,
                  right: `${100 - (filters.priceRange[1] / 5000) * 100}%`
                }}></div>
              </div>
            </div>
            <div className="range-inputs">
              <input
                type="number"
                min="0"
                max="5000"
                value={filters.priceRange[0]}
                onChange={(e) => handleRangeChange('price', 0, e.target.value)}
              />
              <span>-</span>
              <input
                type="number"
                min="0"
                max="5000"
                value={filters.priceRange[1]}
                onChange={(e) => handleRangeChange('price', 1, e.target.value)}
              />
            </div>
          </div>

          {/* Обновленный фильтр веса */}
          <div className="filter-group">
            <label>Вес (г)</label>
            <div className="double-range-slider">
              <input
                type="range"
                min="0"
                max="1000"
                step="10"
                value={filters.weightRange[0]}
                onChange={(e) => handleRangeChange('weight', 0, e.target.value)}
                className="thumb thumb--left"
              />
              <input
                type="range"
                min="0"
                max="1000"
                step="10"
                value={filters.weightRange[1]}
                onChange={(e) => handleRangeChange('weight', 1, e.target.value)}
                className="thumb thumb--right"
              />
              <div className="slider">
                <div className="slider__track"></div>
                <div className="slider__range" style={{
                  left: `${(filters.weightRange[0] / 1000) * 100}%`,
                  right: `${100 - (filters.weightRange[1] / 1000) * 100}%`
                }}></div>
              </div>
            </div>
            <div className="range-inputs">
              <input
                type="number"
                min="0"
                max="1000"
                value={filters.weightRange[0]}
                onChange={(e) => handleRangeChange('weight', 0, e.target.value)}
              />
              <span>-</span>
              <input
                type="number"
                min="0"
                max="1000"
                value={filters.weightRange[1]}
                onChange={(e) => handleRangeChange('weight', 1, e.target.value)}
              />
            </div>
          </div>

          {/* Обновленный фильтр калорий */}
          <div className="filter-group">
            <label>Калории (ккал)</label>
            <div className="double-range-slider">
              <input
                type="range"
                min="0"
                max="2000"
                step="10"
                value={filters.caloriesRange[0]}
                onChange={(e) => handleRangeChange('calories', 0, e.target.value)}
                className="thumb thumb--left"
              />
              <input
                type="range"
                min="0"
                max="2000"
                step="10"
                value={filters.caloriesRange[1]}
                onChange={(e) => handleRangeChange('calories', 1, e.target.value)}
                className="thumb thumb--right"
              />
              <div className="slider">
                <div className="slider__track"></div>
                <div className="slider__range" style={{
                  left: `${(filters.caloriesRange[0] / 2000) * 100}%`,
                  right: `${100 - (filters.caloriesRange[1] / 2000) * 100}%`
                }}></div>
              </div>
            </div>
            <div className="range-inputs">
              <input
                type="number"
                min="0"
                max="2000"
                value={filters.caloriesRange[0]}
                onChange={(e) => handleRangeChange('calories', 0, e.target.value)}
              />
              <span>-</span>
              <input
                type="number"
                min="0"
                max="2000"
                value={filters.caloriesRange[1]}
                onChange={(e) => handleRangeChange('calories', 1, e.target.value)}
              />
            </div>
          </div>

          <div className="filter-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={filters.isVegetarian}
                onChange={() => handleFilterChange('isVegetarian', !filters.isVegetarian)}
              />
              Только вегетарианские
            </label>
          </div>

          <div className="filter-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={filters.isSpicy}
                onChange={() => handleFilterChange('isSpicy', !filters.isSpicy)}
              />
              Только острые
            </label>
          </div>

          <div className="filter-group">
            <label>Ингредиенты</label>
            <div className="ingredients-list">
              {availableIngredients.slice(0, 15).map(ingredient => (
                <button
                  key={ingredient}
                  className={`ingredient-tag ${filters.selectedIngredients.includes(ingredient) ? 'active' : ''}`}
                  onClick={() => handleIngredientToggle(ingredient)}
                >
                  {ingredient}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <DishesList dishes={filteredDishes} />
    </div>
  );
};





const LoadingSpinner = () => (
  <div className="loading-spinner">
    <div className="spinner"></div>
    <p>Загрузка меню...</p>
  </div>
);

const ErrorDisplay = ({ message }) => (
  <div className="error-message">
    <p>Ошибка загрузки: {message}</p>
    <button onClick={() => window.location.reload()}>Попробовать снова</button>
  </div>
);

const DishesList = ({ dishes }) => {
  if (dishes.length === 0) {
    return (
      <div className="no-results">
        <p>Ничего не найдено. Попробуйте изменить параметры фильтрации.</p>
      </div>
    );
  }

  return (
    <div className="dishes-grid">
      {dishes.map(dish => (
        <DishCard key={dish.id} dish={dish} />
      ))}
    </div>
  );
};

const DishCard = ({ dish }) => {
  return (
    <div className="dish-card">
      <div className="dish-image-container">
        <img 
          src={dish.photo_url || '/placeholder-dish.jpg'} 
          alt={dish.name}
          className="dish-image"
          onError={(e) => {
            e.target.src = '/placeholder-dish.jpg';
            e.target.onerror = null;
          }}
        />
        {dish.is_spicy && <span className="spicy-badge">Острое</span>}
        {dish.is_vegetarian && <span className="vegetarian-badge">Вегетарианское</span>}
      </div>
      
      <div className="dish-content">
        <h3>{dish.name}</h3>
        <p className="description">{dish.description}</p>
        
        <div className="dish-meta">
          <div className="meta-item">
            <span className="price">{dish.price} ₽</span>
            {dish.weight && <span className="weight">{dish.weight} г</span>}
            {dish.calories && <span className="calories">{dish.calories} ккал</span>}
          </div>
          
          <div className="meta-item">
            {dish.cuisine_type && <span className="cuisine">{dish.cuisine_type}</span>}
          </div>
        </div>

        {dish.ingredients && dish.ingredients.length > 0 && (
          <div className="dish-ingredients">
            <p>Ингредиенты: {dish.ingredients.join(', ')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DishesPage;