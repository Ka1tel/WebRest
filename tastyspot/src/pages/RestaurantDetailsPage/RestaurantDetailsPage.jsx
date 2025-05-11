import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  FiArrowLeft,
  FiClock,
  FiMapPin,
  FiStar,
  FiPhone,
  FiChevronLeft,
  FiChevronRight
} from 'react-icons/fi';
import './RestaurantDetailsPage.css';

const RestaurantDetailsPage = () => {
  const { id } = useParams();
  const [restaurant, setRestaurant] = useState(null);
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const restaurantRes = await axios.get(`http://localhost:5000/api/restaurants/${id}`);
        const menuRes = await axios.get(`http://localhost:5000/api/menu`, {
          params: { restaurant_id: id }
        });

        if (!restaurantRes.data) {
          throw new Error('Ресторан не найден');
        }

        // Обработка фото: разделяем строку по запятым и удаляем пустые значения
        const photoUrls = restaurantRes.data.photo_url 
          ? restaurantRes.data.photo_url.split(',').map(url => url.trim()).filter(url => url)
          : [];
        
        const rating = parseFloat(restaurantRes.data.rating);
        
        setRestaurant({
          ...restaurantRes.data,
          rating: isNaN(rating) ? null : rating,
          images: [
            ...photoUrls,
            ...(restaurantRes.data.additional_photos || [])
          ].filter(url => url && url.trim() !== '')
        });

        const menuData = Array.isArray(menuRes.data) 
          ? menuRes.data.map(item => ({
              ...item,
              price: parseFloat(item.price) || 0,
              weight: item.weight ? parseInt(item.weight) : null
            }))
          : [];
        
        setMenu(menuData);
        
      } catch (err) {
        console.error('Ошибка загрузки данных:', err);
        setError(err.response?.data?.message || err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const groupByCategory = () => {
    return menu.reduce((acc, item) => {
      const category = item.category || 'Без категории';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {});
  };

  const nextImage = () => {
    setCurrentImageIndex(prev => 
      prev === restaurant.images.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = () => {
    setCurrentImageIndex(prev => 
      prev === 0 ? restaurant.images.length - 1 : prev - 1
    );
  };

  if (loading) return (
    <div className="loading-container">
      <div className="spinner"></div>
      <p>Загрузка данных...</p>
    </div>
  );

  if (error) return (
    <div className="error-container">
      <h2>Ошибка</h2>
      <p>{error}</p>
      <button onClick={() => window.location.reload()} className="retry-button">
        Попробовать снова
      </button>
    </div>
  );

  if (!restaurant) return (
    <div className="not-found-container">
      <h2>Ресторан не найден</h2>
      <button onClick={() => navigate('/restaurants')} className="back-button">
        Вернуться к списку
      </button>
    </div>
  );

  return (
    <div className="restaurant-details-container">
      {/* Шапка ресторана */}
      <div className="restaurant-header">
        <button onClick={() => navigate(-1)} className="back-button">
          <FiArrowLeft size={24} />
        </button>
        
        <div className="restaurant-image-container">
          {restaurant.images.length > 0 && (
            <>
              <img 
                src={restaurant.images[currentImageIndex]} 
                alt={restaurant.name || 'Ресторан'}
                onError={(e) => {
                  e.target.src = '/default-restaurant.jpg';
                  e.target.onerror = null;
                }}
              />
              
              {/* Навигация слайдера */}
              {restaurant.images.length > 1 && (
                <>
                  <button 
                    className="slider-nav-button prev-button" 
                    onClick={prevImage}
                  >
                    <FiChevronLeft size={24} />
                  </button>
                  <button 
                    className="slider-nav-button next-button" 
                    onClick={nextImage}
                  >
                    <FiChevronRight size={24} />
                  </button>
                  
                  {/* Индикаторы слайдера */}
                  <div className="slider-indicators">
                    {restaurant.images.map((_, index) => (
                      <span 
                        key={index}
                        className={`indicator ${index === currentImageIndex ? 'active' : ''}`}
                        onClick={() => setCurrentImageIndex(index)}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
        
        <div className="restaurant-info">
          <h1>{restaurant.name || 'Название не указано'}</h1>
          <div className="rating">
            <FiStar />
            <span>
              {typeof restaurant.rating === 'number' 
                ? restaurant.rating.toFixed(1) 
                : restaurant.rating || 'Новый'}
            </span>
          </div>
        </div>
      </div>

      {/* Контактная информация */}
      <div className="contact-info">
        <div className="info-item">
          <FiMapPin />
          <span>{restaurant.address || 'Адрес не указан'}</span>
        </div>
        <div className="info-item">
          <FiClock />
          <span>{restaurant.working_hours || 'Часы работы не указаны'}</span>
        </div>
        {restaurant.phone && (
          <div className="info-item">
            <FiPhone />
            <a href={`tel:${restaurant.phone}`}>{restaurant.phone}</a>
          </div>
        )}
      </div>

      {/* Описание */}
      {restaurant.description && (
        <div className="description-section">
          <h2>О ресторане</h2>
          <p>{restaurant.description}</p>
        </div>
      )}

      {/* Меню */}
      <div className="menu-section">
        <h2>Меню</h2>
        
        {menu.length === 0 ? (
          <p className="empty-menu">Меню пока не добавлено</p>
        ) : (
          <div className="menu-categories">
            {Object.entries(groupByCategory()).map(([category, items]) => (
              <div key={category} className="category">
                <h3>{category}</h3>
                <div className="dishes-list">
                  {items.map(dish => (
                    <div key={dish.id} className="dish-card">
                      {dish.image_url && (
                        <img 
                          src={dish.image_url} 
                          alt={dish.name}
                          className="dish-image"
                          onError={(e) => {
                            e.target.src = '/default-dish.jpg';
                            e.target.onerror = null;
                          }}
                        />
                      )}
                      <div className="dish-info">
                        <h4>{dish.name}</h4>
                        {dish.description && <p>{dish.description}</p>}
                        <div className="dish-meta">
                          {dish.weight && <span>{dish.weight} г</span>}
                          <span className="price">{dish.price} ₽</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantDetailsPage;