import React from 'react';
import './Footer.css'; // Убедитесь, что стили подходят или адаптируйте их
import {
  FaInstagram,
  FaTelegramPlane,
  FaWhatsapp,
  FaYoutube,
  FaPinterest,
  FaEnvelope,
  FaUtensils, // Иконка для лого (можно заменить на FaComments, FaStar и т.д.)
  // FaMapMarkerAlt, FaClock, FaPhone, // Эти иконки больше не нужны в этом контексте
} from 'react-icons/fa';

const Footer = () => {
  const siteName = "TastySpot"; // Или ваше название сайта

  const instagramUsername = "tastysp0t"; // Замените на ваш ник в Instagram
  const telegramUsername = "TastySpot"; // Замените на ваш ник или имя канала в Telegram


  return (
    <footer className="footer">
      <div className="footer-wave"></div> {/* Оставил волну, если она вам нравится */}
      <div className="footer-container">
        {/* Лого и описание */}
        <div className="footer-section">
          <div className="footer-logo">
            <FaUtensils className="logo-icon" /> {/* Или другая иконка */}
            {siteName}
          </div>
          <p className="footer-description">
            Ваш надежный гид по лучшим заведениям города. Читайте обзоры, делитесь впечатлениями!
          </p>
          <div className="footer-newsletter">
            
          </div>
        </div>

        {/* Быстрые ссылки */}
        <div className="footer-section">
          <h4>Навигация</h4>
          <ul className="footer-links">
            <li><a href="/">Главная</a></li>
            <li><a href="/restaurants">Заведения</a></li>
            <li><a href="/dishes">Блюда</a></li>
            <li><a href="/about">О нас</a></li>
          </ul>
        </div>

        {/* Соцсети и контакты сайта */}
        <div className="footer-section">
          <h4>Мы в соцсетях</h4>
          <div className="social-icons">
            <a
              href={`https://www.instagram.com/${instagramUsername}/`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="social-link instagram"
            >
              <FaInstagram />
            </a>
            <a
              href={`https://t.me/${telegramUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Telegram"
              className="social-link telegram" // Добавим класс для возможной стилизации
            >
              <FaTelegramPlane />
            </a>
            
          </div>
          <div className="footer-contact-site">
            <h4>Свяжитесь с нами</h4>
            <ul className="footer-contact-list">
              
            <li> 
    <FaEnvelope className="contact-icon" />
    <a href="mailto:tastyspot@mail.ru">tastyspot@mail.ru</a>
  </li>
              
            </ul>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} {siteName}. Все права защищены.</p>
        

      </div>
    </footer>
  );
};

export default Footer;