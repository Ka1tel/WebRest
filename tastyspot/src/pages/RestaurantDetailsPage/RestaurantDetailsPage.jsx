import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { 
  FiArrowLeft,
  FiClock,
  FiMapPin,
  FiStar,
  FiPhone,
  FiChevronLeft,
  FiChevronRight,
  FiEdit2,
  FiTrash2,
  FiUser
} from 'react-icons/fi';
import './RestaurantDetailsPage.css';

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

const RestaurantDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [restaurant, setRestaurant] = useState(null);
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState({ rating: 0, comment: '' });
  const [isReviewFormOpen, setIsReviewFormOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(null);

  // Проверяем авторизацию (без редиректа)
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Загружаем данные ресторана без проверки авторизации
        const [restaurantRes, menuRes, reviewsRes] = await Promise.all([
          axios.get(`http://localhost:5000/api/restaurants/${id}`),
          axios.get(`http://localhost:5000/api/menu`, {
            params: { restaurant_id: id }
          }),
          axios.get(`http://localhost:5000/api/reviews`, {
            params: { restaurant_id: id }
          })
        ]);

        if (restaurantRes.data) {
          const restaurantData = {
            ...restaurantRes.data,
            images: restaurantRes.data.photo_url 
              ? restaurantRes.data.photo_url.split(',').map(url => url.trim()) 
              : []
          };
          setRestaurant(restaurantData);
        } else {
          setError('Ресторан не найден');
        }

        setMenu(menuRes.data || []);
        setReviews(reviewsRes.data || []);
        
        // Проверяем авторизацию после загрузки данных
        checkAuth();
        
      } catch (err) {
        console.error('Ошибка загрузки данных:', err);
        if (err.response?.status === 404) {
          setError('Ресторан не найден');
        } else {
          setError(err.response?.data?.message || err.message || 'Произошла ошибка');
        }
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

    setNewReview({
      rating: review.rating,
      comment: review.comment
    });
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
  
    // Валидация данных
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
      let updatedReviews = [...reviews];
      
      if (isEditing) {
        // Редактирование существующего отзыва
        const response = await axios.put(
          `http://localhost:5000/api/reviews/${isEditing}`,
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
  
        // Обновляем отзыв в списке
        updatedReviews = updatedReviews.map(review => 
          review.id === isEditing ? {
            ...response.data,
            username: user.username,
            user_id: user.id
          } : review
        );
      } else {
        // Создание нового отзыва
        const response = await axios.post(
          `http://localhost:5000/api/reviews`,
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
  
        // Добавляем новый отзыв в начало списка
        updatedReviews = [{
          ...response.data,
          username: user.username,
          user_id: user.id
        }, ...updatedReviews];
      }
  
      setReviews(updatedReviews);
      setNewReview({ rating: 0, comment: '' });
      setIsReviewFormOpen(false);
      setIsEditing(null);
      
    } catch (err) {
      console.error('Ошибка при отправке отзыва:', err);
      const errorMessage = err.response?.data?.error || 
                          err.message || 
                          'Не удалось отправить отзыв';
      alert(errorMessage);
      
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        setUser(null);
        navigate('/login');
      }
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
        `http://localhost:5000/api/reviews/${reviewId}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
          data: { restaurant_id: id }
        }
      );
      
      setReviews(reviews.filter(review => review.id !== reviewId));
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
        {restaurant.phone && (
          <div className="info-item">
            <FiPhone />
            <a href={`tel:${restaurant.phone}`}>{restaurant.phone}</a>
          </div>
        )}
      </div>

      {restaurant.description && (
        <div className="description-section">
          <h2>О ресторане</h2>
          <p>{restaurant.description}</p>
        </div>
      )}

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
              <div key={review.id} className="review-card">
                <div className="review-header">
                  <div className="user-info">
                    <div className="user-avatar">
                      {review.username?.charAt(0).toUpperCase() || <FiUser />}
                    </div>
                    <div>
                      <h4>{review.username || 'Анонимный пользователь'}</h4>
                      <span className="review-date">
                        {new Date(review.created_at).toLocaleDateString('ru-RU', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                  <StarRating rating={review.rating} readOnly />
                </div>
                <p className="review-comment">{review.comment}</p>
                {user && user.id === review.user_id && (
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