import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    FiUser, FiMail, FiLock, FiCheckCircle, FiAlertCircle,
    FiEdit, FiSave, FiX, FiShield, FiClock, FiMessageSquare, FiStar,
    FiChevronLeft, FiChevronRight, FiTrash2
} from 'react-icons/fi';
import axios from 'axios';
import './ProfilePage.css'; // Убедитесь, что CSS файл существует и настроен


const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'; 

const ProfilePage = () => {
    const navigate = useNavigate();
    const [profile, setProfile] = useState({
        username: '', email: '', isVerified: false, isAdmin: false, createdAt: '',
    });
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState({
        username: '', email: '', currentPassword: '', newPassword: '',
    });
    const [emailChange, setEmailChange] = useState({
        mode: false, newEmail: '', verificationCode: '',
    });

    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    const [userReviews, setUserReviews] = useState([]);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [reviewsError, setReviewsError] = useState(null);
    const [reviewsPagination, setReviewsPagination] = useState({
        page: 1, limit: 3, total: 0, pages: 1,
    });

    const [userReplies, setUserReplies] = useState([]);
    const [repliesLoading, setRepliesLoading] = useState(false);
    const [repliesError, setRepliesError] = useState(null);
    const [repliesPagination, setRepliesPagination] = useState({
        page: 1, limit: 3, total: 0, pages: 1,
    });
    const [currentUserId, setCurrentUserId] = useState(null);

    // --- Загрузка данных ---
    const fetchProfile = useCallback(async () => {
        setIsLoading(true); setError(null); setSuccessMessage(null);
        try {
            const token = localStorage.getItem('token');
            if (!token) { navigate('/login'); return; }
            let userIdFromToken;
            try {
                const decodedToken = JSON.parse(atob(token.split('.')[1]));
                userIdFromToken = decodedToken.userId;
            } catch (e) { localStorage.removeItem('token'); navigate('/login'); return; }
            if (!userIdFromToken) { localStorage.removeItem('token'); navigate('/login'); return; }
            setCurrentUserId(userIdFromToken);

            const response = await axios.get(`${API_BASE_URL}/api/users/profile/${userIdFromToken}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setProfile({
                username: response.data.username || 'N/A', email: response.data.email || 'N/A',
                isVerified: response.data.isVerified ?? false, isAdmin: response.data.isAdmin ?? false,
                createdAt: response.data.createdAt,
            });
            setFormData({ // Инициализируем formData для режима редактирования
                username: response.data.username || '', email: response.data.email || '',
                currentPassword: '', newPassword: '',
            });
        } catch (err) {
            if (err.response?.status === 401 || err.response?.status === 403) {
                localStorage.removeItem('token'); navigate('/login');
            } else { setError(err.response?.data?.error || err.message || 'Не удалось загрузить профиль'); }
        } finally { setIsLoading(false); }
    }, [navigate]);

    const fetchUserActivity = useCallback(async (type, userId, paginationState, setData, setLoading, setErrorState, setPaginationState) => {
        if (!userId) return;
        setLoading(true); setErrorState(null);
        const endpoint = type === 'reviews' ? `/api/users/${userId}/reviews` : `/api/users/${userId}/replies`;
        try {
            const token = localStorage.getItem('token');
            if (!token) { setErrorState("Токен не найден."); setLoading(false); return; }
            const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
                headers: { Authorization: `Bearer ${token}` },
                params: { page: paginationState.page, limit: paginationState.limit },
            });
            setData(response.data[type] || []); // Используем response.data.reviews или response.data.replies
            setPaginationState(prev => ({
                ...prev, total: response.data.total || 0, pages: response.data.pages || 1,
            }));
        } catch (err) {
            setErrorState(err.response?.data?.error || err.message || `Не удалось загрузить ${type === 'reviews' ? 'отзывы' : 'ответы'}`);
        } finally { setLoading(false); }
    }, []); // Пустой массив зависимостей, т.к. все зависимости передаются как аргументы

    useEffect(() => { fetchProfile(); }, [fetchProfile]);

    useEffect(() => {
        if (currentUserId) {
            fetchUserActivity('reviews', currentUserId, reviewsPagination, setUserReviews, setReviewsLoading, setReviewsError, setReviewsPagination);
        }
    }, [currentUserId, reviewsPagination.page, reviewsPagination.limit, fetchUserActivity]);

    useEffect(() => {
        if (currentUserId) {
            fetchUserActivity('replies', currentUserId, repliesPagination, setUserReplies, setRepliesLoading, setRepliesError, setRepliesPagination);
        }
    }, [currentUserId, repliesPagination.page, repliesPagination.limit, fetchUserActivity]);

    // --- Обработчики UI ---
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setError(null); setSuccessMessage(null);
    };

    const handleEmailCodeChange = (e) => {
        setEmailChange(prev => ({ ...prev, verificationCode: e.target.value }));
        setError(null); setSuccessMessage(null);
    };

    const toggleEditMode = () => {
        if (!editMode) {
            setFormData({ // Сбрасываем formData на текущие значения профиля при входе в режим редактирования
                username: profile.username,
                email: profile.email,
                currentPassword: '', newPassword: '',
            });
            setEmailChange({ mode: false, newEmail: profile.email, verificationCode: '' });
        }
        setEditMode(!editMode); setError(null); setSuccessMessage(null);
    };

    // --- Операции с профилем ---
    const handleSaveProfile = async () => {
        const hasUsernameChanged = formData.username !== profile.username;
        const hasNewPassword = !!formData.newPassword;
    
        if (!hasUsernameChanged && !hasNewPassword) {
          setSuccessMessage('Нет данных для обновления (имя пользователя или новый пароль не изменены).');
          setTimeout(() => setSuccessMessage(null), 3000);
          if (formData.email === profile.email && !emailChange.mode) { // Если и email не менялся, выходим из editMode
            setEditMode(false);
          }
          return;
        }
        
        if (!formData.currentPassword) {
          setError('Для сохранения изменений необходимо ввести текущий пароль.');
          return;
        }
    
        const dataToSave = {
          password: formData.currentPassword, // Отправляем как 'password'
        };
        if (hasUsernameChanged) {
          dataToSave.username = formData.username;
        }
        if (hasNewPassword) {
          // Можно добавить валидацию нового пароля на фронтенде (например, длина)
          if (formData.newPassword.length < 6) {
              setError('Новый пароль должен содержать не менее 6 символов.');
              setIsSubmitting(false);
              return;
          }
          dataToSave.newPassword = formData.newPassword;
        }
    
        setIsSubmitting(true); setError(null); setSuccessMessage(null);
        try {
          const token = localStorage.getItem('token');
          const response = await axios.put(`${API_BASE_URL}/api/users/profile`, dataToSave, {
            headers: { Authorization: `Bearer ${token}` },
          });
    
          setProfile((prev) => ({ 
            ...prev, 
            username: response.data.username || prev.username // Обновляем имя из ответа сервера
          }));
          setFormData(prev => ({...prev, currentPassword: '', newPassword: ''})); // Очищаем поля паролей
    
          setSuccessMessage('Профиль успешно обновлен!');
          setTimeout(() => setSuccessMessage(null), 3000);
          // Выходим из режима редактирования, если email не находится в процессе смены
          if (formData.email === profile.email || !emailChange.mode) { 
            setEditMode(false);
          }
        } catch (err) {
          setError(err.response?.data?.error || 'Ошибка при сохранении профиля');
        } finally { setIsSubmitting(false); }
      };

      const requestEmailChange = async () => {
        if (formData.email === profile.email) {
          setError('Новый email совпадает с текущим.'); return;
        }
        if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            setError('Введите корректный новый email.'); return;
        }
    
        setIsSubmitting(true); setError(null); setSuccessMessage(null);
        try {
          const token = localStorage.getItem('token');
          await axios.post(`${API_BASE_URL}/api/users/request-email-change`,
            { newEmail: formData.email }, 
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setEmailChange({ mode: true, newEmail: formData.email, verificationCode: '' });
          setSuccessMessage(`Код подтверждения отправлен на ${formData.email}.`);
          setTimeout(() => setSuccessMessage(null), 4000);
        } catch (err) {
          setError(err.response?.data?.error || 'Ошибка при запросе смены email');
        } finally { setIsSubmitting(false); }
      };

      const verifyEmailChange = async () => {
        if (!emailChange.verificationCode) {
          setError('Введите код подтверждения.'); return;
        }
        setIsSubmitting(true); setError(null); setSuccessMessage(null);
        try {
          const token = localStorage.getItem('token');
          // Бэкенд вернет newEmail в ответе при успехе
          const response = await axios.post(`${API_BASE_URL}/api/users/verify-email-change`,
            { newEmail: emailChange.newEmail, verificationCode: emailChange.verificationCode },
            { headers: { Authorization: `Bearer ${token}` } }
          );
    
          setProfile((prev) => ({
            ...prev,
            email: response.data.newEmail || emailChange.newEmail, // Используем email из ответа бэка
            isVerified: true,
          }));
          setFormData(prev => ({...prev, email: response.data.newEmail || emailChange.newEmail})); // Обновляем и formData
          
          setSuccessMessage('Email успешно изменен и подтвержден!');
          setTimeout(() => setSuccessMessage(null), 3000);
          setEmailChange({ mode: false, newEmail: '', verificationCode: '' });
          setEditMode(false); // После успешной смены email выходим из режима редактирования
        } catch (err) {
          setError(err.response?.data?.error || 'Неверный код или истек срок действия');
        } finally { setIsSubmitting(false); }
      };

    // --- Удаление контента ---
    const handleDeleteContent = async (type, id, contextId = null) => {
        const confirmMessage = type === 'review' ? 'Вы уверены, что хотите удалить этот отзыв?' : 'Вы уверены, что хотите удалить этот ответ?';
        if (!window.confirm(confirmMessage)) return;

        setIsSubmitting(true); setError(null); setSuccessMessage(null);
        let url = '';
        if (type === 'review') {
            url = `${API_BASE_URL}/api/reviews/${id}`;
        } else if (type === 'reply' && contextId) {
            url = `${API_BASE_URL}/api/reviews/${contextId}/replies/${id}`;
        } else {
            setError("Некорректный тип для удаления или отсутствует контекст.");
            setIsSubmitting(false); return;
        }

        try {
            const token = localStorage.getItem('token');
            if (!token) { setError("Ошибка авторизации."); setIsSubmitting(false); return; }
            await axios.delete(url, { headers: { Authorization: `Bearer ${token}` } });

            setSuccessMessage(`${type === 'review' ? 'Отзыв' : 'Ответ'} успешно удален.`);
            setTimeout(() => setSuccessMessage(null), 3000);

            // Обновляем соответствующий список путем перезагрузки
            if (type === 'review') {
                 // Уменьшаем total и если страница стала пустой, переходим на предыдущую
                const newTotal = reviewsPagination.total - 1;
                const newPages = Math.ceil(newTotal / reviewsPagination.limit) || 1;
                if (reviewsPagination.page > newPages && newPages > 0) {
                    setReviewsPagination(prev => ({ ...prev, page: newPages, total: newTotal, pages: newPages }));
                } else if (userReviews.length === 1 && reviewsPagination.page > 1 && newTotal > 0) {
                     setReviewsPagination(prev => ({ ...prev, page: prev.page - 1, total: newTotal, pages: newPages }));
                } else { // Остаемся на текущей или первой странице
                     setReviewsPagination(prev => ({ ...prev, total: newTotal, pages: newPages }));
                     // Запускаем перезагрузку, даже если номер страницы не изменился, чтобы обновить список
                     fetchUserActivity('reviews', currentUserId, 
                        {...reviewsPagination, page: (reviewsPagination.page > newPages && newPages > 0) ? newPages : reviewsPagination.page, total: newTotal, pages: newPages}, 
                        setUserReviews, setReviewsLoading, setReviewsError, setReviewsPagination);
                }
            } else { // reply
                const newTotal = repliesPagination.total - 1;
                const newPages = Math.ceil(newTotal / repliesPagination.limit) || 1;

                if (repliesPagination.page > newPages && newPages > 0) {
                    setRepliesPagination(prev => ({ ...prev, page: newPages, total: newTotal, pages: newPages }));
                } else if (userReplies.length === 1 && repliesPagination.page > 1 && newTotal > 0) {
                     setRepliesPagination(prev => ({ ...prev, page: prev.page - 1, total: newTotal, pages: newPages }));
                } else {
                     setRepliesPagination(prev => ({ ...prev, total: newTotal, pages: newPages }));
                     fetchUserActivity('replies', currentUserId, 
                        {...repliesPagination, page: (repliesPagination.page > newPages && newPages > 0) ? newPages : repliesPagination.page, total: newTotal, pages: newPages}, 
                        setUserReplies, setRepliesLoading, setRepliesError, setRepliesPagination);
                }
            }
        } catch (err) {
            setError(err.response?.data?.message || err.response?.data?.error || `Не удалось удалить ${type === 'review' ? 'отзыв' : 'ответ'}.`);
        } finally { setIsSubmitting(false); }
    };


    // --- Пагинация ---
    const changePage = (type, newPage) => {
        if (type === 'reviews') {
            if (newPage > 0 && newPage <= reviewsPagination.pages && newPage !== reviewsPagination.page) {
                setReviewsPagination(prev => ({ ...prev, page: newPage }));
            }
        } else if (type === 'replies') {
            if (newPage > 0 && newPage <= repliesPagination.pages && newPage !== repliesPagination.page) {
                setRepliesPagination(prev => ({ ...prev, page: newPage }));
            }
        }
    };

    if (isLoading) {
        return (
            <div className="loading-container" style={{ textAlign: 'center', padding: '50px', fontFamily: 'Arial, sans-serif' }}>
                <div className="spinner" style={{
                    display: 'inline-block', width: '40px', height: '40px',
                    border: '4px solid rgba(0,0,0,0.1)', borderRadius: '50%',
                    borderTopColor: 'var(--primary, #ff6b00)', animation: 'spin 1s linear infinite'
                }}></div>
                <p style={{ marginTop: '10px', fontSize: '1.2em', color: 'var(--text-dark, #333)' }}>Загрузка профиля...</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div className="profile-container">
            <div className="profile-header">
                <h1>Профиль пользователя</h1>
                {profile.isAdmin && ( <span className="admin-badge"> <FiShield /> Администратор </span> )}
            </div>

            {error && ( <div className="error-message alert error"> <FiAlertCircle /> {error} </div> )}
            {successMessage && ( <div className="success-message alert" style={{backgroundColor: 'rgba(76, 175, 80, 0.1)', color: '#2e7d32', border: '1px solid rgba(76, 175, 80, 0.3)'}}> <FiCheckCircle /> {successMessage} </div> )}

            <div className="profile-card">
                <div className="profile-info">
                    <div className="profile-field">
                        <label htmlFor="username"><FiUser /> Имя пользователя:</label>
                        {editMode ? ( <input id="username" type="text" name="username" value={formData.username} onChange={handleInputChange} disabled={emailChange.mode || isSubmitting}/>
                        ) : ( <span>{profile.username}</span> )}
                    </div>
                    <div className="profile-field">
                        <label htmlFor="email"><FiMail /> Email:</label>
                        {editMode ? (
                            <div className="email-edit-section">
                                <input id="email" type="email" name="email" value={formData.email} onChange={handleInputChange} disabled={emailChange.mode || isSubmitting} placeholder="Введите новый email"/>
                                {formData.email !== profile.email && !emailChange.mode && (
                                    <button onClick={requestEmailChange} className="action-button verify-button" disabled={isSubmitting || !formData.email}> Запросить смену Email </button>
                                )}
                                {emailChange.mode && (
                                <div className="verification-box">
                                    <p className="info-text">Код отправлен на {emailChange.newEmail}.</p>
                                    <input type="text" placeholder="Код подтверждения" value={emailChange.verificationCode} onChange={handleEmailCodeChange} disabled={isSubmitting}/>
                                    <button onClick={verifyEmailChange} className="action-button submit-button" disabled={!emailChange.verificationCode || isSubmitting} > Подтвердить Email </button>
                                </div>
                                )}
                            </div>
                        ) : (
                            <div className="email-status">
                                <span className="email-value">{profile.email}</span>
                                {profile.isVerified ? ( <span className="status-badge verified"> <FiCheckCircle /> Подтверждён </span>
                                ) : ( <span className="status-badge not-verified"> <FiAlertCircle /> Не подтверждён </span> )}
                            </div>
                        )}
                    </div>
                    {editMode && (
                        <>
                        <div className="profile-field">
                            <label htmlFor="currentPassword"><FiLock /> Текущий пароль:</label>
                            <input id="currentPassword" type="password" name="currentPassword" value={formData.currentPassword} onChange={handleInputChange} placeholder="Для изменения данных или пароля" disabled={isSubmitting} />
                        </div>
                        <div className="profile-field">
                            <label htmlFor="newPassword"><FiLock /> Новый пароль (опционально):</label>
                            <input id="newPassword" type="password" name="newPassword" value={formData.newPassword} onChange={handleInputChange} placeholder="Оставьте пустым, если не меняете" disabled={isSubmitting || !formData.currentPassword} />
                        </div>
                        </>
                    )}
                    <div className="profile-field">
                        <label><FiClock /> Дата регистрации:</label>
                        <span> {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric'}) : 'Неизвестно'} </span>
                    </div>
                    <div className="profile-actions">
                        {editMode ? (
                        <>
                            <button onClick={handleSaveProfile} className="action-button save-button"
                            disabled={ isSubmitting || emailChange.mode || (formData.username === profile.username && !formData.newPassword) || ((formData.username !== profile.username || formData.newPassword) && !formData.currentPassword) } >
                            <FiSave /> Сохранить изменения
                            </button>
                            <button onClick={toggleEditMode} className="action-button cancel-button" disabled={isSubmitting} > <FiX /> Отмена </button>
                        </>
                        ) : (
                        <button onClick={toggleEditMode} className="action-button edit-button" disabled={isSubmitting} > <FiEdit /> Редактировать профиль </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Секция "Мои отзывы" */}
            <div className="user-activity-section profile-card">
                <h2><FiStar /> Мои отзывы</h2>
                {reviewsLoading && <div className="loading-text">Загрузка отзывов...</div>}
                {reviewsError && <div className="error-message alert error"><FiAlertCircle /> {reviewsError}</div>}
                {!reviewsLoading && !reviewsError && userReviews.length === 0 && (
                    <p className="no-data-message">Вы еще не оставляли отзывов.</p>
                )}
                {!reviewsLoading && !reviewsError && userReviews.length > 0 && (
                    <div className="activity-list">
                        {userReviews.map(review => (
                            <div key={review.review_id} className="activity-card review-item-card">
                                <div className="activity-card-header">
                                    <Link to={`/restaurants/${review.restaurant_id}`} className="restaurant-link">
                                        <h3>{review.restaurant_name || 'Ресторан'}</h3>
                                    </Link>
                                    <button
                                        onClick={() => handleDeleteContent('review', review.review_id)}
                                        className="delete-item-btn"
                                        title="Удалить этот отзыв"
                                        disabled={isSubmitting}>
                                        <FiTrash2 />
                                    </button>
                                </div>
                                <div className="rating-display">
                                    {'★'.repeat(review.rating || 0)}{'☆'.repeat(5 - (review.rating || 0))}
                                </div>
                                <p className="activity-text">{review.review_comment || "Нет текста."}</p>
                                <p className="activity-date">
                                    <FiClock /> {new Date(review.review_created_at).toLocaleString('ru-RU')}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
                {!reviewsLoading && !reviewsError && userReviews.length > 0 && reviewsPagination.pages > 1 && (
                    <div className="pagination-controls">
                        <button onClick={() => changePage('reviews', reviewsPagination.page - 1)} disabled={reviewsPagination.page === 1 || reviewsLoading || isSubmitting}>
                            <FiChevronLeft /> Пред.
                        </button>
                        <span>Стр. {reviewsPagination.page} из {reviewsPagination.pages}</span>
                        <button onClick={() => changePage('reviews', reviewsPagination.page + 1)} disabled={reviewsPagination.page === reviewsPagination.pages || reviewsLoading || isSubmitting}>
                            След. <FiChevronRight />
                        </button>
                    </div>
                )}
            </div>

            {/* Секция "Мои ответы на отзывы" */}
            <div className="user-activity-section profile-card">
                <h2><FiMessageSquare /> Мои ответы на отзывы</h2>
                {repliesLoading && <div className="loading-text">Загрузка ответов...</div>}
                {repliesError && <div className="error-message alert error"><FiAlertCircle /> {repliesError}</div>}
                {!repliesLoading && !repliesError && userReplies.length === 0 && (
                    <p className="no-data-message">Вы еще не оставляли ответов.</p>
                )}
                {!repliesLoading && !repliesError && userReplies.length > 0 && (
                    <div className="activity-list">
                        {userReplies.map(reply => (
                            <div key={reply.reply_id} className="activity-card reply-item-card">
                                <div className="activity-card-header">
                                    <p className="activity-text reply-text-preview">
                                        <strong>Ваш ответ:</strong> {reply.reply_text}
                                    </p>
                                    <button
                                        onClick={() => handleDeleteContent('reply', reply.reply_id, reply.review_id)}
                                        className="delete-item-btn"
                                        title="Удалить этот ответ"
                                        disabled={isSubmitting}>
                                        <FiTrash2 />
                                    </button>
                                </div>
                                <div className="reply-context">
                                  <p>
                                    К отзыву на ресторан:{' '}
                                    <Link to={`/restaurants/${reply.restaurant_id}`} className="restaurant-link">
                                      {reply.restaurant_name || 'Ресторан'}
                                    </Link>
                                  </p>
                                  {reply.original_review_comment && (
                                    <p className="original-review-snippet">
                                      <em>Исходный комментарий: "{reply.original_review_comment.substring(0, 100)}{reply.original_review_comment.length > 100 ? '...' : ''}"</em>
                                    </p>
                                  )}
                                  <p className="activity-date">
                                    <FiClock /> {new Date(reply.reply_created_at).toLocaleString('ru-RU')}
                                  </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {!repliesLoading && !repliesError && userReplies.length > 0 && repliesPagination.pages > 1 && (
                    <div className="pagination-controls">
                        <button onClick={() => changePage('replies', repliesPagination.page - 1)} disabled={repliesPagination.page === 1 || repliesLoading || isSubmitting}>
                            <FiChevronLeft /> Пред.
                        </button>
                        <span>Стр. {repliesPagination.page} из {repliesPagination.pages}</span>
                        <button onClick={() => changePage('replies', repliesPagination.page + 1)} disabled={repliesPagination.page === repliesPagination.pages || repliesLoading || isSubmitting}>
                            След. <FiChevronRight />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfilePage;