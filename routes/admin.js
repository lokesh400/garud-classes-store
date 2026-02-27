const express = require('express');
const router = express.Router();
const Product = require('../models/product');
const Order = require('../models/order');
const User = require('../models/user');
const { isAdmin } = require('../middleware/auth');
const upload = require('../config/multer');
const fs = require('fs');
const path = require('path');

// Admin dashboard
router.get('/', isAdmin, async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();
    const totalUsers = await User.countDocuments();
    const recentOrders = await Order.find()
      .populate('user', 'fullname email')
      .sort({ createdAt: -1 })
      .limit(10);

    const revenue = await Order.aggregate([
      { $match: { paymentStatus: 'Paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    res.render('admin/dashboard', {
      title: 'Admin Dashboard - Garud Classes',
      totalProducts,
      totalOrders,
      totalUsers,
      recentOrders,
      totalRevenue: revenue.length > 0 ? revenue[0].total : 0
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Something went wrong');
    res.redirect('/');
  }
});

// Manage products
router.get('/products', isAdmin, async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.render('admin/manage-products', {
      title: 'Manage Products - Garud Classes',
      products
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Something went wrong');
    res.redirect('/admin');
  }
});

// Add product page
router.get('/products/add', isAdmin, (req, res) => {
  res.render('admin/add-product', {
    title: 'Add Product - Garud Classes'
  });
});

// Add product POST
router.post('/products/add', isAdmin, upload.array('images', 6), async (req, res) => {
  try {
    const { name, description, shortDescription, price, discountPrice,
      category, subject, classLevel, author, stock, featured } = req.body;

    const images = req.files ? req.files.map(file => '/uploads/' + file.filename) : [];

    const product = new Product({
      name,
      description,
      shortDescription,
      price: parseFloat(price),
      discountPrice: discountPrice ? parseFloat(discountPrice) : undefined,
      category,
      subject,
      classLevel,
      author,
      stock: parseInt(stock),
      featured: featured === 'on',
      images
    });

    await product.save();
    req.flash('success', 'Product added successfully');
    res.redirect('/admin/products');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to add product: ' + err.message);
    res.redirect('/admin/products/add');
  }
});

// Edit product page
router.get('/products/edit/:id', isAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      req.flash('error', 'Product not found');
      return res.redirect('/admin/products');
    }
    res.render('admin/edit-product', {
      title: 'Edit Product - Garud Classes',
      product
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Product not found');
    res.redirect('/admin/products');
  }
});

// Edit product POST
router.post('/products/edit/:id', isAdmin, upload.array('images', 6), async (req, res) => {
  try {
    const { name, description, shortDescription, price, discountPrice,
      category, subject, classLevel, author, stock, featured, removeImages } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) {
      req.flash('error', 'Product not found');
      return res.redirect('/admin/products');
    }

    // Remove selected images
    if (removeImages) {
      const toRemove = Array.isArray(removeImages) ? removeImages : [removeImages];
      toRemove.forEach(img => {
        const imgPath = path.join(__dirname, '../public', img);
        if (fs.existsSync(imgPath)) {
          fs.unlinkSync(imgPath);
        }
        product.images = product.images.filter(i => i !== img);
      });
    }

    // Add new images
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => '/uploads/' + file.filename);
      product.images.push(...newImages);
    }

    product.name = name;
    product.description = description;
    product.shortDescription = shortDescription;
    product.price = parseFloat(price);
    product.discountPrice = discountPrice ? parseFloat(discountPrice) : undefined;
    product.category = category;
    product.subject = subject;
    product.classLevel = classLevel;
    product.author = author;
    product.stock = parseInt(stock);
    product.featured = featured === 'on';

    await product.save();
    req.flash('success', 'Product updated successfully');
    res.redirect('/admin/products');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to update product');
    res.redirect('/admin/products/edit/' + req.params.id);
  }
});

// Delete product
router.post('/products/delete/:id', isAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      // Delete associated images
      product.images.forEach(img => {
        const imgPath = path.join(__dirname, '../public', img);
        if (fs.existsSync(imgPath)) {
          fs.unlinkSync(imgPath);
        }
      });
      await Product.findByIdAndDelete(req.params.id);
      req.flash('success', 'Product deleted successfully');
    }
    res.redirect('/admin/products');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to delete product');
    res.redirect('/admin/products');
  }
});

// Toggle product status
router.post('/products/toggle/:id', isAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      product.isActive = !product.isActive;
      await product.save();
      req.flash('success', `Product ${product.isActive ? 'activated' : 'deactivated'}`);
    }
    res.redirect('/admin/products');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to toggle product status');
    res.redirect('/admin/products');
  }
});

// Manage orders
router.get('/orders', isAdmin, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'fullname email')
      .sort({ createdAt: -1 });
    res.render('admin/orders', {
      title: 'Manage Orders - Garud Classes',
      orders
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Something went wrong');
    res.redirect('/admin');
  }
});

// Update order status
router.post('/orders/:id/status', isAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    await Order.findByIdAndUpdate(req.params.id, { status });
    req.flash('success', 'Order status updated');
    res.redirect('/admin/orders');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to update order status');
    res.redirect('/admin/orders');
  }
});

module.exports = router;
