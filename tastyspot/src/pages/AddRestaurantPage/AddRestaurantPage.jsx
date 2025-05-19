import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AddRestaurantPage.css';

export default function AddRestaurantPage() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    photo_url: '',
    address: '',
    establishment_type: 'ресторан',
    working_hours: '',
    phone: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:5000/api/restaurants', formData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      navigate(`/restaurants/${response.data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка при создании заведения');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="add-restaurant-container">
      <h1>Добавить новое заведение</h1>
      
      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Название</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Описание</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label>URL фотографий (через запятую)</label>
          <input
            type="text"
            name="photo_url"
            value={formData.photo_url}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label>Адрес</label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Тип заведения</label>
          <select
            name="establishment_type"
            value={formData.establishment_type}
            onChange={handleChange}
          >
            <option value="ресторан">Ресторан</option>
            <option value="кафе">Кафе</option>
            <option value="бар">Бар</option>
            <option value="фастфуд">Фастфуд</option>
          </select>
        </div>

        <div className="form-group">
          <label>Часы работы (например: 09:00 - 23:00)</label>
          <input
            type="text"
            name="working_hours"
            value={formData.working_hours}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label>Телефон</label>
          <input
            type="text"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
          />
        </div>

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Сохранение...' : 'Добавить заведение'}
        </button>
      </form>
    </div>
  );
}