import { 
    FiPlusCircle, FiTrash2, FiSave, FiInfo, FiMapPin, FiPhone, 
    FiClock, FiImage, FiType, FiBookOpen, FiEdit3, FiChevronsDown,FiNavigation 
} from 'react-icons/fi';


import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AddRestaurantPage.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'; 

// Суб-компонент MenuItemForm остается таким же, как в предыдущих версиях
const MenuItemForm = ({ item, index, onChange, onRemove, isOnlyItem }) => {
  return (
    <div className="menu-item-card">
      <div className="menu-item-header">
        <h3><FiEdit3 /> Блюдо #{index + 1}</h3>
        {!isOnlyItem && (
          <button type="button" className="remove-item-button" onClick={() => onRemove(index)} title="Удалить это блюдо" >
            <FiTrash2 />
          </button>
        )}
      </div>
      <div className="menu-item-grid">
        <div className="form-group">
          <label htmlFor={`menuItemName-${index}`}>Название блюда</label>
          <input id={`menuItemName-${index}`} type="text" name="name" value={item.name} onChange={(e) => onChange(index, e)} required className="form-input" />
        </div>
        <div className="form-group">
          <label htmlFor={`menuItemCategory-${index}`}>Категория</label>
          <select id={`menuItemCategory-${index}`} name="category" value={item.category} onChange={(e) => onChange(index, e)} className="form-input">
            <option value="основные блюда">Основные блюда</option>
            <option value="закуски">Закуски</option>
            <option value="салаты">Салаты</option>
            <option value="супы">Супы</option>
            <option value="десерты">Десерты</option>
            <option value="напитки">Напитки</option>
            <option value="завтраки">Завтраки</option>
            <option value="пицца">Пицца</option>
            <option value="суши/роллы">Суши/Роллы</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor={`menuItemPrice-${index}`}>Цена (₽)</label>
          <input id={`menuItemPrice-${index}`} type="number" name="price" value={item.price} onChange={(e) => onChange(index, e)} required min="0" step="0.01" className="form-input" />
        </div>
        <div className="form-group">
          <label htmlFor={`menuItemWeight-${index}`}>Вес/Объем (г/мл)</label>
          <input id={`menuItemWeight-${index}`} type="text" name="weight" value={item.weight} onChange={(e) => onChange(index, e)} className="form-input" placeholder="напр. 250г или 330мл" />
        </div>
        <div className="form-group full-width">
          <label htmlFor={`menuItemDescription-${index}`}>Описание блюда</label>
          <textarea id={`menuItemDescription-${index}`} name="description" value={item.description} onChange={(e) => onChange(index, e)} className="form-textarea" rows="3" />
        </div>
        <div className="form-group">
          <label htmlFor={`menuItemCuisine-${index}`}>Тип кухни (для блюда)</label>
          <input id={`menuItemCuisine-${index}`} type="text" name="cuisine_type" value={item.cuisine_type} onChange={(e) => onChange(index, e)} placeholder="Итальянская, Японская..." className="form-input" />
        </div>
        <div className="form-group full-width">
          <label htmlFor={`menuItemIngredients-${index}`}>Ингредиенты (через запятую)</label>
          <input id={`menuItemIngredients-${index}`} type="text" name="ingredients" value={item.ingredients} onChange={(e) => onChange(index, e)} className="form-input" />
        </div>
        <div className="form-group">
          <label htmlFor={`menuItemCalories-${index}`}>Калории (ккал)</label>
          <input id={`menuItemCalories-${index}`} type="number" name="calories" value={item.calories} onChange={(e) => onChange(index, e)} min="0" className="form-input" />
        </div>
        <div className="form-group checkbox-container">
          <div className="checkbox-group">
            <input type="checkbox" name="is_spicy" checked={item.is_spicy} onChange={(e) => onChange(index, e)} id={`spicy-${index}`} />
            <label htmlFor={`spicy-${index}`}>Острое</label>
          </div>
          <div className="checkbox-group">
            <input type="checkbox" name="is_vegetarian" checked={item.is_vegetarian} onChange={(e) => onChange(index, e)} id={`vegetarian-${index}`} />
            <label htmlFor={`vegetarian-${index}`}>Вегетарианское</label>
          </div>
        </div>
        <div className="form-group full-width">
          <label htmlFor={`menuItemPhotoUrl-${index}`}>Фото блюда (URL)</label>
          <input id={`menuItemPhotoUrl-${index}`} type="text" name="photo_url" value={item.photo_url} onChange={(e) => onChange(index, e)} className="form-input" placeholder="https://example.com/image.jpg" />
        </div>
      </div>
    </div>
  );
};

export default function AddRestaurantPage() {
  const [restaurantData, setRestaurantData] = useState({
    name: '', description: '', photo_url: '', address: '',
    establishment_type: 'ресторан', working_hours: '', phone: '',
    cuisine_type: '', price_range: 'средний',city: '',
  });

  const [menuItems, setMenuItems] = useState([{
    name: '', description: '', price: '', weight: '', category: 'основные блюда',
    photo_url: '', cuisine_type: '', ingredients: '', calories: '',
    is_spicy: false, is_vegetarian: false,
  }]);
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Локальное управление темой убрано, предполагаем глобальное управление
  // useEffect(() => {
  //   const theme = localStorage.getItem('theme');
  //   document.body.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
  // }, []);

  const handleRestaurantChange = (e) => {
    setRestaurantData({ ...restaurantData, [e.target.name]: e.target.value });
  };

  const handleMenuItemChange = (index, e) => {
    const { name, value, type, checked } = e.target;
    const updatedMenuItems = menuItems.map((item, i) =>
      i === index ? { ...item, [name]: type === 'checkbox' ? checked : value } : item
    );
    setMenuItems(updatedMenuItems);
  };

  const addMenuItem = () => {
    setMenuItems([...menuItems, {
      name: '', description: '', price: '', weight: '', category: 'основные блюда',
      photo_url: '', cuisine_type: '', ingredients: '', calories: '',
      is_spicy: false, is_vegetarian: false,
    }]);
  };

  const removeMenuItem = (index) => {
    if (menuItems.length > 1) {
      setMenuItems(menuItems.filter((_, i) => i !== index));
    }
  };

  // Переименовываем handleSubmit в handleCreateRestaurant, так как это не submit формы
  const handleCreateRestaurant = async () => { 
    setIsLoading(true); setError('');
    if (!restaurantData.name.trim() || !restaurantData.address.trim()) {
      setError('Название и адрес заведения обязательны.'); setIsLoading(false); return;
    }
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Ошибка авторизации: токен не найден.'); setIsLoading(false); navigate('/login'); return;
      }
      
      const restaurantResponse = await axios.post(
        `${API_BASE_URL}/api/restaurants`, restaurantData,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const restaurantId = restaurantResponse.data.id;
      
      const validMenuItems = menuItems.filter(item => item.name.trim() && item.price.toString().trim());
      
      if (validMenuItems.length > 0) {
        await Promise.all(
          validMenuItems.map(item => {
            const dishPayload = {
              ...item, restaurant_id: restaurantId,
              ingredients: typeof item.ingredients === 'string' 
                           ? item.ingredients.split(',').map(ing => ing.trim()).filter(ing => ing) 
                           : (item.ingredients || []),
              price: parseFloat(item.price) || 0,
              weight: item.weight ? String(item.weight) : null,
              calories: item.calories ? parseInt(item.calories) : null,
            };
            return axios.post(
              `${API_BASE_URL}/api/dishes`, dishPayload,
              { headers: { 'Authorization': `Bearer ${token}` } }
            );
          })
        );
      }
      navigate(`/restaurants/${restaurantId}`);
    } catch (err) {
      console.error("Ошибка при создании заведения или блюд:", err);
      setError(err.response?.data?.error || err.message || 'Произошла неизвестная ошибка');
    } finally { setIsLoading(false); }
  };

  return (
    <div className="add-restaurant-container">
      {error && <div className="error-message alert error">{error}</div>}

      {/* Используем div вместо form и добавляем класс для стилизации */}
      <div className="add-restaurant-content-wrapper"> {/* Класс для всего контента формы */}
          
        <div className="form-layout-columns">
          {/* Секция информации о ресторане */}
          <section className="form-section restaurant-details-section">
            <div className="section-title-bar">
              <h2><FiInfo /> Основная информация</h2>
            </div>
            <div className="form-grid">
              {/* Поля для ресторана остаются такими же, как в вашем коде */}
              <div className="form-group">
                <label htmlFor="name"><FiType /> Название заведения</label>
                <input id="name" type="text" name="name" value={restaurantData.name} onChange={handleRestaurantChange} required className="form-input" />
              </div>
              <div className="form-group">
                <label htmlFor="establishment_type">Тип заведения</label>
                <select id="establishment_type" name="establishment_type" value={restaurantData.establishment_type} onChange={handleRestaurantChange} className="form-input">
                  <option value="ресторан">Ресторан</option>
                  <option value="кафе">Кафе</option>
                  <option value="бар">Бар</option>
                  <option value="кофейня">Кофейня</option>
                  <option value="столовая">Столовая</option>
                  <option value="фастфуд">Фастфуд</option>
                  <option value="другое">Другое</option>
                </select>
              </div>
              <div className="form-group full-width">
                <label htmlFor="address"><FiMapPin /> Адрес</label>
                <input id="address" type="text" name="address" value={restaurantData.address} onChange={handleRestaurantChange} required className="form-input" />
              </div>
              <div className="form-group">
                <label htmlFor="city">Город</label>
                <input
                  id="city"
                  type="text"
                  name="city"
                  value={restaurantData.city}
                  onChange={handleRestaurantChange}
                  required
                  className="form-input"
                  placeholder="Например, Минск"
                />
              </div>
              <div className="form-group">
                <label htmlFor="phone"><FiPhone /> Телефон</label>
                <input id="phone" type="tel" name="phone" value={restaurantData.phone} onChange={handleRestaurantChange} className="form-input" placeholder="+7 (XXX) XXX-XX-XX" />
              </div>
              <div className="form-group">
                <label htmlFor="working_hours"><FiClock /> Часы работы</label>
                <input id="working_hours" type="text" name="working_hours" value={restaurantData.working_hours} onChange={handleRestaurantChange} placeholder="Пн-Пт: 09-23, Сб-Вс: 10-00" className="form-input" />
              </div>
              <div className="form-group">
                <label htmlFor="cuisine_type_restaurant">Тип кухни (общий)</label>
                <input id="cuisine_type_restaurant" type="text" name="cuisine_type" value={restaurantData.cuisine_type} onChange={handleRestaurantChange} placeholder="Европейская, Азиатская..." className="form-input" />
              </div>
              <div className="form-group">
                <label htmlFor="price_range">Ценовой диапазон</label>
                <select id="price_range" name="price_range" value={restaurantData.price_range} onChange={handleRestaurantChange} className="form-input">
                    <option value="эконом">₽ (дешево)</option>
                    <option value="средний">₽₽ (средне)</option>
                    <option value="премиум">₽₽₽ (дорого)</option>
                </select>
              </div>
              <div className="form-group full-width">
                <label htmlFor="photo_url"><FiImage /> Фото (URL основного или через запятую)</label>
                <input id="photo_url" type="text" name="photo_url" value={restaurantData.photo_url} onChange={handleRestaurantChange} className="form-input" placeholder="https://site.com/img.jpg, ..." />
              </div>
              <div className="form-group full-width">
                <label htmlFor="description"><FiChevronsDown /> Описание заведения</label>
                <textarea id="description" name="description" value={restaurantData.description} onChange={handleRestaurantChange} className="form-textarea" rows="4" />
              </div>
            </div>
          </section>

          {/* Секция меню */}
          <section className="form-section menu-details-section">
            <div className="section-title-bar">
              <h2><FiBookOpen /> Меню заведения</h2>
            </div>
            <div className="menu-items-container">
              {menuItems.map((item, index) => (
                <MenuItemForm
                  key={index}
                  item={item}
                  index={index}
                  onChange={handleMenuItemChange}
                  onRemove={removeMenuItem}
                  isOnlyItem={menuItems.length === 1}
                />
              ))}
              <button 
                type="button" 
                className="add-item-button"
                onClick={addMenuItem}
              >
                <FiPlusCircle /> Добавить блюдо в меню
              </button>
            </div>
          </section>
        </div> {/* Конец .form-layout-columns */}

        <div className="form-actions">
          {/* Используем button type="button" и onClick */}
          <button 
            type="button" 
            onClick={handleCreateRestaurant} // Вызываем нашу функцию по клику
            className="submit-button main-submit-button"
            disabled={isLoading}
          >
            {isLoading ? (
              <> <span className="spinner small-spinner"></span> Сохранение... </>
            ) : (
              <> <FiSave /> Добавить заведение </>
            )}
          </button>
        </div>
      </div> 
    </div>
  );
}