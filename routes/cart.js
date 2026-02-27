const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Product = require('../models/product');
const { isLoggedIn } = require('../middleware/auth');

// View cart
router.get('/', isLoggedIn, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('cart.product');
    let cartTotal = 0;
    const validCart = user.cart.filter(item => item.product != null);

    validCart.forEach(item => {
      const price = item.product.discountPrice && item.product.discountPrice < item.product.price
        ? item.product.discountPrice
        : item.product.price;
      cartTotal += price * item.quantity;
    });

    res.render('cart', {
      title: 'Shopping Cart - Garud Classes',
      cart: validCart,
      cartTotal
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Something went wrong');
    res.redirect('/');
  }
});

// Add to cart
router.post('/add/:productId', isLoggedIn, async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity = 1 } = req.body;

    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      req.flash('error', 'Product not found');
      return res.redirect('/products');
    }

    if (product.stock < 1) {
      req.flash('error', 'Product is out of stock');
      return res.redirect('/products/' + productId);
    }

    const user = await User.findById(req.user._id);
    const existingItem = user.cart.find(
      item => item.product.toString() === productId
    );

    if (existingItem) {
      existingItem.quantity += parseInt(quantity);
    } else {
      user.cart.push({ product: productId, quantity: parseInt(quantity) });
    }

    await user.save();
    req.flash('success', 'Product added to cart');
    res.redirect('/cart');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to add to cart');
    res.redirect('/products');
  }
});

// Update cart quantity
router.post('/update/:productId', isLoggedIn, async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    const user = await User.findById(req.user._id);
    const item = user.cart.find(
      item => item.product.toString() === productId
    );

    if (item) {
      if (parseInt(quantity) <= 0) {
        user.cart = user.cart.filter(
          item => item.product.toString() !== productId
        );
      } else {
        item.quantity = parseInt(quantity);
      }
      await user.save();
    }

    res.redirect('/cart');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to update cart');
    res.redirect('/cart');
  }
});

// Remove from cart
router.post('/remove/:productId', isLoggedIn, async (req, res) => {
  try {
    const { productId } = req.params;
    const user = await User.findById(req.user._id);
    user.cart = user.cart.filter(
      item => item.product.toString() !== productId
    );
    await user.save();
    req.flash('success', 'Item removed from cart');
    res.redirect('/cart');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to remove item');
    res.redirect('/cart');
  }
});

module.exports = router;
