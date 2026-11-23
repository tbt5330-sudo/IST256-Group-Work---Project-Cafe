'use strict';

const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');
const { Schema } = mongoose;

const opts = {
    timestamps: true,
    id: false,
    versionKey: false,
    autoCreate: true,
    autoIndex: true
};

const str = (maxlength = 300, minlength = 1) => ({
    type: String,
    required: true,
    trim: true,
    minlength,
    maxlength
});

const uuid = () => ({
    type: String,
    default: randomUUID,
    unique: true,
    required: true
});

const price = () => ({
    type: Number,
    required: true,
    min: 0,
    max: 100000
});

const qty = () => ({
    type: Number,
    required: true,
    min: 1,
    max: 99,
    validate: Number.isInteger
});

const email = () => ({
    ...str(254),
    lowercase: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
});

const status = () => ({
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
});

// PRODUCT SCHEMA
const productSchema = new Schema({
    id: {
        ...str(40),
        unique: true,
        uppercase: true,
        match: /^[A-Z0-9_-]+$/
    },
    name: str(120),
    category: str(60),
    unit: str(30),
    price: price(),
    image: {
        type: String,
        default: '',
        maxlength: 2000
    }
}, opts);

// SHOPPING CART SCHEMA
const cartSchema = new Schema({
    cartId: str(64),
    productId: str(40),
    quantity: qty()
}, opts);

cartSchema.index(
    { cartId: 1, productId: 1 },
    { unique: true }
);

// SHIPPING SCHEMA
const shippingSchema = new Schema({
    id: uuid(),

    cartId: {
        ...str(64),
        unique: true
    },

    fullName: str(120, 2),
    email: email(),
    address: str(300, 5),
    city: str(100),
    state: str(2, 2),

    zip: {
        ...str(10),
        match: /^\d{5}(-\d{4})?$/
    },

    status: {
        type: String,
        enum: ['Draft', 'Ordered'],
        default: 'Draft'
    },

    orderId: {
        type: String,
        default: ''
    }

}, opts);

// PURCHASED PRODUCT SCHEMA
const purchasedItem = new Schema({
    id: str(40),
    name: str(120),
    price: price(),
    quantity: qty()
}, {
    _id: false,
    id: false
});

// RETURNED PRODUCT SCHEMA
const returnItem = new Schema({
    id: str(40),
    name: str(120),
    price: price(),

    image: {
        type: String,
        default: ''
    }
}, {
    _id: false,
    id: false
});

// BILLING SCHEMA
const billingSchema = new Schema({
    id: uuid(),

    cartId: {
        ...str(64),
        unique: true
    },

    shippingId: str(64),
    name: str(120, 2),
    address: str(300, 5),

    paymentMethod: {
        type: {
            type: String,
            enum: ['Demo card'],
            required: true
        },

        lastFourDigits: {
            type: String,
            required: true,
            match: /^\d{4}$/
        },

        expiry: {
            type: String,
            required: true,
            match: /^(0[1-9]|1[0-2])\/\d{2}$/
        }
    },

    orderSummary: {
        items: {
            type: [purchasedItem],
            required: true
        },

        totalItems: {
            type: Number,
            min: 1,
            required: true
        },

        subtotal: {
            type: Number,
            min: 0,
            required: true
        },

        shipping: {
            type: Number,
            min: 0,
            required: true
        },

        total: {
            type: Number,
            min: 0,
            required: true
        }
    },

    status: {
        type: String,
        default: 'Recorded (no payment charged)'
    },

    receivedAt: {
        type: Date,
        default: Date.now
    }

}, opts);

// RETURNS SCHEMA
const returnSchema = new Schema({
    id: uuid(),

    items: {
        type: [returnItem],
        required: true
    },

    reason: str(200, 3),
    condition: str(100, 3),

    comments: {
        type: String,
        default: '',
        maxlength: 1000
    },

    status: status(),

    receivedAt: {
        type: Date,
        default: Date.now
    },

    reviewedAt: Date

}, opts);

// RESERVATIONS SCHEMA
const reservationSchema = new Schema({
    id: uuid(),
    customerName: str(120, 2),
    customerEmail: email(),
    reservationDate: str(10),
    reservationTime: str(5),

    groupSize: {
        type: Number,
        required: true,
        min: 1,
        max: 20,
        validate: Number.isInteger
    },

    receivedAt: {
        type: Date,
        default: Date.now
    }

}, opts);

// COMMUNITY SUBMISSIONS SCHEMA
const submissionSchema = new Schema({
    id: uuid(),
    title: str(120, 5),
    author: str(100, 2),

    category: {
        type: String,
        required: true,
        enum: [
            'Cafe Story',
            'Recipe Idea',
            'Community Event'
        ]
    },

    content: str(5000, 20),
    status: status(),

    submittedAt: {
        type: Date,
        default: Date.now
    },

    reviewedAt: Date

}, opts);

// MEMBERS SCHEMA
const memberSchema = new Schema({
    id: uuid(),
    name: str(120, 2),

    email: {
        ...email(),
        unique: true
    },

    age: {
        type: Number,
        min: 1,
        max: 120,
        validate: Number.isInteger
    },

    address: {
        type: String,
        trim: true,
        maxlength: 300
    },

    phone: {
        type: String,
        trim: true,
        maxlength: 40
    },

    joinedAt: {
        type: Date,
        default: Date.now
    }

}, opts);

// EXPORT DATABASE MODELS
module.exports = {
    Product: mongoose.model(
        'Product', productSchema, 'products'
    ),

    Cart: mongoose.model(
        'Cart', cartSchema, 'carts'
    ),

    Shipping: mongoose.model(
        'Shipping', shippingSchema, 'shipping'
    ),

    Billing: mongoose.model(
        'Billing', billingSchema, 'billing'
    ),

    Return: mongoose.model(
        'Return', returnSchema, 'returns'
    ),

    Reservation: mongoose.model(
        'Reservation', reservationSchema, 'reservations'
    ),

    Submission: mongoose.model(
        'Submission', submissionSchema, 'submissions'
    ),

    Member: mongoose.model(
        'Member', memberSchema, 'members'
    )
};
