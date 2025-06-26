import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom'; // Добавьте эту строку, если ее нет
import { FiFilter, FiSearch, FiX, FiChevronDown } from 'react-icons/fi';
import './DishesPage.css';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'; 


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
  const [selectedDish, setSelectedDish] = useState(null); // Для хранения выбранного блюда
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dishesRes, ingredientsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/dishes`),
          axios.get(`${API_BASE_URL}/api/ingredients`)
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

  const openDishModal = (dish) => {
    setSelectedDish(dish);
    document.body.style.overflow = 'hidden'; // Запрещаем прокрутку страницы
  };

  const closeDishModal = () => {
    setSelectedDish(null);
    document.body.style.overflow = 'auto'; // Возвращаем прокрутку
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay message={error} />;

  return (
    <div className="dishes-container">
      <div className="dishes-header">
        <h1>Блюда</h1>
        
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

          <div className="filter-group">
  <label>Цена (BYN)</label>
  <div className="range-filters">
    <div className="single-range-filter">
      <label>От:</label>
      <input
        type="range"
        min="0"
        max="5000"
        step="100"
        value={filters.priceRange[0]}
        onChange={(e) => handleRangeChange('price', 0, e.target.value)}
        className="custom-slider"
      />
      <div className="range-value">{filters.priceRange[0]} BYN</div>
    </div>
    
    <div className="single-range-filter">
      <label>До:</label>
      <input
        type="range"
        min="0"
        max="5000"
        step="100"
        value={filters.priceRange[1]}
        onChange={(e) => handleRangeChange('price', 1, e.target.value)}
        className="custom-slider"
      />
      <div className="range-value">{filters.priceRange[1]} BYN</div>
    </div>
  </div>
</div>

<div className="filter-group">
  <label>Вес (г)</label>
  <div className="range-filters">
    <div className="single-range-filter">
      <label>От:</label>
      <input
        type="range"
        min="0"
        max="1000"
        step="10"
        value={filters.weightRange[0]}
        onChange={(e) => handleRangeChange('weight', 0, e.target.value)}
        className="custom-slider"
      />
      <div className="range-value">{filters.weightRange[0]} г</div>
    </div>
    
    <div className="single-range-filter">
      <label>До:</label>
      <input
        type="range"
        min="0"
        max="1000"
        step="10"
        value={filters.weightRange[1]}
        onChange={(e) => handleRangeChange('weight', 1, e.target.value)}
        className="custom-slider"
      />
      <div className="range-value">{filters.weightRange[1]} г</div>
    </div>
  </div>
</div>

<div className="filter-group">
  <label>Калории (ккал)</label>
  <div className="range-filters">
    <div className="single-range-filter">
      <label>От:</label>
      <input
        type="range"
        min="0"
        max="2000"
        step="10"
        value={filters.caloriesRange[0]}
        onChange={(e) => handleRangeChange('calories', 0, e.target.value)}
        className="custom-slider"
      />
      <div className="range-value">{filters.caloriesRange[0]} ккал</div>
    </div>
    
    <div className="single-range-filter">
      <label>До:</label>
      <input
        type="range"
        min="0"
        max="2000"
        step="10"
        value={filters.caloriesRange[1]}
        onChange={(e) => handleRangeChange('calories', 1, e.target.value)}
        className="custom-slider"
      />
      <div className="range-value">{filters.caloriesRange[1]} ккал</div>
    </div>
  </div>
</div>
<div className="filter-group checkbox-group custom-checkbox-group"> {/* Добавим класс для общей группы */}
  <label className="custom-checkbox-label"> {/* Класс для label */}
    <input
      type="checkbox"
      checked={filters.isVegetarian}
      onChange={() => handleFilterChange('isVegetarian', !filters.isVegetarian)}
    />
    <span className="custom-checkbox-checkmark"></span> {/* Наш кастомный чекбокс */}
    <span className="custom-checkbox-text">Только вегетарианские</span> {/* Текст метки */}
  </label>
</div>

<div className="filter-group checkbox-group custom-checkbox-group">
  <label className="custom-checkbox-label">
    <input
      type="checkbox"
      checked={filters.isSpicy}
      onChange={() => handleFilterChange('isSpicy', !filters.isSpicy)}
    />
    <span className="custom-checkbox-checkmark"></span>
    <span className="custom-checkbox-text">Только острые</span>
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

      <DishesList dishes={filteredDishes} onDishClick={openDishModal} />
      
      {/* Модальное окно с подробной информацией о блюде */}
      {selectedDish && (
        <div className="dish-modal-overlay" onClick={closeDishModal}>
          <div className="dish-modal-content" onClick={e => e.stopPropagation()}>
            <button className="dish-modal-close" onClick={closeDishModal}>
              <FiX />
            </button>
            
            <div className="dish-modal-header">
              <div className="dish-modal-image">
                <img 
                  src={selectedDish.photo_url || '/placeholder-dish.jpg'} 
                  alt={selectedDish.name}
                  onError={(e) => e.target.src = '/placeholder-dish.jpg'}
                />
              </div>
              <div className="dish-modal-title">
                <h2>{selectedDish.name}</h2>
                {selectedDish.cuisine_type && (
                  <span className="dish-modal-cuisine">{selectedDish.cuisine_type}</span>
                )}
                <div className="dish-modal-badges">
                  {selectedDish.is_spicy && <span className="badge spicy-badge">Острое</span>}
                  {selectedDish.is_vegetarian && <span className="badge veg-badge">Вегетарианское</span>}
                </div>
              </div>
            </div>
            
            <div className="dish-modal-body">
              <div className="dish-modal-description">
                <h3>Описание</h3>
                <p>{selectedDish.description || 'Нет описания'}</p>
              </div>
              
              <div className="dish-modal-details">
                <div className="detail-item">
                  <span className="detail-label">Цена:</span>
                  <span className="detail-value">{(selectedDish.price/24).toFixed(2)} BYN</span>
                </div>
                
                {selectedDish.weight && (
                  <div className="detail-item">
                    <span className="detail-label">Вес:</span>
                    <span className="detail-value">{selectedDish.weight} г</span>
                  </div>
                )}
                
                {selectedDish.calories && (
                  <div className="detail-item">
                    <span className="detail-label">Калории:</span>
                    <span className="detail-value">{selectedDish.calories} ккал</span>
                  </div>
                )}
                
                {selectedDish.category && (
                  <div className="detail-item">
                    <span className="detail-label">Категория:</span>
                    <span className="detail-value">{selectedDish.category}</span>
                  </div>
                )}
              </div>
              
              {selectedDish.ingredients?.length > 0 && (
                <div className="dish-modal-ingredients">
                  <h3>Ингредиенты</h3>
                  <ul>
                    {selectedDish.ingredients.map((ingredient, index) => (
                      <li key={index}>{ingredient}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {selectedDish.recipe_steps?.length > 0 && (
                <div className="dish-modal-recipe">
                  <h3>Рецепт приготовления</h3>
                  <ol>
                    {selectedDish.recipe_steps.map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}

{selectedDish.restaurant_id && (
              <div className="dish-modal-footer">
                {/* Предполагаем, что у вас есть Link из react-router-dom */}
                <Link 
                  to={`/restaurants/${selectedDish.restaurant_id}`} 
                  className="go-to-restaurant-button"
                  onClick={closeDishModal} // Закрываем модальное окно при переходе
                >
                  Перейти в {selectedDish.restaurant_name || 'заведение'}
                </Link>
              </div>
            )}
              

            
            </div>
          </div>
        </div>
      )}
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

const DishesList = ({ dishes, onDishClick }) => {
  if (dishes.length === 0) {
    return (
      <div className="no-results">
        <p>Ничего не найдено. Попробуйте изменить параметры фильтрации.</p>
      </div>
    );
  }

  // Группируем блюда по названию
  const groupedDishes = dishes.reduce((acc, dish) => {
    if (!acc[dish.name]) {
      acc[dish.name] = [];
    }
    acc[dish.name].push(dish);
    return acc;
  }, {});

  return (
    <div className="dishes-grid">
      {Object.entries(groupedDishes).map(([name, variants]) => (
        <DishCardGroup 
          key={name} 
          name={name} 
          variants={variants} 
          onDishClick={onDishClick}
        />
      ))}
    </div>
  );
};

const DishCardGroup = ({ name, variants, onDishClick }) => {
  const [expanded, setExpanded] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(0);

  const handleCardClick = (e) => {
    // Если клик был по кнопке вариантов, не открываем модальное окно
    if (e.target.closest('.variants-badge')) {
      return;
    }
    onDishClick(variants[selectedVariant]);
  };

  if (variants.length === 1) {
    return <DishCard dish={variants[0]} onClick={() => onDishClick(variants[0])} />;
  }

  return (
    <div className="dish-card-group">
      <div 
        className={`dish-card-wrapper ${expanded ? 'expanded' : ''}`}
        onClick={handleCardClick}
      >
        <DishCard dish={variants[selectedVariant]} isGrouped />
        <div 
          className="variants-badge"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
        >
          <span>{variants.length} варианта</span>
          <FiChevronDown className={`chevron ${expanded ? 'expanded' : ''}`} />
        </div>
      </div>

      {expanded && (
        <div className="variants-container">
          <div className="variants-header">
            <h4>Выберите вариант:</h4>
            <button 
              className="close-variants"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(false);
              }}
            >
              <FiX />
            </button>
          </div>
          <div className="variants-grid">
            {variants.map((variant, index) => (
              <div 
                key={`${name}-${index}`}
                className={`variant-card ${selectedVariant === index ? 'selected' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedVariant(index);
                  setExpanded(false);
                  onDishClick(variant);
                }}
              >
                <div className="variant-image">
                  <img 
                    src={variant.photo_url || '/placeholder-dish.jpg'} 
                    alt={variant.name}
                    onError={(e) => e.target.src = '/placeholder-dish.jpg'}
                  />
                </div>
                <div className="variant-info">
                  <div className="variant-price">{(variant.price/24).toFixed(2)} BYN</div>
                  <div className="variant-weight">{variant.weight} г</div>
                  {variant.calories && (
                    <div className="variant-calories">{variant.calories} ккал</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const DishCard = ({ dish, isGrouped, isVariant, onClick }) => {
  const [imgSrc, setImgSrc] = useState(dish.photo_url || '/placeholder-dish.jpg');

  return (
    <div 
      className={`dish-card ${isVariant ? 'variant' : ''}`}
      onClick={onClick}
    >
      <div className="dish-image-container">
        <img 
          src={imgSrc}
          alt={dish.name}
          onError={() => setImgSrc('/placeholder-dish.jpg')}
          loading="lazy"
        />
        {dish.is_spicy && <span className="badge spicy-badge">Острое</span>}
        {dish.is_vegetarian && <span className="badge veg-badge">Вегетарианское</span>}
      </div>
      
      <div className="dish-content">
        <h3>{dish.name}</h3>
        {dish.description && <p className="description">{dish.description}</p>}
        
        <div className="dish-meta">
          <div className="price-tag">
            <span className="price">{(dish.price/24).toFixed(2)} BYN</span>
            {dish.weight && <span className="weight">{dish.weight} г</span>}
          </div>
          
          {dish.cuisine_type && (
            <div className="cuisine-tag">
              <span>{dish.cuisine_type}</span>
            </div>
          )}
        </div>

        {dish.ingredients?.length > 0 && (
          <div className="ingredients">
            <div className="ingredients-label">Ингредиенты:</div>
            <div className="ingredients-list">
              {dish.ingredients.join(', ')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DishesPage;