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
const pool = new Pool({
  user: process.env.DB_USER, // Убрал || 'postgres' для Railway
  password: process.env.DB_PASSWORD, // Убрал || '228...' для Railway
  host: process.env.DB_HOST, // Убрал || 'localhost' для Railway
  database: process.env.DB_NAME, // Убрал || 'tastyspot' для Railway
  port: process.env.DB_PORT, // Убрал || 5432 для Railway
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false, //  ЭТУ СТРОКУ ДЛЯ SSL
});
pool.query('SELECT NOW()', (err) => {
  if (err) {
    console.error('Ошибка подключения к базе данных:', err);
  } else {
    console.log('Успешное подключение к базе данных');
  }
});

// Middleware
app.use(cors({
  origin: '*'
}));
app.use(express.json());
const checkAdmin = (req, res, next) => {
  if (!req.user.is_admin) {
    return res.status(403).json({ error: 'Доступ запрещен. Требуются права администратора' });
  }
  next();
};

const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Требуется авторизация' });

  jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret', (err, decoded) => {
    if (err) {
      console.error('JWT verify error:', err);
      return res.status(403).json({ error: 'Недействительный токен' });
    }

    console.log('Decoded token:', decoded); 
    
   
    const userId = decoded.userId;
    
    if (!userId) {
      return res.status(403).json({ error: 'Токен не содержит ID пользователя' });
    }

    const numericUserId = Number(userId);
    if (isNaN(numericUserId)) {
      return res.status(400).json({ error: 'ID пользователя должно быть числом' });
    }

    req.user = {
      userId: numericUserId,
      username: decoded.username,
      email: decoded.email,
      is_admin: decoded.is_admin || false
    };
    
    console.log('Authenticated user:', req.user);
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


transporter.verify((error) => {
  if (error) {
    console.error('SMTP connection error:', error);
  } else {
    console.log('SMTP connection established');
  }
});


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


app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        error: "Необходимо указать имя пользователя, email и пароль"
      });
    }

    const userExists = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (userExists.rows.length > 0) {
      return res.status(409).json({
        error: "Пользователь с таким email уже существует"
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();



      const { rows } = await pool.query( 
        `INSERT INTO users 
         (username, email, password, verification_code, is_verified) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING id, username, email, created_at, is_verified, verification_code`, // Добавил is_verified и verification_code для возможного ответа
        [username, email, hashedPassword, verificationCode, false]
      );

      const newUser = rows[0];

      // --- Попытка отправить email ПОСЛЕ успешного создания пользователя ---
      try {
        await sendVerificationEmail(email, verificationCode);
        console.log(`Verification email successfully queued for ${email}`);
        // Если все успешно (пользователь создан И письмо отправлено/поставлено в очередь)
        res.status(201).json({
          success: true,
          message: 'Регистрация успешна. Проверьте вашу почту для подтверждения.',
          user: { 
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            created_at: newUser.created_at,
            is_verified: newUser.is_verified 
          }
        });
      } catch (emailError) {
        console.error(`Failed to send verification email to ${email} for user ID ${newUser.id}:`, emailError);
        
        res.status(201).json({ 
          success: true, 
          message: 'Регистрация успешна, но не удалось отправить письмо для подтверждения. Пожалуйста, попробуйте запросить код подтверждения позже или свяжитесь с поддержкой.',
          warning_email_failed: true,
          user: {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            created_at: newUser.created_at,
            is_verified: newUser.is_verified
          }
        });
      }
    
  } catch (err) {
    console.error('Overall registration error:', err);
   
    if (err.code === '23505') { 
        return res.status(409).json({ error: 'Пользователь с такими данными уже существует (возможно, имя пользователя занято).' });
    }
    res.status(500).json({ error: 'Ошибка сервера при регистрации' });
  }
});


app.post('/api/auth/resend-code', async (req, res) => {
  try {
    const { email } = req.body;

    
    const userResult = await pool.query(
      'SELECT id, is_verified FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    
    if (userResult.rows[0].is_verified) {
      return res.status(400).json({ error: 'Email уже подтвержден' });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    
    await pool.query(
      'UPDATE users SET verification_code = $1 WHERE email = $2',
      [verificationCode, email]
    );
    
   
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


app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    
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

  
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ 
        error: "Неверные учетные данные" 
      });
    }

    if (!user.is_verified) {
     
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      await pool.query(
        'UPDATE users SET verification_code = $1 WHERE email = $2',
        [verificationCode, email]
      );
      
    
      await sendVerificationEmail(email, verificationCode);
      
      return res.status(403).json({ 
        error: "Email не подтвержден",
        codeSent: true,
        message: "Новый код подтверждения отправлен на вашу почту"
      });
    }
    
    
    const userId = parseInt(user.id);
    if (isNaN(userId)) {
      throw new Error('Invalid user ID format');
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


app.get('/api/users', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, username, email, created_at FROM users ORDER BY id');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
const updateRestaurantRating = async (restaurantId) => {
  try {
    const avgRatingResult = await pool.query(
      `SELECT AVG(rating) as average_rating
       FROM reviews
       WHERE restaurant_id = $1`,
      [restaurantId]
    );

    let newRating = 0;
    if (avgRatingResult.rows.length > 0 && avgRatingResult.rows[0].average_rating !== null) {
      newRating = parseFloat(avgRatingResult.rows[0].average_rating).toFixed(1);
    }

    await pool.query(
      `UPDATE restaurants
       SET rating = $1, updated_at = NOW()
       WHERE id = $2`,
      [newRating, restaurantId]
    );

    console.log(`Рейтинг для ресторана ${restaurantId} обновлен на: ${newRating}`);
    return newRating;
  } catch (error) {
    console.error(`Ошибка при обновлении рейтинга для ресторана ${restaurantId}:`, error);
  }
};

app.post('/api/reviews/:reviewId/vote', authenticateToken, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { vote_type } = req.body;
    const userId = req.user.userId;

    
    if (!['like', 'dislike'].includes(vote_type)) {
      return res.status(400).json({ 
        success: false,
        message: 'Неверный тип голоса. Допустимые значения: like или dislike' 
      });
    }

    
    const review = await pool.query('SELECT id FROM reviews WHERE id = $1', [reviewId]);
    if (review.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Отзыв не найден' 
      });
    }

    
    await pool.query('BEGIN');

    try {
      
      const existingVote = await pool.query(
        'SELECT id, vote_type FROM review_votes WHERE review_id = $1 AND user_id = $2',
        [reviewId, userId]
      );

      
      if (existingVote.rows.length > 0) {
        const currentVote = existingVote.rows[0];
        
        
        if (currentVote.vote_type === vote_type) {
          await pool.query(
            'DELETE FROM review_votes WHERE id = $1',
            [currentVote.id]
          );
          
          
          await pool.query(
            `UPDATE reviews SET 
              ${vote_type === 'like' ? 'likes = likes - 1' : 'dislikes = dislikes - 1'} 
             WHERE id = $1`,
            [reviewId]
          );
          
          await pool.query('COMMIT');
          
         
          const updatedReview = await pool.query(
            'SELECT likes, dislikes FROM reviews WHERE id = $1',
            [reviewId]
          );
          
          return res.json({
            success: true,
            data: {
              likes: updatedReview.rows[0].likes,
              dislikes: updatedReview.rows[0].dislikes,
              user_vote: null
            }
          });
        }
        
      
        await pool.query(
          'UPDATE review_votes SET vote_type = $1 WHERE id = $2',
          [vote_type, currentVote.id]
        );
        
        
        await pool.query(
          `UPDATE reviews SET 
            ${currentVote.vote_type === 'like' ? 'likes = likes - 1' : 'dislikes = dislikes - 1'},
            ${vote_type === 'like' ? 'likes = likes + 1' : 'dislikes = dislikes + 1'}
           WHERE id = $1`,
          [reviewId]
        );
      } else {
        
        await pool.query(
          'INSERT INTO review_votes (review_id, user_id, vote_type) VALUES ($1, $2, $3)',
          [reviewId, userId, vote_type]
        );
        
       
        await pool.query(
          `UPDATE reviews SET 
            ${vote_type === 'like' ? 'likes = likes + 1' : 'dislikes = dislikes + 1'}
           WHERE id = $1`,
          [reviewId]
        );
      }
      
      await pool.query('COMMIT');
      
      
      const updatedReview = await pool.query(
        'SELECT likes, dislikes FROM reviews WHERE id = $1',
        [reviewId]
      );
      
      res.json({
        success: true,
        data: {
          likes: updatedReview.rows[0].likes,
          dislikes: updatedReview.rows[0].dislikes,
          user_vote: vote_type
        }
      });
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Ошибка при обработке голоса:', error);
    res.status(500).json({ 
      success: false,
      message: 'Произошла ошибка при обработке вашего голоса' 
    });
  }
});


app.post('/api/reviews/:reviewId/replies', authenticateToken, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { text } = req.body;
    const userId = req.user.userId;

   
    if (!text || text.trim().length < 2) {
      return res.status(400).json({ 
        success: false,
        message: 'Текст ответа должен содержать минимум 2 символа' 
      });
    }

   
    const review = await pool.query('SELECT id FROM reviews WHERE id = $1', [reviewId]);
    if (review.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Отзыв не найден' 
      });
    }

    
    const reply = await pool.query(
      `INSERT INTO review_replies 
       (review_id, user_id, text) 
       VALUES ($1, $2, $3) 
       RETURNING id, text, created_at`,
      [reviewId, userId, text.trim()]
    );

    
    const user = await pool.query(
      'SELECT id, username FROM users WHERE id = $1',
      [userId]
    );

    res.status(201).json({
      success: true,
      data: {
        ...reply.rows[0],
        user: user.rows[0]
      }
    });
  } catch (error) {
    console.error('Ошибка при добавлении ответа:', error);
    res.status(500).json({ 
      success: false,
      message: 'Произошла ошибка при добавлении ответа' 
    });
  }
});
app.delete('/api/reviews/:reviewId', authenticateToken, async (req, res) => {
  try {
    const reviewId = parseInt(req.params.reviewId);
    const userId = req.user.userId;
    

    if (isNaN(reviewId)) {
      return res.status(400).json({ error: "ID отзыва должен быть числом" });
    }

    
    const reviewCheck = await pool.query(
        'SELECT user_id, restaurant_id FROM reviews WHERE id = $1',
        [reviewId]
    );

    if (reviewCheck.rows.length === 0) {
      return res.status(404).json({ error: "Отзыв не найден" });
    }

    const { user_id: reviewUserId, restaurant_id: reviewRestaurantId } = reviewCheck.rows[0];

    
    if (reviewUserId !== userId /* && !isAdmin */) {
      return res.status(403).json({ error: "У вас нет прав для удаления этого отзыва" });
    }

    
    await pool.query('DELETE FROM review_votes WHERE review_id = $1', [reviewId]);
    await pool.query('DELETE FROM review_replies WHERE review_id = $1', [reviewId]);
    
    // Удаляем сам отзыв
    const deleteResult = await pool.query('DELETE FROM reviews WHERE id = $1', [reviewId]);
    
    if (deleteResult.rowCount > 0) {
        
        await updateRestaurantRating(reviewRestaurantId);
    }

    res.json({ success: true, message: 'Отзыв успешно удален' });
  } catch (err) {
    console.error('Ошибка при удалении отзыва:', err);
    res.status(500).json({ error: 'Ошибка сервера при удалении отзыва' });
  }
});

app.delete('/api/reviews/:reviewId/replies/:replyId', authenticateToken, async (req, res) => {
  try {
    const replyId = parseInt(req.params.replyId);
    
    const userId = req.user.userId;
    const isAdmin = req.user.is_admin;

    if (isNaN(replyId)) {
      return res.status(400).json({ error: 'ID ответа должен быть числом' });
    }

    const replyCheck = await pool.query('SELECT user_id FROM review_replies WHERE id = $1', [replyId]);
    if (replyCheck.rows.length === 0) {
      return res.status(404).json({ error: "Ответ не найден" });
    }

    if (replyCheck.rows[0].user_id !== userId && !isAdmin) {
      return res.status(403).json({ error: "У вас нет прав для удаления этого ответа" });
    }

    await pool.query('DELETE FROM review_replies WHERE id = $1', [replyId]);
    res.json({ success: true, message: 'Ответ успешно удален' });
  } catch (err) {
    console.error('Ошибка при удалении ответа:', err);
    res.status(500).json({ error: 'Ошибка сервера при удалении ответа' });
  }
});


app.get('/api/reviews', async (req, res) => {
  try {
    const { restaurant_id } = req.query;
    const userId = req.user?.userId;
    
    if (!restaurant_id) {
      return res.status(400).json({ error: "restaurant_id parameter is required" });
    }

  
    const reviews = await pool.query(`
      SELECT 
        r.id,
        r.rating,
        r.comment,
        r.created_at,
        r.updated_at,
        r.likes,
        r.dislikes,
        u.username,
        u.id as user_id
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.restaurant_id = $1
      ORDER BY r.created_at DESC
    `, [restaurant_id]);
    
    
    const replies = await pool.query(`
      SELECT 
        rr.id,
        rr.review_id,
        rr.text,
        rr.created_at,
        u.username,
        u.id as user_id
      FROM review_replies rr
      LEFT JOIN users u ON rr.user_id = u.id
      WHERE rr.review_id = ANY($1::int[])
      ORDER BY rr.created_at ASC
    `, [reviews.rows.map(r => r.id)]);
    
  
    const repliesMap = replies.rows.reduce((acc, reply) => {
      if (!acc[reply.review_id]) {
        acc[reply.review_id] = [];
      }
      acc[reply.review_id].push(reply);
      return acc;
    }, {});
    
  
    let userVotes = {};
    if (userId) {
      const votes = await pool.query(`
        SELECT review_id, vote_type 
        FROM review_votes 
        WHERE user_id = $1 AND review_id = ANY($2::int[])
      `, [userId, reviews.rows.map(r => r.id)]);
      
      userVotes = votes.rows.reduce((acc, vote) => {
        acc[vote.review_id] = vote.vote_type;
        return acc;
      }, {});
    }
    
   
    const result = reviews.rows.map(review => ({
      ...review,
      replies: repliesMap[review.id] || [],
      user_vote: userVotes[review.id] || null
    }));
    
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});



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
        cuisine_type,
        price_range,
        working_hours,
        created_at,
        phone,
        latitude,  
        longitude,
        city
      FROM restaurants
      ORDER BY rating DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Ошибка при получении списка ресторанов:', err);
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
      cuisine_type, 
      price_range   
      
    } = req.body;

   
    const updateFields = [];
    const queryValues = [];
    let paramIndex = 1;

    if (name !== undefined) { updateFields.push(`name = $${paramIndex++}`); queryValues.push(name); }
    if (description !== undefined) { updateFields.push(`description = $${paramIndex++}`); queryValues.push(description); }
    if (photo_url !== undefined) { updateFields.push(`photo_url = $${paramIndex++}`); queryValues.push(photo_url); }
    if (address !== undefined) { updateFields.push(`address = $${paramIndex++}`); queryValues.push(address); }
    if (establishment_type !== undefined) { updateFields.push(`establishment_type = $${paramIndex++}`); queryValues.push(establishment_type); }
    if (working_hours !== undefined) { updateFields.push(`working_hours = $${paramIndex++}`); queryValues.push(working_hours); }
    if (phone !== undefined) { updateFields.push(`phone = $${paramIndex++}`); queryValues.push(phone); }
    if (cuisine_type !== undefined) { updateFields.push(`cuisine_type = $${paramIndex++}`); queryValues.push(cuisine_type); }
    if (price_range !== undefined) { updateFields.push(`price_range = $${paramIndex++}`); queryValues.push(price_range); }
    

    if (updateFields.length === 0) {
      return res.status(400).json({ error: "Нет данных для обновления" });
    }

    updateFields.push(`updated_at = NOW()`); 
    queryValues.push(id); 

    const queryText = `
      UPDATE restaurants
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *`; 

    const { rows } = await pool.query(queryText, queryValues);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Ресторан не найден" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Ошибка в PUT /api/restaurants/:id:", err.message, err.stack);
    res.status(500).json({ error: 'Ошибка сервера при обновлении заведения' });
  }
});


app.delete('/api/restaurants/:id', authenticateToken, checkAdmin, async (req, res) => {
  try {
    const { id } = req.params; 

  
    const numericId = parseInt(id);
    if (isNaN(numericId)) {
        return res.status(400).json({ error: "ID ресторана должен быть числом" });
    }

 
    await pool.query('DELETE FROM dishes WHERE restaurant_id = $1', [numericId]);
    
    
    const reviewsToDelete = await pool.query('SELECT id FROM reviews WHERE restaurant_id = $1', [numericId]);
    if (reviewsToDelete.rows.length > 0) {
        const reviewIds = reviewsToDelete.rows.map(r => r.id);
        await pool.query('DELETE FROM review_votes WHERE review_id = ANY($1::int[])', [reviewIds]);
        await pool.query('DELETE FROM review_replies WHERE review_id = ANY($1::int[])', [reviewIds]);
        await pool.query('DELETE FROM reviews WHERE restaurant_id = $1', [numericId]);
    }
    
    const { rows } = await pool.query(
      'DELETE FROM restaurants WHERE id = $1 RETURNING id', 
      [numericId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Ресторан не найден" });
    }

    res.json({ success: true, message: `Ресторан с ID ${numericId} успешно удален` }); 
  } catch (err) {
    console.error('Ошибка при удалении ресторана:', err); 
    res.status(500).json({ error: 'Ошибка сервера при удалении ресторана' }); 
  }
});

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
      cuisine_type, 
      price_range,
      city, // <--- Новое поле
      latitude, // Предполагаем, что вы также сохраняете координаты
      longitude
      
    } = req.body;

    if (!name || !address || !establishment_type) {
      return res.status(400).json({ error: "Необходимо указать название, адрес и тип заведения" });
    }

   
    const queryText = `
      INSERT INTO restaurants
       (name, description, photo_url, address, establishment_type, working_hours, phone, cuisine_type, price_range, city, latitude, longitude)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`;

    const queryParams = [
      name,
      description,
      photo_url,
      address,
      establishment_type,
      working_hours,
      phone,
      cuisine_type, 
      price_range, 
      city, // <--- Передаем город
      latitude,
      longitude
      
    ];

    const { rows } = await pool.query(queryText, queryParams);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Ошибка в POST /api/restaurants:", err.message, err.stack);
    res.status(500).json({ error: 'Ошибка сервера при создании заведения' });
  }
});

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

app.get('/api/restaurants/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        id, name, description, photo_url, rating, address,
        establishment_type, working_hours, 
        COALESCE(phone, '') as phone,  -- Гарантированно возвращаем поле
        created_at
      FROM restaurants WHERE id = $1`,
      [req.params.id]
    );
    
    if (!rows.length) return res.status(404).json({ error: 'Ресторан не найден' });
    
    const restaurant = rows[0];
    restaurant.images = restaurant.photo_url?.split(',').map(url => url.trim()) || [];
    
    res.json(restaurant);
  } catch (err) {
    console.error('Ошибка:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.get('/api/users/:userId/replies', authenticateToken, async (req, res) => {
  try {
    const requestedUserIdParam = req.params.userId;
    const requestingUserIdToken = req.user.userId;
    const isAdminToken = req.user.is_admin;

    const numericRequestedUserId = Number(requestedUserIdParam);
    if (isNaN(numericRequestedUserId)) {
      return res.status(400).json({ error: 'ID пользователя в URL должен быть числом' });
    }

    if (numericRequestedUserId !== requestingUserIdToken && !isAdminToken) {
      return res.status(403).json({ error: 'Доступ запрещен.' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const offset = (page - 1) * limit;

    const repliesResult = await pool.query(
      `SELECT 
         rr.id AS reply_id, 
         rr.text AS reply_text, 
         rr.created_at AS reply_created_at,
         rr.review_id, -- ID исходного отзыва
         r.comment AS original_review_comment,
         resto.id AS restaurant_id,
         resto.name AS restaurant_name
       FROM review_replies rr
       JOIN reviews r ON rr.review_id = r.id
       JOIN restaurants resto ON r.restaurant_id = resto.id
       WHERE rr.user_id = $1
       ORDER BY rr.created_at DESC
       LIMIT $2 OFFSET $3`,
      [numericRequestedUserId, limit, offset]
    );

    const totalRepliesResult = await pool.query(
      'SELECT COUNT(*) FROM review_replies WHERE user_id = $1',
      [numericRequestedUserId]
    );
    const totalReplies = parseInt(totalRepliesResult.rows[0].count);

    res.json({
      replies: repliesResult.rows,
      total: totalReplies,
      page,
      pages: Math.ceil(totalReplies / limit) || 1,
      limit,
    });
  } catch (err) {
    console.error(`Ошибка при получении ответов пользователя ${req.params.userId}:`, err);
    res.status(500).json({ error: 'Ошибка сервера при получении ответов пользователя' });
  }
});
app.get('/api/users/profile/:userId', authenticateToken, async (req, res) => {
  try {
    const requestedUserIdParam = req.params.userId;
    const requestingUserIdToken = req.user.userId;
    const isAdminToken = req.user.is_admin;

    const numericRequestedUserId = Number(requestedUserIdParam);
    if (isNaN(numericRequestedUserId)) {
      return res.status(400).json({ error: 'ID пользователя в URL должен быть числом' });
    }

    if (numericRequestedUserId !== requestingUserIdToken && !isAdminToken) {
      return res.status(403).json({ error: 'Доступ запрещен.' });
    }

    const { rows } = await pool.query(
      `SELECT id, username, email, created_at, is_verified, is_admin 
       FROM users 
       WHERE id = $1`,
      [numericRequestedUserId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    const userProfile = rows[0];
    res.json({
      username: userProfile.username,
      email: userProfile.email,
      isVerified: userProfile.is_verified,
      isAdmin: userProfile.is_admin,
      createdAt: userProfile.created_at
    });
  } catch (err) {
    console.error('Ошибка при получении профиля:', err);
    res.status(500).json({ error: 'Ошибка сервера при получении профиля' });
  }
});




app.get('/api/admin/reviews', authenticateToken, checkAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    
    const totalResult = await pool.query('SELECT COUNT(*) FROM reviews');
    const total = parseInt(totalResult.rows[0].count);

  
    const { rows } = await pool.query(`
      SELECT 
        r.id,
        r.rating,
        r.comment AS text,
        r.created_at AS "createdAt",
        u.username AS "userName",
        u.email AS "userEmail"
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      ORDER BY r.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    
    res.json({
      reviews: rows,
      total,
      page,
      pages: Math.ceil(total / limit),
      limit
    });

  } catch (err) {
    console.error('Error fetching admin reviews:', err.message); 
   
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.delete('/api/admin/reviews/:id', authenticateToken, checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { rowCount } = await pool.query(
      'DELETE FROM reviews WHERE id = $1',
      [id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting review:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/admin/reviews/:id/response', authenticateToken, checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { response } = req.body;

    const { rows } = await pool.query(
      `UPDATE reviews 
       SET admin_response = $1
       WHERE id = $2
       RETURNING id, admin_response AS "adminResponse"`,
      [response, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    res.json({ 
      success: true,
      adminResponse: rows[0].adminResponse
    });
  } catch (err) {
    console.error('Error adding admin response:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});




app.put('/api/users/profile', authenticateToken, async (req, res) => {
  try {
    const { username, password, newPassword } = req.body;
    const userId = req.user.userId;

    if (!password) {
        return res.status(400).json({ error: 'Текущий пароль обязателен для внесения изменений.' });
    }

    const userResult = await pool.query('SELECT password, username FROM users WHERE id = $1', [userId]); 
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    const currentUserFromDB = userResult.rows[0];
    const isMatch = await bcrypt.compare(password, currentUserFromDB.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Неверный текущий пароль' });
    }

    const updateFields = [];
    const queryParams = [];
    let paramIndex = 1;

    if (username && username !== currentUserFromDB.username) { 
      updateFields.push(`username = $${paramIndex++}`);
      queryParams.push(username);
    }

    if (newPassword) {
      if (newPassword.length < 6) {
          return res.status(400).json({ error: 'Новый пароль должен содержать не менее 6 символов.' });
      }
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      updateFields.push(`password = $${paramIndex++}`);
      queryParams.push(hashedPassword);
    }
    
    if (updateFields.length === 0) {
        return res.json({ 
            message: 'Текущий пароль верен, но нет данных для обновления.',
            username: currentUserFromDB.username 
        }); 
    }

   
    const setClause = updateFields.join(', ') + (updateFields.length > 0 ? ', ' : '') + 'updated_at = NOW()';
    
    queryParams.push(userId); 

    const updateQuery = `UPDATE users SET ${setClause} WHERE id = $${paramIndex} 
                         RETURNING id, username, email, is_verified, is_admin, created_at`;
    
    console.log('Executing Update Query:', updateQuery);
    console.log('With Query Params:', queryParams);

    const { rows } = await pool.query(updateQuery, queryParams);
    
    if (rows.length === 0) {
        
        console.error('Update query returned 0 rows, which is unexpected.');
        return res.status(500).json({ error: 'Не удалось обновить данные пользователя.' });
    }
    const updatedUser = rows[0];

    res.json({
        username: updatedUser.username,
        
    });
  } catch (err) {
    console.error('Ошибка обновления профиля:', err); 
    res.status(500).json({ error: 'Ошибка сервера при обновлении профиля' });
  }
});
app.post('/api/users/request-email-change', authenticateToken, async (req, res) => {
  try {
    const { newEmail } = req.body;
    const userId = req.user.userId; 
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) { 
        return res.status(400).json({ error: 'Предоставлен некорректный новый email.' });
    }
    
    
    const emailExists = await pool.query('SELECT id FROM users WHERE email = $1 AND id != $2', [newEmail, userId]);
    if (emailExists.rows.length > 0) {
        return res.status(409).json({ error: 'Этот email уже используется другим пользователем.' });
    }
    


    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    
    await pool.query(
      'UPDATE users SET verification_code = $1 WHERE id = $2',
      [verificationCode, userId]
    );
    
    
    await transporter.sendMail({
      from: '"TastySpot" <tastyspot@mail.ru>',
      to: newEmail,
      subject: 'TastySpot: Подтверждение смены email',
      html: `<p>Ваш код для подтверждения смены email: <strong>${verificationCode}</strong>. Код действителен 15 минут.</p>`
    });
    
    res.json({ success: true, message: `Код подтверждения отправлен на ${newEmail}` });
  } catch (err) {
    console.error('Ошибка запроса смены email:', err);
    res.status(500).json({ error: 'Ошибка сервера при запросе смены email' });
  }
});


app.post('/api/users/verify-email-change', authenticateToken, async (req, res) => {
  try {
    const { newEmail, verificationCode } = req.body;
    const userId = req.user.userId;

    if (!newEmail || !verificationCode) {
        return res.status(400).json({ error: 'Новый email и код подтверждения обязательны.' });
    }

    
    const userResult = await pool.query(
      'SELECT verification_code FROM users WHERE id = $1',
      
      [userId]
    );
    
    const userDb = userResult.rows[0];
    if (!userDb || userDb.verification_code !== verificationCode) {
      return res.status(400).json({ error: 'Неверный или устаревший код подтверждения' });
    }
    
   
    const emailExists = await pool.query('SELECT id FROM users WHERE email = $1 AND id != $2', [newEmail, userId]);
    if (emailExists.rows.length > 0) {
        return res.status(409).json({ error: 'Этот email уже используется другим пользователем.' });
    }
    
   
    const updateResult = await pool.query(
      'UPDATE users SET email = $1, verification_code = NULL, is_verified = TRUE, updated_at = NOW() WHERE id = $2 RETURNING email',
      
      [newEmail, userId]
    );
    
    if (updateResult.rowCount === 0) {
       
        return res.status(500).json({ error: 'Не удалось обновить email.' });
    }

    res.json({ success: true, message: 'Email успешно изменен и подтвержден.', newEmail: updateResult.rows[0].email });
  } catch (err) {
    console.error('Ошибка подтверждения смены email:', err);
    res.status(500).json({ error: 'Ошибка сервера при подтверждении смены email' });
  }
});

app.get('/api/users/:userId/reviews', authenticateToken, async (req, res) => {
  try {
    const requestedUserIdParam = req.params.userId;
    const requestingUserIdToken = req.user.userId;
    const isAdminToken = req.user.is_admin;

    const numericRequestedUserId = Number(requestedUserIdParam);
    if (isNaN(numericRequestedUserId)) {
      return res.status(400).json({ error: 'ID пользователя в URL должен быть числом' });
    }

    if (numericRequestedUserId !== requestingUserIdToken && !isAdminToken) {
      return res.status(403).json({ error: 'Доступ запрещен.' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5; 
    const offset = (page - 1) * limit;

    const reviewsResult = await pool.query(
      `SELECT 
         r.id AS review_id, 
         r.rating,
         r.comment AS review_comment, 
         r.created_at AS review_created_at,
         resto.id AS restaurant_id,
         resto.name AS restaurant_name
       FROM reviews r
       JOIN restaurants resto ON r.restaurant_id = resto.id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [numericRequestedUserId, limit, offset]
    );

    const totalReviewsResult = await pool.query(
      'SELECT COUNT(*) FROM reviews WHERE user_id = $1',
      [numericRequestedUserId]
    );
    const totalReviews = parseInt(totalReviewsResult.rows[0].count);

    res.json({
      reviews: reviewsResult.rows,
      total: totalReviews,
      page,
      pages: Math.ceil(totalReviews / limit) || 1,
      limit,
    });
  } catch (err) {
    console.error(`Ошибка при получении отзывов пользователя ${req.params.userId}:`, err);
    res.status(500).json({ error: 'Ошибка сервера при получении отзывов пользователя' });
  }
});

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

app.post('/api/reviews', authenticateToken, async (req, res) => {
  try {
    const { restaurant_id, rating, comment } = req.body;
    const userId = req.user.userId;

    if (!restaurant_id || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Invalid input data" });
    }

    const { rows } = await pool.query(`
      INSERT INTO reviews (restaurant_id, user_id, rating, comment)
      VALUES ($1, $2, $3, $4)
      RETURNING id, restaurant_id, rating, comment, created_at, user_id
    `, [restaurant_id, userId, rating, comment]);

    
    if (rows.length > 0) {
      await updateRestaurantRating(rows[0].restaurant_id);
    }

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Ошибка при создании отзыва:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});



app.put('/api/reviews/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { rating, comment } = req.body;
    const userId = req.user.userId;

    // Сначала получим restaurant_id для этого отзыва
    const reviewDataResult = await pool.query(
      'SELECT restaurant_id, user_id FROM reviews WHERE id = $1',
      [id]
    );

    if (reviewDataResult.rows.length === 0) {
      return res.status(404).json({ error: "Отзыв не найден" });
    }

    const reviewData = reviewDataResult.rows[0];

    if (reviewData.user_id !== userId) {
        return res.status(403).json({ error: "Вы можете редактировать только свои отзывы" });
    }
    
    const { rows } = await pool.query(
      `UPDATE reviews
       SET rating = $1, comment = $2, updated_at = NOW()
       WHERE id = $3 AND user_id = $4 
       RETURNING id, restaurant_id, rating, comment, created_at, updated_at, user_id`,
      [rating, comment, id, userId]
    );

    if (rows.length === 0) {
      
      return res.status(404).json({ error: "Отзыв не найден или у вас нет прав для редактирования" });
    }

    
    await updateRestaurantRating(rows[0].restaurant_id);

    res.json(rows[0]);
  } catch (err) {
    console.error('Ошибка при редактировании отзыва:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});


app.delete('/api/reviews/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { restaurant_id } = req.body;
    const userId = req.user.userId;

 
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



app.get('/api/dishes', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        d.id, 
        d.name, 
        d.description, 
        d.photo_url, 
        d.price, 
        d.weight, 
        d.category,
        d.cuisine_type, 
        d.ingredients, 
        d.calories, 
        d.is_spicy, 
        d.is_vegetarian,
        d.restaurant_id,     -- ID ресторана из таблицы dishes
        r.name AS restaurant_name -- Имя ресторана из таблицы restaurants
      FROM dishes d            -- Используем алиас 'd' для таблицы dishes
      LEFT JOIN restaurants r ON d.restaurant_id = r.id -- Присоединяем таблицу restaurants с алиасом 'r'
    `);
    
    res.json(rows.map(dish => ({
      ...dish,
      price: parseFloat(dish.price),
      weight: dish.weight ? parseInt(dish.weight) : null,
      calories: dish.calories ? parseInt(dish.calories) : null,
      ingredients: dish.ingredients || [],
      // restaurant_id и restaurant_name теперь будут в объекте dish
    })));
  } catch (err) {
    console.error('Ошибка при получении списка блюд:', err); // Добавил более конкретное сообщение
    res.status(500).json({ error: 'Internal server error' });
  }
});


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