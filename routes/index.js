const express = require('express');
const router = express.Router();
const Product = require('../models/product');

// Home page
router.get('/', async (req, res) => {
  try {
    const featuredProducts = await Product.find({ featured: true, isActive: true }).limit(8);
    const latestProducts = await Product.find({ isActive: true }).sort({ createdAt: -1 }).limit(8);
    const categories = await Product.distinct('category', { isActive: true });
    res.render('index', {
      title: 'Garud Classes - Your Learning Partner',
      featuredProducts,
      latestProducts,
      categories
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Something went wrong');
    res.render('index', {
      title: 'Garud Classes - Your Learning Partner',
      featuredProducts: [],
      latestProducts: [],
      categories: []
    });
  }
});

// All products
router.get('/products', async (req, res) => {
  try {
    const { category, search, sort, page = 1 } = req.query;
    const limit = 12;
    const skip = (page - 1) * limit;

    let query = { isActive: true };

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } }
      ];
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'price-low') sortOption = { price: 1 };
    if (sort === 'price-high') sortOption = { price: -1 };
    if (sort === 'name') sortOption = { name: 1 };
    if (sort === 'popular') sortOption = { 'ratings.average': -1 };

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(limit);

    const categories = await Product.distinct('category', { isActive: true });

    res.render('products', {
      title: 'Products - Garud Classes',
      products,
      categories,
      currentCategory: category || '',
      currentSearch: search || '',
      currentSort: sort || '',
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      total
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Something went wrong');
    res.redirect('/');
  }
});

// Product detail
router.get('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product || !product.isActive) {
      req.flash('error', 'Product not found');
      return res.redirect('/products');
    }

    const relatedProducts = await Product.find({
      category: product.category,
      _id: { $ne: product._id },
      isActive: true
    }).limit(4);

    res.render('product-detail', {
      title: product.name + ' - Garud Classes',
      product,
      relatedProducts
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Product not found');
    res.redirect('/products');
  }
});

// About page
router.get('/about', (req, res) => {
  res.render('about', { title: 'About Us - Garud Classes' });
});

// Contact page
router.get('/contact', (req, res) => {
  res.render('contact', { title: 'Contact Us - Garud Classes' });
});

module.exports = router;
