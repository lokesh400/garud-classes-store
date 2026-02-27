const express = require('express');
const router = express.Router();
const passport = require('passport');
const User = require('../models/user');
const { isNotLoggedIn, isLoggedIn } = require('../middleware/auth');

// Register page
router.get('/register', isNotLoggedIn, (req, res) => {
  res.render('register', { title: 'Register - Garud Classes' });
});

// Register POST
router.post('/register', isNotLoggedIn, async (req, res) => {
  try {
    const { fullname, email, phone, username, password } = req.body;

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      req.flash('error', 'Email already registered');
      return res.redirect('/auth/register');
    }

    const user = new User({ fullname, email, phone, username });
    await User.register(user, password);

    passport.authenticate('local')(req, res, () => {
      req.flash('success', 'Welcome to Garud Classes!');
      res.redirect('/');
    });
  } catch (err) {
    console.error(err);
    req.flash('error', err.message);
    res.redirect('/auth/register');
  }
});

// Login page
router.get('/login', isNotLoggedIn, (req, res) => {
  res.render('login', { title: 'Login - Garud Classes' });
});

// Login POST
router.post('/login', isNotLoggedIn, passport.authenticate('local', {
  failureRedirect: '/auth/login',
  failureFlash: 'Invalid username or password'
}), (req, res) => {
  req.flash('success', 'Welcome back!');
  const redirectUrl = req.session.returnTo || '/';
  delete req.session.returnTo;
  res.redirect(redirectUrl);
});

// Logout
router.get('/logout', isLoggedIn, (req, res) => {
  req.logout(function (err) {
    if (err) {
      console.error(err);
    }
    req.flash('success', 'Logged out successfully');
    res.redirect('/');
  });
});

// Profile
router.get('/profile', isLoggedIn, (req, res) => {
  res.render('profile', { title: 'My Profile - Garud Classes' });
});

// Update profile
router.post('/profile', isLoggedIn, async (req, res) => {
  try {
    const { fullname, email, phone, street, city, state, pincode } = req.body;
    await User.findByIdAndUpdate(req.user._id, {
      fullname,
      email,
      phone,
      address: { street, city, state, pincode }
    });
    req.flash('success', 'Profile updated successfully');
    res.redirect('/auth/profile');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to update profile');
    res.redirect('/auth/profile');
  }
});

module.exports = router;
