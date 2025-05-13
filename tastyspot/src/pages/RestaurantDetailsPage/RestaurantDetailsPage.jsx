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
  
  // Состояния для данных ресторана
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
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
   
        console.log('Отзывы:', reviewsRes.data);
        setReviews(reviewsRes.data || []);
        
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
    setNewReview({
      rating: review.rating,
      comment: review.comment
    });
    setIsEditing(review.id);
    setIsReviewFormOpen(true);
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      
      if (isEditing) {
        const response = await axios.put(
          `http://localhost:5000/api/reviews/${isEditing}`,
          { 
            restaurant_id: id,
            rating: newReview.rating,
            comment: newReview.comment 
          },
          {
            headers: { 'Authorization': `Bearer ${token}` }
          }
        );
        
        setReviews(reviews.map(review => 
          review.id === isEditing ? response.data : review
        ));
      } else {
        const response = await axios.post(
          `http://localhost:5000/api/reviews`,
          { 
            restaurant_id: id,
            rating: newReview.rating,
            comment: newReview.comment 
          },
          {
            headers: { 'Authorization': `Bearer ${token}` }
          }
        );
        
        setReviews([response.data, ...reviews]);
      }
      
      setNewReview({ rating: 0, comment: '' });
      setIsReviewFormOpen(false);
      setIsEditing(null);
    } catch (err) {
      console.error('Ошибка при отправке отзыва:', err);
      alert(err.response?.data?.error || 'Не удалось отправить отзыв');
    }
  };
  
  const handleDeleteReview = async (reviewId) => {
    if (window.confirm('Вы уверены, что хотите удалить этот отзыв?')) {
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

      {/* Секция отзывов */}
      <div className="reviews-section">
        <div className="reviews-header">
          <h2>Отзывы</h2>
          {user && (
            <button 
              className="add-review-button"
              onClick={() => {
                setNewReview({ rating: 0, comment: '' });
                setIsEditing(null);
                setIsReviewFormOpen(true);
              }}
            >
              Написать отзыв
            </button>
          )}
        </div>

        {isReviewFormOpen && (
          <form onSubmit={handleReviewSubmit} className="review-form">
            <div className="form-group">
              <label>Ваша оценка:</label>
              <StarRating
                rating={newReview.rating}
                onRatingChange={(rating) => setNewReview({...newReview, rating})}
              />
            </div>
            <div className="form-group">
              <label>Комментарий:</label>
              <textarea
                value={newReview.comment}
                onChange={(e) => setNewReview({...newReview, comment: e.target.value})}
                required
                maxLength="500"
                placeholder="Опишите ваши впечатления (максимум 500 символов)"
              />
            </div>
            <div className="form-actions">
              <button 
                type="button" 
                className="cancel-button"
                onClick={() => setIsReviewFormOpen(false)}
              >
                Отмена
              </button>
              <button type="submit" className="submit-button">
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