require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const flash = require('connect-flash');

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

// Create admin user on first run
const createAdmin = async () => {
  try {
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      const admin = new User({
        fullname: 'Admin',
        email: process.env.ADMIN_EMAIL || 'admin@garudclasses.com',
        username: process.env.ADMIN_USERNAME || 'admin',
        role: 'admin',
        phone: '9876543210'
      });
      await User.register(admin, process.env.ADMIN_PASSWORD || 'admin123');
      console.log('Admin user created successfully');
      console.log('Username: ' + (process.env.ADMIN_USERNAME || 'admin'));
      console.log('Password: ' + (process.env.ADMIN_PASSWORD || 'admin123'));
    }
  } catch (err) {
    // Admin might already exist
    if (err.name !== 'UserExistsError') {
      console.error('Error creating admin:', err.message);
    }
  }
};

// Start Server
app.listen(PORT, () => {
  console.log(`\n🦅 Garud Classes Store running on http://localhost:${PORT}`);
  console.log(`📚 Environment: ${process.env.NODE_ENV || 'development'}\n`);
  createAdmin();
});
