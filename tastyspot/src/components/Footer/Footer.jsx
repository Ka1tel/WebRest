import React from 'react';
import './Footer.css';
import { FaInstagram, FaFacebook, FaTwitter, FaYoutube, FaPinterest, FaMapMarkerAlt, FaClock, FaPhone, FaEnvelope, FaUtensils } from 'react-icons/fa';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-wave"></div>
      <div className="footer-container">
        {/* Лого и описание */}
        <div className="footer-section">
          <div className="footer-logo">
            <FaUtensils className="logo-icon" />
            TastySpot
          </div>
          <p className="footer-description">
            Мы создаем незабываемые гастрономические впечатления с 2010 года.
          </p>
          <div className="footer-newsletter">
            <input type="email" placeholder="Ваш email" className="newsletter-input" />
            <button className="newsletter-btn">Подписаться</button>
          </div>
        </div>

        {/* Контакты */}
        <div className="footer-section">
          <h4>Контакты</h4>
          <div className="contact-item">
            <FaMapMarkerAlt className="contact-icon" />
            <span>г. Минск, ул. Пушкина д. 2</span>
          </div>
          <div className="contact-item">
            <FaClock className="contact-icon" />
            <span>пн-сб 10:00 - 18:00</span>
          </div>
          <div className="contact-item">
            <FaPhone className="contact-icon" />
            <span>+375 (29) 123-45-67</span>
          </div>
          <div className="contact-item">
            <FaEnvelope className="contact-icon" />
            <span>info@tastyspot.by</span>
          </div>
        </div>

        {/* Быстрые ссылки */}
        <div className="footer-section">
          <h4>Быстрые ссылки</h4>
          <ul className="footer-links">
            <li><a href="/">Главная</a></li>
            <li><a href="/menu">Меню</a></li>
            <li><a href="/gallery">Галерея</a></li>
            <li><a href="/about">О нас</a></li>
            <li><a href="/contact">Контакты</a></li>
          </ul>
        </div>

        {/* Соцсети */}
        <div className="footer-section">
          <h4>Мы в соцсетях</h4>
          <div className="social-icons">
            <a href="#" className="social-link instagram"><FaInstagram /></a>
            <a href="#" className="social-link facebook"><FaFacebook /></a>
            <a href="#" className="social-link twitter"><FaTwitter /></a>
            <a href="#" className="social-link youtube"><FaYoutube /></a>
            <a href="#" className="social-link pinterest"><FaPinterest /></a>
          </div>
          
          <div className="payment-methods">
            <h4>Способы оплаты</h4>
            <div className="payment-icons">
              <span className="payment-icon">Visa</span>
              <span className="payment-icon">MasterCard</span>
              <span className="payment-icon">Мир</span>
            </div>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} TastySpot. Все права защищены.</p>
        <div className="legal-links">
          <a href="/privacy">Политика конфиденциальности</a>
          <a href="/terms">Условия использования</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;