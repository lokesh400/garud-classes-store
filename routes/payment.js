const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const User = require('../models/user');
const Order = require('../models/order');
const Product = require('../models/product');
const { isLoggedIn } = require('../middleware/auth');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Checkout page
router.get('/checkout', isLoggedIn, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('cart.product');

    if (!user.cart || user.cart.length === 0) {
      req.flash('error', 'Your cart is empty');
      return res.redirect('/cart');
    }

    let cartTotal = 0;
    const validCart = user.cart.filter(item => item.product != null);

    validCart.forEach(item => {
      const price = item.product.discountPrice && item.product.discountPrice < item.product.price
        ? item.product.discountPrice
        : item.product.price;
      cartTotal += price * item.quantity;
    });

    res.render('checkout', {
      title: 'Checkout - Garud Classes',
      cart: validCart,
      cartTotal,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Something went wrong');
    res.redirect('/cart');
  }
});

// Create Razorpay order
router.post('/create-order', isLoggedIn, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('cart.product');
    const { fullname, phone, street, city, state, pincode } = req.body;

    if (!user.cart || user.cart.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    let totalAmount = 0;
    const orderItems = [];

    for (const item of user.cart) {
      if (!item.product) continue;
      const price = item.product.discountPrice && item.product.discountPrice < item.product.price
        ? item.product.discountPrice
        : item.product.price;
      totalAmount += price * item.quantity;
      orderItems.push({
        product: item.product._id,
        name: item.product.name,
        price: price,
        quantity: item.quantity,
        image: item.product.images.length > 0 ? item.product.images[0] : ''
      });
    }

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(totalAmount * 100), // amount in paise
      currency: 'INR',
      receipt: 'order_' + Date.now()
    });

    // Create order in DB
    const order = new Order({
      user: req.user._id,
      items: orderItems,
      totalAmount,
      shippingAddress: { fullname, phone, street, city, state, pincode },
      paymentInfo: {
        razorpayOrderId: razorpayOrder.id
      }
    });

    await order.save();

    res.json({
      orderId: order._id,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Verify payment
router.post('/verify-payment', isLoggedIn, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = req.body;

    // Verify signature
    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(sign)
      .digest('hex');

    if (expectedSign !== razorpay_signature) {
      await Order.findByIdAndUpdate(order_id, { paymentStatus: 'Failed' });
      return res.status(400).json({ error: 'Payment verification failed' });
    }

    // Update order
    const order = await Order.findById(order_id);
    order.paymentInfo.razorpayPaymentId = razorpay_payment_id;
    order.paymentInfo.razorpaySignature = razorpay_signature;
    order.paymentStatus = 'Paid';
    order.status = 'Confirmed';
    await order.save();

    // Update stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity }
      });
    }

    // Clear user cart
    await User.findByIdAndUpdate(req.user._id, { cart: [] });

    res.json({ success: true, orderId: order._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

// Order confirmation
router.get('/order-success/:id', isLoggedIn, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('items.product');
    if (!order || order.user.toString() !== req.user._id.toString()) {
      req.flash('error', 'Order not found');
      return res.redirect('/');
    }
    res.render('order-success', {
      title: 'Order Confirmed - Garud Classes',
      order
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Something went wrong');
    res.redirect('/');
  }
});

// My orders
router.get('/my-orders', isLoggedIn, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate('items.product');
    res.render('orders', {
      title: 'My Orders - Garud Classes',
      orders
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Something went wrong');
    res.redirect('/');
  }
});

module.exports = router;
