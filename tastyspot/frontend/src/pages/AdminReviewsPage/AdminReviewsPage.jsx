import { useState, useEffect, useCallback } from 'react'; // Добавил useCallback
import axios from 'axios';
import { FiSearch, FiTrash2, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import './AdminReviewsPage.css';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'; 

const AdminReviewsPage = () => {
  const [reviews, setReviews] = useState([]);
  const [filteredReviews, setFilteredReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
  });

  // Mock данные для тестирования, если API не работает (можно оставить для отладки)
  const mockReviews = [
    {
      id: 1,
      userName: 'Иван Иванов Mock',
      userEmail: 'ivan.mock@example.com',
      rating: 5,
      text: 'Отличный ресторан из mock данных, всем рекомендую!',
      createdAt: '2023-05-15T10:30:00Z',
    },
    {
      id: 2,
      userName: 'Петр Петров Mock',
      userEmail: 'petr.mock@example.com',
      rating: 3,
      text: 'Неплохо из mock, но могло быть и лучше',
      createdAt: '2023-05-16T11:45:00Z',
    },
  ];

  const fetchReviews = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Ошибка авторизации: токен не найден. Пожалуйста, войдите снова.');
        setIsLoading(false); // Важно сбросить isLoading
        // Можно перенаправить на страницу логина
        // history.push('/login'); 
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/api/admin/reviews`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        params: {
          page: pagination.page,
          limit: pagination.limit,
        },
      });

      setReviews(response.data?.reviews || []);
      // Фильтрация будет применена в другом useEffect, который зависит от `reviews`
      setPagination({
        page: response.data?.page || 1,
        limit: response.data?.limit || 10,
        total: response.data?.total || 0,
        pages: response.data?.pages || 1,
      });
    } catch (err) {
      console.error('Ошибка при загрузке отзывов:', err);
      if (err.response) {
        if (err.response.status === 401) {
          setError('Ошибка авторизации. Пожалуйста, войдите снова.');
          // history.push('/login');
        } else if (err.response.status === 403) {
          setError('Доступ запрещен. У вас нет прав для просмотра этой страницы.');
        } else {
          setError(`Ошибка сервера: ${err.response.data?.error || err.message}. Показаны тестовые данные.`);
          setReviews(mockReviews); // Показываем mock только если совсем все плохо
          setPagination({ // И пагинацию для mock
            page: 1,
            limit: 10,
            total: mockReviews.length,
            pages: Math.ceil(mockReviews.length / 10) || 1,
          });
        }
      } else if (err.request) {
        setError('Нет ответа от сервера. Проверьте ваше подключение или попробуйте позже. Показаны тестовые данные.');
        setReviews(mockReviews);
        setPagination({
            page: 1,
            limit: 10,
            total: mockReviews.length,
            pages: Math.ceil(mockReviews.length / 10) || 1,
          });
      } else {
        setError('Произошла ошибка при настройке запроса. Показаны тестовые данные.');
        setReviews(mockReviews);
        setPagination({
            page: 1,
            limit: 10,
            total: mockReviews.length,
            pages: Math.ceil(mockReviews.length / 10) || 1,
          });
      }
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [pagination.page, pagination.limit]); // Зависимости для useCallback

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]); // Вызываем fetchReviews при изменении (включая изменение страницы)

  useEffect(() => {
    // Фильтрация по поисковому запросу
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    const filtered = reviews.filter(
      (review) =>
        (review.text && review.text.toLowerCase().includes(lowercasedSearchTerm)) ||
        (review.userName && review.userName.toLowerCase().includes(lowercasedSearchTerm)) ||
        (review.userEmail && review.userEmail.toLowerCase().includes(lowercasedSearchTerm))
    );
    setFilteredReviews(filtered);
  }, [searchTerm, reviews]); // Зависимость от reviews, чтобы фильтрация применялась после загрузки/обновления

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот отзыв?')) return;

    setIsLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Ошибка авторизации: токен не найден.');
        setIsLoading(false);
        return;
      }
      await axios.delete(`${API_BASE_URL}/api/admin/reviews/${reviewId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // После успешного удаления, обновляем список
      // Если это был последний элемент на странице (и не первая страница),
      // и общее количество элементов уменьшилось так, что текущая страница стала пустой
      const newTotal = pagination.total - 1;
      const newPages = Math.ceil(newTotal / pagination.limit) || 1;

      if (pagination.page > newPages && newPages > 0) {
        // Если текущая страница стала больше максимальной, переходим на последнюю доступную
        setPagination((prev) => ({ ...prev, page: newPages, total: newTotal, pages: newPages }));
        // fetchReviews вызовется из useEffect из-за изменения pagination.page
      } else if (reviews.length === 1 && pagination.page > 1 && newTotal > 0) {
         // Если это был последний отзыв на странице, и это не первая страница
         setPagination((prev) => ({ ...prev, page: prev.page - 1, total: newTotal, pages: newPages }));
      } else {
        // В остальных случаях просто обновляем данные для текущей страницы (или первой, если все удалили)
        setPagination((prev) => ({ ...prev, total: newTotal, pages: newPages }));
        fetchReviews(false); // false, чтобы не было двойного isLoading
      }
      
    } catch (err) {
      console.error('Ошибка при удалении отзыва:', err);
      if (err.response && err.response.data && err.response.data.error) {
        setError(`Ошибка удаления: ${err.response.data.error}`);
      } else if (err.response && err.response.status === 401) {
        setError('Ошибка авторизации при удалении. Пожалуйста, войдите снова.');
      }
      else {
        setError('Не удалось удалить отзыв. Попробуйте снова.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const changePage = (newPage) => {
    if (newPage > 0 && newPage <= pagination.pages && newPage !== pagination.page) {
      setPagination((prevPagination) => ({ ...prevPagination, page: newPage }));
    }
  };

  if (isLoading && !reviews.length) { // Показываем основную загрузку только если нет данных
    return (
      <div className="admin-reviews-container">
        <h1>Управление отзывами</h1>
        <div className="loading">Загрузка отзывов...</div>
      </div>
    );
  }

  return (
    <div className="admin-reviews-container">
      <h1>Управление отзывами</h1>

      {error && <div className="error-alert">{error}</div>}

      <div className="search-box">
        <FiSearch className="search-icon" />
        <input
          type="text"
          placeholder="Поиск по тексту, имени или email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="reviews-stats">
        Всего отзывов: {pagination.total} | Показано на странице: {filteredReviews.length}
      </div>

      {isLoading && reviews.length > 0 && <div className="loading" style={{fontSize: '0.9em', padding: '10px 0'}}>Обновление...</div>}


      <div className="reviews-list">
        {!isLoading && filteredReviews.length === 0 && reviews.length > 0 && searchTerm && (
          <div className="no-results">По вашему запросу "{searchTerm}" ничего не найдено.</div>
        )}
        {!isLoading && reviews.length === 0 && !error && ( // Если нет отзывов вообще (не из-за ошибки)
          <div className="no-results">Отзывов пока нет.</div>
        )}
        {filteredReviews.map((review) => (
          <div key={review.id} className="review-card">
            <div className="review-header">
              <div className="user-info">
                <span className="user-name">{review.userName || 'Аноним'}</span>
                <span className="user-email">{review.userEmail || 'Нет email'}</span>
              </div>
              <div className="review-meta">
                <span className="rating">{'★'.repeat(review.rating || 0)}</span>
                <span className="date">
                  {review.createdAt ? new Date(review.createdAt).toLocaleString() : 'Нет даты'}
                </span>
              </div>
              <div className="review-actions"> {/* Обертка для кнопки */}
                <button
                  onClick={() => handleDeleteReview(review.id)}
                  className="delete-btn"
                  title="Удалить отзыв"
                  disabled={isLoading} // Блокируем кнопку во время других загрузок
                >
                  <FiTrash2 />
                </button>
              </div>
            </div>
            <div className="review-text">{review.text || 'Текст отзыва отсутствует.'}</div>
            {/* Если захотите вернуть отображение adminResponse (и он будет в данных)
            {review.adminResponse && (
              <div className="admin-response">
                <strong>Ответ администратора:</strong> {review.adminResponse}
              </div>
            )}
            */}
          </div>
        ))}
      </div>

      {pagination.pages > 1 && (
        <div className="pagination-controls">
          <button
            onClick={() => changePage(pagination.page - 1)}
            disabled={pagination.page === 1 || isLoading}
          >
            <FiChevronLeft /> Назад
          </button>
          <span>
            Страница {pagination.page} из {pagination.pages}
          </span>
          <button
            onClick={() => changePage(pagination.page + 1)}
            disabled={pagination.page === pagination.pages || isLoading}
          >
            Вперед <FiChevronRight />
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminReviewsPage;