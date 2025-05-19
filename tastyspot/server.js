import express from 'express';
import pg from 'pg';
import cors from 'cors';
import 'dotenv/config';
import nodemailer from 'nodemailer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const { Pool } = pg;
const app = express();
const PORT = process.env.PORT || 5000;

// Подключение к PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '228325638225',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'tastyspot',
  port: process.env.DB_PORT || 5432,
});

// Проверка подключения к базе данных
pool.query('SELECT NOW()', (err) => {
  if (err) {
    console.error('Ошибка подключения к базе данных:', err);
  } else {
    console.log('Успешное подключение к базе данных');
  }
});

// Middleware
app.use(cors());
app.use(express.json());
const checkAdmin = (req, res, next) => {
  if (!req.user.is_admin) {
    return res.status(403).json({ error: 'Доступ запрещен. Требуются права администратора' });
  }
  next();
};

// Добавьте это перед роутами
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Недействительный токен' });
    }
    req.user = user;
    next();
  });
};

// Роуты
const transporter = nodemailer.createTransport({
  host: 'smtp.mail.ru',
  port: 465,
  secure: true,
  auth: {
    user: 'tastyspot@mail.ru',
    pass: '9icWQ4XdqsE8KcAc02Qt'
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Тест подключения к SMTP
transporter.verify((error) => {
  if (error) {
    console.error('SMTP connection error:', error);
  } else {
    console.log('SMTP connection established');
  }
});

// Функция отправки письма
const sendVerificationEmail = async (email, verificationCode) => {
  try {
    await transporter.sendMail({
      from: '"TestySpot" <tastyspot@mail.ru>', // Должен совпадать с auth.user
      to: email,
      subject: 'Подтверждение регистрации',
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2 style="color: #ff6b00;">Подтверждение регистрации</h2>
          <p>Ваш код подтверждения: <strong>${verificationCode}</strong></p>
          <p>Введите этот код в приложении для завершения регистрации.</p>
        </div>
      `,
    });
    console.log(`Письмо отправлено на ${email}`);
  } catch (error) {
    console.error('Ошибка отправки письма:', error);
    throw error;
  }
};

// Подтверждение email
app.post('/api/auth/verify', async (req, res) => {
  try {
    const { email, code } = req.body;

    const result = await pool.query(
      'UPDATE users SET is_verified = true WHERE email = $1 AND verification_code = $2 RETURNING id',
      [email, code]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Неверный код подтверждения" });
    }

    res.json({ success: true, message: 'Email успешно подтвержден' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Проверка подтверждения email
app.get('/api/auth/check-verification/:email', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT is_verified FROM users WHERE email = $1',
      [req.params.email]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    res.json({ isVerified: rows[0].is_verified });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Регистрация пользователя
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Валидация
    if (!username || !email || !password) {
      return res.status(400).json({ 
        error: "Необходимо указать имя пользователя, email и пароль" 
      });
    }

    // Проверка существования пользователя
    const userExists = await pool.query(
      'SELECT id FROM users WHERE email = $1', 
      [email]
    );
    
    if (userExists.rows.length > 0) {
      return res.status(409).json({ 
        error: "Пользователь с таким email уже существует" 
      });
    }

    // Хеширование пароля
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Генерация кода подтверждения
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Создание пользователя
    const { rows } = await pool.query(
      `INSERT INTO users 
       (username, email, password, verification_code, is_verified) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, username, email, created_at`,
      [username, email, hashedPassword, verificationCode, false]
    );

    // Отправка письма с кодом подтверждения
    await sendVerificationEmail(email, verificationCode);

    res.status(201).json({ 
      success: true,
      message: 'Регистрация успешна. Проверьте вашу почту для подтверждения.',
      user: rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Повторная отправка кода подтверждения
app.post('/api/auth/resend-code', async (req, res) => {
  try {
    const { email } = req.body;

    // Проверяем существует ли пользователь
    const userResult = await pool.query(
      'SELECT id, is_verified FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Если email уже подтвержден
    if (userResult.rows[0].is_verified) {
      return res.status(400).json({ error: 'Email уже подтвержден' });
    }

    // Генерация нового кода
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Обновление кода в базе
    await pool.query(
      'UPDATE users SET verification_code = $1 WHERE email = $2',
      [verificationCode, email]
    );
    
    // Отправка письма
    await sendVerificationEmail(email, verificationCode);
    
    res.json({ 
      success: true,
      message: 'Код подтверждения отправлен повторно'
    });
  } catch (err) {
    console.error('Ошибка при повторной отправке кода:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Вход пользователя
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    

    // Поиск пользователя
    const { rows } = await pool.query(
      'SELECT id, username, email, password, is_verified, is_admin FROM users WHERE email = $1',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ 
        error: "Неверные учетные данные" 
      });
    }

    const user = rows[0];

    // Проверка пароля
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ 
        error: "Неверные учетные данные" 
      });
    }

  
    if (!user.is_verified) {
      // Генерация нового кода
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
     
      await pool.query(
        'UPDATE users SET verification_code = $1 WHERE email = $2',
        [verificationCode, email]
      );
      
      // Отправка письма
      await sendVerificationEmail(email, verificationCode);
      
      return res.status(403).json({ 
        error: "Email не подтвержден",
        codeSent: true,
        message: "Новый код подтверждения отправлен на вашу почту"
      });
    }
    
    // JWT 
    const token = jwt.sign(
      { 
        userId: user.id,
        username: user.username,
        email: user.email,
        is_admin: user.is_admin
      },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        is_admin: user.is_admin 
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.get('/', (req, res) => {
  res.json({
    message: 'TastySpot API',
    version: '1.0.0',
    endpoints: {
      users: {
        getAll: 'GET /api/users',
        getOne: 'GET /api/users/:id',
        create: 'POST /api/users',
        update: 'PATCH /api/users/:id',
        delete: 'DELETE /api/users/:id'
      },
      restaurants: {
        getAll: 'GET /api/restaurants',
        getOne: 'GET /api/restaurants/:id',
        search: 'GET /api/restaurants/search/:query',
        filterByType: 'GET /api/restaurants/type/:type'
      }
    }
  });
});

// Получить всех пользователей 
app.get('/api/users', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, username, email, created_at FROM users ORDER BY id');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Получить конкретного пользователя
app.get('/api/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: "ID must be a number" });
    }

    const { rows } = await pool.query(
      'SELECT id, username, email, created_at FROM users WHERE id = $1', 
      [userId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Создать нового пользователя
app.post('/api/users', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ 
        error: "Missing required fields",
        required: ["username", "email", "password"]
      });
    }

   
    const userExists = await pool.query(
      'SELECT id FROM users WHERE email = $1', 
      [email]
    );
    
    if (userExists.rows.length > 0) {
      return res.status(409).json({ error: "User with this email already exists" });
    }

    const { rows } = await pool.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email, created_at',
      [username, email, password]
    );
    
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Обновить пользователя
app.patch('/api/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: "ID must be a number" });
    }

    const { username, email } = req.body;
    
    if (!username && !email) {
      return res.status(400).json({ error: "No fields to update" });
    }

    
    const userCheck = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [userId]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Проверка на уникальность email
    if (email) {
      const emailCheck = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, userId]
      );
      
      if (emailCheck.rows.length > 0) {
        return res.status(409).json({ error: "Email already in use by another user" });
      }
    }

    const { rows } = await pool.query(
      `UPDATE users 
       SET 
         username = COALESCE($1, username),
         email = COALESCE($2, email),
         updated_at = NOW()
       WHERE id = $3
       RETURNING id, username, email, created_at`,
      [username, email, userId]
    );
    
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Удалить пользователя
app.delete('/api/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: "ID must be a number" });
    }

    const { rows } = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id, username, email',
      [userId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User deleted successfully', user: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Получить все рестораны
app.get('/api/restaurants', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        id,
        name,
        description,
        photo_url,
        rating,
        address,
        establishment_type,
        working_hours,
        created_at,
        phone
      FROM restaurants
      ORDER BY rating DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/menu', async (req, res) => {
  try {
    const { restaurant_id } = req.query;

    if (!restaurant_id) {
      return res.status(400).json({ error: 'Не указан ID ресторана' });
    }

    const menuItems = await pool.query(
      `SELECT 
        id,
        name,
        description,
        price,
        weight,
        category,
        photo_url as image_url
      FROM dishes
      WHERE restaurant_id = $1
      ORDER BY category, name`,
      [restaurant_id]
    );

    res.json(menuItems.rows.map(item => ({
      ...item,
      price: parseFloat(item.price),
      weight: item.weight ? parseInt(item.weight) : null
    })));
  } catch (err) {
    console.error('Ошибка при получении меню:', err);
    res.status(500).json({ error: 'Ошибка сервера при получении меню' });
  }
});
// Обновление ресторана
app.put('/api/restaurants/:id', authenticateToken, checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      description, 
      photo_url, 
      address, 
      establishment_type, 
      working_hours,
      phone,
      latitude,
      longitude
    } = req.body;

    const { rows } = await pool.query(
      `UPDATE restaurants 
       SET 
         name = COALESCE($1, name),
         description = COALESCE($2, description),
         photo_url = COALESCE($3, photo_url),
         address = COALESCE($4, address),
         establishment_type = COALESCE($5, establishment_type),
         working_hours = COALESCE($6, working_hours),
         phone = COALESCE($7, phone),
         latitude = COALESCE($8, latitude),
         longitude = COALESCE($9, longitude),
         updated_at = NOW()
       WHERE id = $10
       RETURNING *`,
      [name, description, photo_url, address, establishment_type, working_hours, phone, latitude, longitude, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Ресторан не найден" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Удаление ресторана
app.delete('/api/restaurants/:id', authenticateToken, checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { rows } = await pool.query(
      'DELETE FROM restaurants WHERE id = $1 RETURNING id',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Ресторан не найден" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});
// Создание ресторана (только для админов)
app.post('/api/restaurants', authenticateToken, checkAdmin, async (req, res) => {
  try {
    const { 
      name, 
      description, 
      photo_url, 
      address, 
      establishment_type, 
      working_hours,
      phone,
      latitude,
      longitude
    } = req.body;

    if (!name || !address || !establishment_type) {
      return res.status(400).json({ error: "Необходимо указать название, адрес и тип заведения" });
    }

    const { rows } = await pool.query(
      `INSERT INTO restaurants 
       (name, description, photo_url, address, establishment_type, working_hours, phone, latitude, longitude)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, name, description, photo_url, address, establishment_type, working_hours, phone`,
      [name, description, photo_url, address, establishment_type, working_hours, phone, latitude, longitude]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});
// Добавление блюда в меню
app.post('/api/dishes', authenticateToken, checkAdmin, async (req, res) => {
  try {
    const { 
      restaurant_id,
      name,
      description,
      price,
      weight,
      category,
      photo_url,
      cuisine_type,
      ingredients,
      calories,
      is_spicy,
      is_vegetarian
    } = req.body;

    const { rows } = await pool.query(
      `INSERT INTO dishes 
       (restaurant_id, name, description, price, weight, category, photo_url, cuisine_type, ingredients, calories, is_spicy, is_vegetarian)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [restaurant_id, name, description, price, weight, category, photo_url, cuisine_type, ingredients, calories, is_spicy, is_vegetarian]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});
// Получить конкретный ресторан
app.get('/api/restaurants/:id', async (req, res) => {
  try {
    const restaurantId = parseInt(req.params.id);
    if (isNaN(restaurantId)) {
      return res.status(400).json({ error: "ID must be a number" });
    }

    const { rows } = await pool.query(
      `SELECT 
        id,
        name,
        description,
        photo_url,
        rating,
        address,
        establishment_type,
        working_hours,
        created_at
       FROM restaurants 
       WHERE id = $1`,
      [restaurantId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    
    // Обработка photo_url - разделяем по запятым
    const restaurant = rows[0];
    if (restaurant.photo_url) {
      restaurant.images = restaurant.photo_url.split(',').map(url => url.trim());
    } else {
      restaurant.images = [];
    }
    
    res.json(restaurant);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Поиск
app.get('/api/restaurants/search/:query', async (req, res) => {
  try {
    const searchQuery = `%${req.params.query}%`;
    const { rows } = await pool.query(
      `SELECT 
        id,
        name,
        description,
        photo_url,
        rating,
        address,
        establishment_type,
        working_hours
       FROM restaurants
       WHERE name ILIKE $1 OR description ILIKE $1 OR address ILIKE $1
       ORDER BY rating DESC`,
      [searchQuery]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Фильтрация 
app.get('/api/restaurants/type/:type', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT 
        id,
        name,
        description,
        photo_url,
        rating,
        address,
        establishment_type,
        working_hours
       FROM restaurants
       WHERE establishment_type = $1
       ORDER BY rating DESC`,
      [req.params.type]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// Создание отзыва
app.post('/api/reviews', authenticateToken, async (req, res) => {
  try {
    const { restaurant_id, rating, comment } = req.body;
    const userId = req.user.userId;

    // Валидация
    if (!restaurant_id || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Invalid input data" });
    }

    const { rows } = await pool.query(`
      INSERT INTO reviews (restaurant_id, user_id, rating, comment)
      VALUES ($1, $2, $3, $4)
      RETURNING id, rating, comment, created_at
    `, [restaurant_id, userId, rating, comment]);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Редактирование отзыва

app.put('/api/reviews/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { restaurant_id, rating, comment } = req.body;
    const userId = req.user.userId;

    const { rows } = await pool.query(
      `UPDATE reviews 
       SET rating = $1, comment = $2, updated_at = NOW()
       WHERE id = $3 AND user_id = $4 AND restaurant_id = $5
       RETURNING id, rating, comment, created_at, updated_at`,
      [rating, comment, id, userId, restaurant_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Отзыв не найден или у вас нет прав для редактирования" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Удаление отзыва
app.delete('/api/reviews/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { restaurant_id } = req.body;
    const userId = req.user.userId;

    // Проверяем, что отзыв принадлежит пользователю
    const reviewCheck = await pool.query(
      'SELECT user_id FROM reviews WHERE id = $1 AND restaurant_id = $2',
      [id, restaurant_id]
    );

    if (reviewCheck.rows.length === 0) {
      return res.status(404).json({ error: "Review not found" });
    }

    if (reviewCheck.rows[0].user_id !== userId) {
      return res.status(403).json({ error: "You can only delete your own reviews" });
    }

    await pool.query('DELETE FROM reviews WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Получение блюд

app.get('/api/dishes', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        id, name, description, photo_url, price, weight, category,
        cuisine_type, ingredients, calories, is_spicy, is_vegetarian
      FROM dishes
    `);
    
    res.json(rows.map(dish => ({
      ...dish,
      price: parseFloat(dish.price),
      weight: dish.weight ? parseInt(dish.weight) : null,
      calories: dish.calories ? parseInt(dish.calories) : null,
      ingredients: dish.ingredients || []
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

//endpoint для ингредиентов
app.get('/api/ingredients', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT DISTINCT unnest(ingredients) as ingredient 
      FROM dishes 
      WHERE ingredients IS NOT NULL
      ORDER BY ingredient
    `);
    res.json(rows.map(row => row.ingredient));
  } catch (err) {
    console.error('Error fetching ingredients:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Получение отзывов для ресторана
app.get('/api/reviews', async (req, res) => {
  try {
    const { restaurant_id } = req.query;
    
    if (!restaurant_id) {
      return res.status(400).json({ error: "restaurant_id parameter is required" });
    }

    const { rows } = await pool.query(`
      SELECT 
        r.id,
        r.rating,
        r.comment,
        r.created_at,
        r.updated_at,
        u.username,
        u.id as user_id
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.restaurant_id = $1
      ORDER BY r.created_at DESC
    `, [restaurant_id]);
    
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
  console.log('Доступные эндпоинты:');
  console.log(`- GET /api/users - Получить всех пользователей`);
  console.log(`- GET /api/users/:id - Получить конкретного пользователя`);
  console.log(`- POST /api/users - Создать нового пользователя`);
  console.log(`- PATCH /api/users/:id - Обновить пользователя`);
  console.log(`- DELETE /api/users/:id - Удалить пользователя`);
  console.log(`- GET /api/restaurants - Получить все рестораны`);
  console.log(`- GET /api/restaurants/:id - Получить конкретный ресторан`);
  console.log(`- GET /api/restaurants/search/:query - Поиск ресторанов`);
  console.log(`- GET /api/restaurants/type/:type - Фильтрация по типу заведения`);
});