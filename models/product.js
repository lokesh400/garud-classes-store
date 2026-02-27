const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  shortDescription: {
    type: String,
    maxlength: 200
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  discountPrice: {
    type: Number,
    min: 0
  },
  category: {
    type: String,
    required: true,
    enum: [
      'Books',
      'Study Material',
      'Test Series',
      'Video Courses',
      'Notes',
      'Stationery',
      'Combo Packs',
      'Other'
    ]
  },
  images: [{
    type: String
  }],
  subject: {
    type: String,
    trim: true
  },
  classLevel: {
    type: String,
    trim: true
  },
  author: {
    type: String,
    trim: true
  },
  stock: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  featured: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  ratings: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 }
  }
}, { timestamps: true });

productSchema.virtual('effectivePrice').get(function () {
  return this.discountPrice && this.discountPrice < this.price
    ? this.discountPrice
    : this.price;
});

productSchema.virtual('discountPercent').get(function () {
  if (this.discountPrice && this.discountPrice < this.price) {
    return Math.round(((this.price - this.discountPrice) / this.price) * 100);
  }
  return 0;
});

productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);
