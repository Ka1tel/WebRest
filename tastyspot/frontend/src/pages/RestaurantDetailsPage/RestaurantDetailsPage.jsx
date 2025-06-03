import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { 
  FiArrowLeft, FiClock, FiMapPin, FiStar, FiPhone, 
  FiChevronLeft, FiChevronRight, FiEdit2, FiTrash2,
  FiUser, FiThumbsUp, FiThumbsDown, FiMessageSquare, FiSend
} from 'react-icons/fi';
import './RestaurantDetailsPage.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'; 

const StarRating = ({ rating, onRatingChange, readOnly = false }) => {
  const handleClick = (newRating) => {
    if (!readOnly && onRatingChange) {
      onRatingChange(newRating);
    }
  };

  return (
    <div className={`star-rating ${readOnly ? 'read-only' : ''}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`star ${star <= rating ? 'filled' : ''}`}
          onClick={() => handleClick(star)}
        >
          <FiStar />
        </span>
      ))}
    </div>
  );
};

const formatDate = (dateString) => {
  if (!dateString) return 'Дата не указана';
  try {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return 'Неверный формат даты';
  }
};

const RestaurantDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Состояния для загрузки данных
  const [replying, setReplying] = useState(false);
  const [restaurant, setRestaurant] = useState(null);
  const [menu, setMenu] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Состояния для управления UI
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isReviewFormOpen, setIsReviewFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [newReview, setNewReview] = useState({ rating: 0, comment: '' });
  const [loadingVote, setLoadingVote] = useState(false);
  const [user, setUser] = useState(null);

  const [userVotes, setUserVotes] = useState(() => {
    const saved = localStorage.getItem('userVotes');
    return saved ? JSON.parse(saved) : {};
  });

  // Проверка авторизации пользователя
  const checkAuth = () => {
    const token = localStorage.getItem('token');
    if (!token) return false;

    try {
      const decoded = jwtDecode(token);
      if (decoded.exp * 1000 < Date.now()) {
        localStorage.removeItem('token');
        return false;
      }

      setUser({
        id: decoded.userId,
        username: decoded.username,
        email: decoded.email
      });
      return true;
    } catch (err) {
      localStorage.removeItem('token');
      return false;
    }
  };
  const updateRestaurantRating = async (restaurantId) => {
    try {
      // Рассчитываем средний рейтинг для ресторана
      const avgRatingResult = await pool.query(
        `SELECT AVG(rating) as average_rating
         FROM reviews
         WHERE restaurant_id = $1`,
        [restaurantId]
      );
  
      let newRating = 0; // Значение по умолчанию, если нет отзывов
      if (avgRatingResult.rows.length > 0 && avgRatingResult.rows[0].average_rating !== null) {
        // Округляем до одного знака после запятой (или как вам нужно)
        newRating = parseFloat(avgRatingResult.rows[0].average_rating).toFixed(1);
      }
  
      // Обновляем рейтинг в таблице restaurants
      await pool.query(
        `UPDATE restaurants
         SET rating = $1, updated_at = NOW()
         WHERE id = $2`,
        [newRating, restaurantId]
      );
  
      console.log(`Рейтинг для ресторана ${restaurantId} обновлен на: ${newRating}`);
      return newRating; // Возвращаем новый рейтинг, если нужно
    } catch (error) {
      console.error(`Ошибка при обновлении рейтинга для ресторана ${restaurantId}:`, error);
      // Здесь можно добавить более сложную обработку ошибок, если требуется
    }
  };
  // Загрузка данных ресторана
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const [restaurantRes, menuRes, reviewsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/restaurants/${id}`),
          axios.get(`${API_BASE_URL}/api/menu`, { params: { restaurant_id: id } }),
          axios.get(`${API_BASE_URL}/api/reviews`, { params: { restaurant_id: id } })
        ]);
        console.log('Restaurant data:', restaurantRes.data);
        if (restaurantRes.data) {
          setRestaurant({
            
            ...restaurantRes.data,
            images: restaurantRes.data.photo_url?.split(',').map(url => url.trim()) || [],
            phone: restaurantRes.data.phone || null
          });
        } else {
          setError('Ресторан не найден');
        }
  
        setMenu(menuRes.data || []);
        
        // Загружаем сохраненные голоса из localStorage
        const savedVotes = JSON.parse(localStorage.getItem('userVotes') || '{}');
        
        // Обновляем отзывы с информацией о голосах
        setReviews((reviewsRes.data || []).map(review => ({
          ...review,
          user_vote: savedVotes[review.id] || null
        })));
  
        checkAuth();
      } catch (err) {
        console.error('Ошибка загрузки данных:', err);
        setError(err.response?.status === 404 
          ? 'Ресторан не найден' 
          : err.response?.data?.message || err.message || 'Произошла ошибка');
      } finally {
        setLoading(false);
      }
    };
  
    fetchData();
  }, [id]);

  const formatDate = (dateString) => {
    if (!dateString) return 'Дата не указана';
    try {
      return new Date(dateString).toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Неверный формат даты';
    }
  };

  // Инициализация карты
  useEffect(() => {
    if (!restaurant?.address) return;
  
    let isMounted = true;
    let mapInstance = null;
    let script = null;
  
    const initMap = () => {
      if (!window.ymaps || !window.ymaps.Map) {
        console.error('API Яндекс.Карт не загружено корректно');
        return;
      }
  
      try {
        mapInstance = new window.ymaps.Map('yandex-map', {
          center: [53.902284, 27.561831],
          zoom: 12,
          controls: ['zoomControl']
        });
  
        const tempPlacemark = new window.ymaps.Placemark(
          [53.902284, 27.561831],
          { hintContent: 'Идет поиск адреса...', balloonContent: restaurant.address },
          { preset: 'islands#grayDotIcon' }
        );
        mapInstance.geoObjects.add(tempPlacemark);
  
        window.ymaps.geocode(restaurant.address, { results: 1 })
          .then(res => {
            if (!isMounted || !mapInstance) return;
            const firstGeoObject = res.geoObjects.get(0);
            
            if (!firstGeoObject) throw new Error('Адрес не найден');
            
            const coords = firstGeoObject.geometry.getCoordinates();
            mapInstance.geoObjects.removeAll();
            
            const placemark = new window.ymaps.Placemark(
              coords,
              { hintContent: restaurant.name, balloonContent: restaurant.address },
              { preset: 'islands#redIcon' }
            );
            
            mapInstance.geoObjects.add(placemark);
            mapInstance.setCenter(coords, 15);
          })
          .catch(error => {
            console.error('Ошибка геокодирования:', error);
            if (!isMounted || !mapInstance) return;
            
            mapInstance.geoObjects.removeAll();
            const errorPlacemark = new window.ymaps.Placemark(
              [53.902284, 27.561831],
              { 
                hintContent: 'Адрес не найден',
                balloonContent: `Не удалось найти: ${restaurant.address}`
              },
              { preset: 'islands#redDotIcon' }
            );
            mapInstance.geoObjects.add(errorPlacemark);
          });
      } catch (error) {
        console.error('Ошибка создания карты:', error);
      }
    };
  
    const checkApiLoaded = () => {
      if (window.ymaps && window.ymaps.Map) {
        initMap();
      } else {
        const checkInterval = setInterval(() => {
          if (window.ymaps && window.ymaps.Map) {
            clearInterval(checkInterval);
            if (isMounted) initMap();
          }
        }, 100);
      }
    };
  
    if (!window.ymaps) {
      script = document.createElement('script');
      script.src = `https://api-maps.yandex.ru/2.1/?apikey=bbaaf96a-e8f7-4897-8ace-d6791f94450e&lang=ru_RU`;
      script.async = true;
      
      script.onload = () => {
        if (isMounted) window.ymaps.ready(checkApiLoaded);
      };
      
      script.onerror = () => {
        console.error('Ошибка загрузки API Яндекс.Карт');
        const mapContainer = document.getElementById('yandex-map');
        if (mapContainer && isMounted) {
          mapContainer.innerHTML = '<div class="map-error">Не удалось загрузить карту</div>';
        }
      };
  
      document.head.appendChild(script);
    } else {
      checkApiLoaded();
    }
  
    return () => {
      isMounted = false;
      if (mapInstance) {
        try {
          mapInstance.destroy();
        } catch (e) {
          console.warn('Ошибка при удалении карты:', e);
        }
      }
      if (script?.parentNode) {
        document.head.removeChild(script);
      }
    };
  }, [restaurant?.address]);

  // Группировка меню по категориям
  const groupByCategory = () => {
    return menu.reduce((acc, item) => {
      const category = item.category || 'Без категории';
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    }, {});
  };

  // Навигация по изображениям
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

  // Управление отзывами
  const handleEditReview = (review) => {
    if (!user) {
      alert('Для редактирования отзыва необходимо авторизоваться');
      navigate('/login', { state: { from: location.pathname } });
      return;
    }

    if (user.id !== review.user_id) {
      alert('Вы можете редактировать только свои отзывы');
      return;
    }

    setNewReview({ rating: review.rating, comment: review.comment });
    setIsEditing(review.id);
    setIsReviewFormOpen(true);
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      alert('Для отправки отзыва необходимо авторизоваться');
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
  
    if (newReview.rating < 1 || newReview.rating > 5) {
      alert('Оценка должна быть от 1 до 5 звезд');
      return;
    }
  
    if (!newReview.comment.trim() || newReview.comment.trim().length < 10) {
      alert('Комментарий должен содержать минимум 10 символов');
      return;
    }
  
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/api/reviews`,
        { 
          restaurant_id: id,
          rating: newReview.rating,
          comment: newReview.comment.trim()
        },
        {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
  
      // Добавляем новый отзыв с начальными значениями
      const newReviewWithDefaults = {
        ...response.data,
        username: user.username,
        user_id: user.id,
        likes: 0,
        dislikes: 0,
        user_vote: null
      };
  
      setReviews(prev => [newReviewWithDefaults, ...prev]);
      setNewReview({ rating: 0, comment: '' });
      setIsReviewFormOpen(false);
      
    } catch (err) {
      console.error('Ошибка при отправке отзыва:', err);
      alert(err.response?.data?.message || 'Не удалось отправить отзыв');
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот отзыв?')) return;
    
    if (!user) {
      alert('Для удаления отзыва необходимо авторизоваться');
      navigate('/login', { state: { from: location.pathname } });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${API_BASE_URL}/api/reviews/${reviewId}`,
        { headers: { 'Authorization': `Bearer ${token}` }, data: { restaurant_id: id } }
      );
      
      setReviews(prevReviews => prevReviews.filter(review => review.id !== reviewId));
    } catch (err) {
      console.error('Ошибка при удалении отзыва:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        setUser(null);
        navigate('/login');
      } else {
        alert('Не удалось удалить отзыв');
      }
    }
  };

  // Голосование за отзывы
  const handleVote = async (reviewId, voteType) => {
    if (!user) {
      alert('Для оценки отзывов необходимо авторизоваться');
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
  
    setLoadingVote(true);
  
    try {
      // 1. Получаем текущие голоса
      const savedVotes = JSON.parse(localStorage.getItem('userVotes') || '{}');
      const currentVote = savedVotes[reviewId];
  
      // 2. Определяем новое состояние
      let newVote = null;
      if (currentVote !== voteType) {
        newVote = voteType;
      }
  
      // 3. Обновляем локальное хранилище
      const newVotes = { ...savedVotes, [reviewId]: newVote };
      localStorage.setItem('userVotes', JSON.stringify(newVotes));
  
      // 4. Оптимистичное обновление UI
      setReviews(prev => prev.map(review => {
        if (review.id !== reviewId) return review;
        
        let likes = review.likes;
        let dislikes = review.dislikes;
  
        if (currentVote === 'like') likes--;
        if (currentVote === 'dislike') dislikes--;
        if (newVote === 'like') likes++;
        if (newVote === 'dislike') dislikes++;
  
        return {
          ...review,
          likes,
          dislikes,
          user_vote: newVote
        };
      }));
  
      // 5. Отправка на сервер
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE_URL}/api/reviews/${reviewId}/vote`,
        { vote_type: voteType },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
  
    } catch (err) {
      console.error('Ошибка при оценке отзыва:', err);
      // Откатываем изменения
      const savedVotes = JSON.parse(localStorage.getItem('userVotes') || '{}');
      const { [reviewId]: _, ...rest } = savedVotes;
      localStorage.setItem('userVotes', JSON.stringify(rest));
  
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        setUser(null);
        navigate('/login');
      }
    } finally {
      setLoadingVote(false);
    }
  };
  
  const handleReplySubmit = async (reviewId) => {
    if (!replyText.trim() || !user) return;
  
    setReplying(true); // Показываем статус загрузки
  
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/api/reviews/${reviewId}/replies`,
        { 
          text: replyText.trim(),
          user_id: user.id // Отправляем ID пользователя
        },
        { 
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );
  
      // Если сервер не возвращает ID, генерируем его локально
      const serverReply = response.data || {};
      const replyWithId = {
        id: serverReply.id || `temp-${Date.now()}`, // Локальный ID если сервер не вернул
        text: serverReply.text || replyText.trim(),
        user_id: serverReply.user_id || user.id,
        username: user.username, // Берем из локальных данных
        created_at: serverReply.created_at || new Date().toISOString()
      };
  
      // Обновляем состояние
      setReviews(prev => prev.map(review => 
        review.id === reviewId
          ? { ...review, replies: [...(review.replies || []), replyWithId] }
          : review
      ));
  
      setReplyText('');
      setReplyingTo(null);
  
    } catch (err) {
      console.error('Ошибка отправки:', err);
      alert(err.response?.data?.message || 'Ошибка при отправке ответа');
    } finally {
      setReplying(false);
    }
  };
  
  // Вспомогательная функция для форматирования даты
  const formatServerDate = (dateString) => {
    try {
      return new Date(dateString).toISOString(); // Или другой нужный формат
    } catch {
      return new Date().toISOString(); // Fallback на текущую дату
    }
  };

  const handleDeleteReply = async (reviewId, replyId) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот ответ?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${API_BASE_URL}/api/reviews/${reviewId}/replies/${replyId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      setReviews(prevReviews => prevReviews.map(review => {
        if (review.id !== reviewId) return review;
        return {
          ...review,
          replies: (review.replies || []).filter(reply => reply.id !== replyId)
        };
      }));
    } catch (err) {
      console.error('Ошибка при удалении ответа:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        setUser(null);
        navigate('/login');
      } else {
        alert('Не удалось удалить ответ');
      }
    }
  };

  // Состояния загрузки и ошибок
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

  // Основной рендеринг
  return (
    <div className="restaurant-details-container">
      <div className="restaurant-header">
        <button onClick={() => navigate(-1)} className="back-button">
          <FiArrowLeft size={24} />
        </button>
        
        <div className="restaurant-image-container">
          {restaurant.images.length > 0 ? (
            <>
              <img 
                src={restaurant.images[currentImageIndex]} 
                alt={restaurant.name || 'Ресторан'}
                onError={(e) => {
                  e.target.src = '/default-restaurant.jpg';
                  e.target.onerror = null;
                }}
              />
              
              {restaurant.images.length > 1 && (
                <>
                  <button className="slider-nav-button prev-button" onClick={prevImage}>
                    <FiChevronLeft size={24} />
                  </button>
                  <button className="slider-nav-button next-button" onClick={nextImage}>
                    <FiChevronRight size={24} />
                  </button>
                  
                  <div className="slider-indicators">
                    {restaurant.images.map((_, index) => (
                      <span 
                        key={`indicator-${index}`}
                        className={`indicator ${index === currentImageIndex ? 'active' : ''}`}
                        onClick={() => setCurrentImageIndex(index)}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <img 
              src="/default-restaurant.jpg" 
              alt={restaurant.name || 'Ресторан'}
              className="default-restaurant-image"
            />
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
      
      <div className="contact-info">
        <div className="info-item">
          <FiMapPin />
          <span>{restaurant.address || 'Адрес не указан'}</span>
        </div>
        <div className="info-item">
          <FiClock />
          <span>{restaurant.working_hours || 'Часы работы не указаны'}</span>
        </div>
        {restaurant.phone ? (
  <div className="info-item">
    <FiPhone className="info-icon" />
    <a href={`tel:${restaurant.phone.replace(/\D/g, '')}`} className="phone-link">
      {restaurant.phone}
    </a>
  </div>
) : (
  <div className="info-item">
    <FiPhone className="info-icon" />
    <span>Телефон не указан</span>
  </div>
)}
      </div>

      {restaurant.description && (
  <div className="about-section">
    <div className="section-header">
      <h2 className="section-title">О нас</h2>
    </div>
    <div className="about-content">
      <p className="description-text">{restaurant.description}</p>
      <div className="restaurant-details">
        {restaurant.establishment_type && (
          <div className="detail-item">
            <span className="detail-label">Тип заведения:</span>
            <span className="detail-value">{restaurant.establishment_type}</span>
          </div>
        )}
        {restaurant.cuisine_type && (
          <div className="detail-item">
            <span className="detail-label">Кухня:</span>
            <span className="detail-value">{restaurant.cuisine_type}</span>
          </div>
        )}
        {restaurant.average_check && (
          <div className="detail-item">
            <span className="detail-label">Средний чек:</span>
            <span className="detail-value">{restaurant.average_check} ₽</span>
          </div>
        )}
      </div>
    </div>
  </div>
)}

      <div className="menu-section">
        <h2>Меню</h2>
        
        {menu.length === 0 ? (
          <p className="empty-menu">Меню пока не добавлено</p>
        ) : (
          <div className="menu-categories">
            {Object.entries(groupByCategory()).map(([category, items]) => (
              <div key={`category-${category}`} className="category">
                <h3>{category}</h3>
                <div className="dishes-list">
                  {items.map(dish => (
                    <div key={`dish-${dish.id}`} className="dish-card">
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

      {restaurant.address && (
        <div className="map-section">
          <h2>Расположение</h2>
          <div className="map-wrapper">
            <div id="yandex-map"></div>
          </div>
        </div>
      )}

      <div className="reviews-section">
        <div className="reviews-header">
          <h2>Отзывы</h2>
          <button 
            className="add-review-button"
            onClick={() => {
              if (!user) {
                alert('Для добавления отзыва необходимо авторизоваться');
                navigate('/login', { state: { from: location.pathname } });
                return;
              }
              setNewReview({ rating: 0, comment: '' });
              setIsEditing(null);
              setIsReviewFormOpen(true);
            }}
          >
            Написать отзыв
          </button>
        </div>

        {isReviewFormOpen && (
          <form onSubmit={handleReviewSubmit} className="review-form">
            <div className="form-group">
              <label>Ваша оценка:</label>
              <StarRating
                rating={newReview.rating}
                onRatingChange={(rating) => setNewReview({...newReview, rating})}
              />
              {newReview.rating === 0 && (
                <p className="validation-error">Пожалуйста, поставьте оценку</p>
              )}
            </div>
            <div className="form-group">
              <label>Комментарий:</label>
              <textarea
                value={newReview.comment}
                onChange={(e) => setNewReview({...newReview, comment: e.target.value})}
                required
                minLength="10"
                maxLength="500"
                placeholder="Опишите ваши впечатления (от 10 до 500 символов)"
              />
              {newReview.comment.length < 10 && (
                <p className="validation-error">
                  Комментарий должен содержать минимум 10 символов
                </p>
              )}
            </div>
            <div className="form-actions">
              <button 
                type="button" 
                className="cancel-button"
                onClick={() => {
                  setIsReviewFormOpen(false);
                  setIsEditing(null);
                }}
              >
                Отмена
              </button>
              <button 
                type="submit" 
                className="submit-button"
                disabled={newReview.rating === 0 || newReview.comment.length < 10}
              >
                {isEditing ? 'Обновить отзыв' : 'Отправить'}
              </button>
            </div>
          </form>
        )}

        {reviews.length === 0 ? (
          <p className="no-reviews">Пока нет отзывов. Будьте первым!</p>
        ) : (
          <div className="reviews-list">
            {reviews.map(review => (
              <div key={`review-${review.id}`} className="review-card">
                <div className="review-header">
                  <div className="user-info">
                    <div className="user-avatar">
                      {review.username?.charAt(0).toUpperCase() || <FiUser />}
                    </div>
                    <div>
                      <h4>{review.username || 'Анонимный пользователь'}</h4>
                      <span className="review-date">{formatDate(review.created_at)}</span>
                    </div>
                  </div>
                  <StarRating rating={review.rating} readOnly />
                </div>
                <p className="review-comment">{review.comment}</p>
                
                <div className="review-votes">
                  <button 
                    className={`vote-button like ${review.user_vote === 'like' ? 'active' : ''}`}
                    onClick={() => handleVote(review.id, 'like')}
                    title="Нравится"
                    disabled={loadingVote}
                  >
                    <FiThumbsUp />
                    <span>{review.likes || 0}</span>
                  </button>
                  <button 
                    className={`vote-button dislike ${review.user_vote === 'dislike' ? 'active' : ''}`}
                    onClick={() => handleVote(review.id, 'dislike')}
                    title="Не нравится"
                    disabled={loadingVote}
                  >
                    <FiThumbsDown />
                    <span>{review.dislikes || 0}</span>
                  </button>
                  
                  <button 
                    className="reply-button"
                    onClick={() => setReplyingTo(replyingTo === review.id ? null : review.id)}
                  >
                    <FiMessageSquare /> Ответить
                  </button>
                </div>
                
                {replyingTo === review.id && (
                  <div className="reply-form">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Напишите ваш ответ..."
                      rows="3"
                    />
                    <div className="reply-actions">
                      <button 
                        className="cancel-reply"
                        onClick={() => {
                          setReplyText('');
                          setReplyingTo(null);
                        }}
                      >
                        Отмена
                      </button>
                      <button
    onClick={() => handleReplySubmit(review.id)}
    disabled={!replyText.trim() || replying}
    className="send-reply"
  >
    {replying ? (
      <>
        <span className="spinner"></span> Отправка...
      </>
    ) : (
      <>
        <FiSend /> Отправить
      </>
    )}
  </button>
                    </div>
                  </div>
                )}
                
                {review.replies?.length > 0 && (
                  <div className="replies-list">
                    {review.replies.map(reply => (
                      <div key={`reply-${reply.id}`} className="reply-card">
                        <div className="reply-header">
                          <div className="user-avatar small">
                            {reply.username?.charAt(0).toUpperCase() || <FiUser size={12} />}
                          </div>
                          <h5>{reply.username || 'Аноним'}</h5>
                          <span className="reply-date">{formatDate(reply.created_at)}</span>
                          {user?.id === reply.user_id && (
                            <button 
                              className="delete-reply-button"
                              onClick={() => handleDeleteReply(review.id, reply.id)}
                            >
                              <FiTrash2 size={14} />
                            </button>
                          )}
                        </div>
                        <p className="reply-text">{reply.text}</p>
                      </div>
                    ))}
                  </div>
                )}
                
                {user?.id === review.user_id && (
                  <div className="review-actions">
                    <button 
                      className="edit-button"
                      onClick={() => handleEditReview(review)}
                    >
                      <FiEdit2 />
                    </button>
                    <button 
                      className="delete-button"
                      onClick={() => handleDeleteReview(review.id)}
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantDetailsPage;