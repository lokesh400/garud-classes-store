require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const flash = require('connect-flash');
const axios = require('axios');

const connectDB = require('./config/db');
const User = require('./models/user');

// Import Routes
const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const cartRoutes = require('./routes/cart');
const paymentRoutes = require('./routes/payment');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'garud-classes-secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    touchAfter: 24 * 3600
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    httpOnly: true
  }
}));

// Passport
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Flash
app.use(flash());

// Global variables
app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  res.locals.messages = {
    success: req.flash('success'),
    error: req.flash('error')
  };
  next();
});

// Routes
app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/cart', cartRoutes);
app.use('/payment', paymentRoutes);

// ─── Health Check ──────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// 404 Handler
app.use((req, res) => {
  res.status(404).render('404', { title: 'Page Not Found - Garud Classes' });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', {
    title: 'Error - Garud Classes',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

function startKeepAlive(port) {
  setInterval(async () => {
    const result = await axios.get(`https://store.garudclasses.com/health`, { timeout: 5000 }).catch(err => {
      console.error('Keep-alive error:', err.message);
      return null;
    });
    if (result) console.log(`🔄 Keep-alive ping → ${result.status} OK`);
  }, 10000);
}

app.listen(PORT, () => {
  console.log(`🚀 Garud Classes running at http://localhost:${PORT}`);
  startKeepAlive();
});
