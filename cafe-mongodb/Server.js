'use strict';

require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const path = require('node:path');
const crypto = require('node:crypto');

const {
    Product,
    Cart,
    Shipping,
    Billing,
    Return,
    Reservation,
    Submission,
    Member
} = require('./models');

const app = express();

const PORT = Number(process.env.PORT || 3000);
const SHIPPING_FEE = 2;
const CART_COOKIE = 'cafeCartId';

const COOKIE_OPTIONS = {
    httpOnly: true,
    sameSite: 'strict',
    signed: true,
    path: '/',
    maxAge: 30 * 24 * 60 * 60 * 1000
};

const statuses = [
    'Pending',
    'Approved',
    'Rejected'
];

// ==========================================
// HELPER FUNCTIONS
// ==========================================

const money = n =>
    Math.round((n + Number.EPSILON) * 100) / 100;

const text = value =>
    typeof value === 'string' ? value.trim() : '';

const httpError = (status, message) =>
    Object.assign(new Error(message), { status });

const ensure = (condition, message, status = 400) => {
    if (!condition) {
        throw httpError(status, message);
    }
};

const route = fn => (req, res, next) =>
    Promise.resolve()
        .then(() => fn(req, res))
        .catch(next);

const integer = (n, min, max) =>
    Number.isInteger(n) && n >= min && n <= max;

const pick = (body, fields) =>
    Object.fromEntries(
        fields
            .filter(k => Object.hasOwn(body || {}, k))
            .map(k => [k, body[k]])
    );

const productId = value =>
    text(value).toUpperCase();

// ==========================================
// EXPRESS MIDDLEWARE
// ==========================================

app.disable('x-powered-by');

app.use(express.json({
    limit: '64kb'
}));

app.use(cookieParser(process.env.CART_SECRET));

app.use('/api', (req, res, next) => {

    res.set('Cache-Control', 'no-store');

    if (
        !['GET', 'HEAD', 'OPTIONS'].includes(req.method)
        && req.get('origin')
    ) {

        const localOrigin = `http://${req.get('host')}`;

        if (req.get('origin') !== localOrigin) {

            return res.status(403).json({
                errors: ['Invalid request origin.']
            });

        }
    }

    next();

});

// ==========================================
// ADMINISTRATOR AUTHENTICATION
// ==========================================

function adminOnly(req, res, next) {

    const user = process.env.CAFE_ADMIN_USER;
    const password = process.env.CAFE_ADMIN_PASSWORD;

    if (!user || !password) {

        return res.status(503).json({
            errors: [
                'Configure moderator credentials in .env.'
            ]
        });

    }

    const header = req.get('authorization') || '';

    const decoded = header.startsWith('Basic ')
        ? Buffer.from(
            header.slice(6),
            'base64'
        ).toString('utf8')
        : '';

    const hash = value =>
        crypto
            .createHash('sha256')
            .update(value)
            .digest();

    if (
        !crypto.timingSafeEqual(
            hash(decoded),
            hash(`${user}:${password}`)
        )
    ) {

        return res.status(401).json({
            errors: ['Invalid administrator credentials.']
        });

    }

    next();

}

// ==========================================
// SHOPPING CART SESSION
// ==========================================

function cartSession(req, res, next) {

    let id = req.signedCookies[CART_COOKIE];

    if (
        typeof id !== 'string'
        || !/^[a-f0-9-]{36}$/.test(id)
    ) {

        id = crypto.randomUUID();

        res.cookie(
            CART_COOKIE,
            id,
            COOKIE_OPTIONS
        );

    }

    req.cartId = id;

    next();

}

// ==========================================
// PRODUCT VALIDATION
// ==========================================

function normalizeProduct(body, creating) {

    const data = pick(body, [
        'name',
        'category',
        'unit',
        'price',
        'image'
    ]);

    if (creating) {
        data.id = productId(body?.id);
    }

    if (Object.hasOwn(data, 'price')) {

        ensure(
            typeof data.price === 'number'
            && Number.isFinite(data.price)
            && data.price >= 0,
            'Price must be a nonnegative number.'
        );

        data.price = money(data.price);

    }

    if (Object.hasOwn(data, 'image') && data.image) {

        ensure(
            typeof data.image === 'string'
            && /^https:\/\//i.test(data.image),
            'Image must be an HTTPS URL.'
        );

    }

    return data;

}

// ==========================================
// PRODUCT CRUD OPERATIONS
// ==========================================

// READ ALL PRODUCTS
app.get('/api/products', route(async (req, res) => {

    const products = await Product
        .find()
        .sort({ createdAt: 1, id: 1 })
        .lean();

    res.json(products);

}));

// READ A SINGLE PRODUCT
app.get('/api/products/:id', route(async (req, res) => {

    const product = await Product.findOne({
        id: productId(req.params.id)
    }).lean();

    ensure(
        product,
        'Product not found.',
        404
    );

    res.json(product);

}));

// CREATE PRODUCT
app.post(
    '/api/products',
    adminOnly,
    route(async (req, res) => {

        const product = await Product.create(
            normalizeProduct(req.body, true)
        );

        res.status(201).json(product);

    })
);

// UPDATE PRODUCT
const updateProduct = route(async (req, res) => {

    const changes = normalizeProduct(req.body, false);

    ensure(
        Object.keys(changes).length,
        'No product fields provided.'
    );

    const product = await Product.findOneAndUpdate(

        {
            id: productId(req.params.id)
        },

        {
            $set: changes
        },

        {
            new: true,
            runValidators: true
        }

    );

    ensure(
        product,
        'Product not found.',
        404
    );

    res.json(product);

});

app.put(
    '/api/products/:id',
    adminOnly,
    updateProduct
);

app.patch(
    '/api/products/:id',
    adminOnly,
    updateProduct
);

// DELETE PRODUCT
app.delete(
    '/api/products/:id',
    adminOnly,
    route(async (req, res) => {

        const id = productId(req.params.id);

        const product = await Product.findOneAndDelete({
            id
        });

        ensure(
            product,
            'Product not found.',
            404
        );

        await Cart.deleteMany({
            productId: id
        });

        res.json({
            success: true,
            message: 'Product deleted.'
        });

    })
);

// ==========================================
// SHOPPING CART CRUD OPERATIONS
// ==========================================

// RETRIEVE CART WITH PRODUCT INFORMATION
async function getCart(cartId) {

    const items = await Cart
        .find({ cartId })
        .sort({ createdAt: 1 })
        .lean();

    const products = await Product.find({

        id: {
            $in: items.map(i => i.productId)
        }

    }).lean();

    const byId = new Map(
        products.map(p => [p.id, p])
    );

    return items.flatMap(item => {

        const p = byId.get(item.productId);

        return p ? [{

            id: p.id,
            name: p.name,
            category: p.category,
            unit: p.unit,
            price: p.price,
            image: p.image,
            quantity: item.quantity

        }] : [];

    });

}

// READ CART
app.get(
    '/api/cart',
    cartSession,
    route(async (req, res) => {

        res.json(
            await getCart(req.cartId)
        );

    })
);

// CREATE CART ITEM
app.post(
    '/api/cart',
    cartSession,
    route(async (req, res) => {

        const id = productId(req.body?.productId);
        const quantity = req.body?.quantity ?? 1;

        ensure(
            integer(quantity, 1, 99),
            'Quantity must be a whole number from 1 to 99.'
        );

        ensure(
            await Product.exists({ id }),
            'Product not found.',
            404
        );

        try {

            await Cart.findOneAndUpdate(

                {
                    cartId: req.cartId,
                    productId: id,

                    quantity: {
                        $lte: 99 - quantity
                    }
                },

                {
                    $inc: {
                        quantity
                    },

                    $setOnInsert: {
                        cartId: req.cartId,
                        productId: id
                    }
                },

                {
                    upsert: true,
                    new: true
                }

            );

        } catch (error) {

            if (error.code === 11000) {

                throw httpError(
                    409,
                    'Cart quantity limit reached or cart changed. Refresh and try again.'
                );

            }

            throw error;

        }

        res.status(201).json(
            await getCart(req.cartId)
        );

    })
);

// UPDATE CART QUANTITY
const setQuantity = route(async (req, res) => {

    const quantity = req.body?.quantity;

    ensure(
        integer(quantity, 1, 99),
        'Quantity must be a whole number from 1 to 99.'
    );

    const item = await Cart.findOneAndUpdate(

        {
            cartId: req.cartId,
            productId: productId(req.params.productId)
        },

        {
            $set: {
                quantity
            }
        },

        {
            new: true,
            runValidators: true
        }

    );

    ensure(
        item,
        'Cart item not found.',
        404
    );

    res.json(
        await getCart(req.cartId)
    );

});

app.put(
    '/api/cart/:productId',
    cartSession,
    setQuantity
);

app.patch(
    '/api/cart/:productId',
    cartSession,
    setQuantity
);

// DELETE SINGLE CART ITEM
app.delete(
    '/api/cart/:productId',
    cartSession,
    route(async (req, res) => {

        const result = await Cart.deleteOne({

            cartId: req.cartId,

            productId: productId(
                req.params.productId
            )

        });

        ensure(
            result.deletedCount,
            'Cart item not found.',
            404
        );

        res.json(
            await getCart(req.cartId)
        );

    })
);

// DELETE ALL CART ITEMS
app.delete(
    '/api/cart',
    cartSession,
    route(async (req, res) => {

        await Cart.deleteMany({
            cartId: req.cartId
        });

        res.json([]);

    })
);

// ==========================================
// SHIPPING CRUD OPERATIONS
// ==========================================

function shippingFields(body) {

    const data = pick(body, [

        'fullName',
        'email',
        'address',
        'city',
        'state',
        'zip'

    ]);

    data.state = text(data.state).toUpperCase();

    ensure(
        /^[A-Z]{2}$/.test(data.state),
        'Enter a two-letter state code.'
    );

    for (const key of [

        'fullName',
        'email',
        'address',
        'city',
        'zip'

    ]) {

        ensure(
            text(data[key]),
            `${key} is required.`
        );

    }

    return data;

}

// READ CURRENT SHIPPING INFORMATION
app.get(
    '/api/shipping',
    cartSession,
    route(async (req, res) => {

        const record = await Shipping.findOne({

            cartId: req.cartId,
            status: 'Draft'

        }).lean();

        res.json(record);

    })
);

// READ SHIPPING BY ID
app.get(
    '/api/shipping/:id',
    cartSession,
    route(async (req, res) => {

        const record = await Shipping.findOne({

            id: req.params.id,
            cartId: req.cartId

        }).lean();

        ensure(
            record,
            'Shipping record not found.',
            404
        );

        res.json(record);

    })
);

// CREATE SHIPPING INFORMATION
app.post(
    '/api/shipping',
    cartSession,
    route(async (req, res) => {

        ensure(
            (await getCart(req.cartId)).length,
            'Add items to your cart first.'
        );

        const data = shippingFields(req.body);

        const record = await Shipping.findOneAndUpdate(

            {
                cartId: req.cartId,
                status: 'Draft'
            },

            {
                $set: data,

                $setOnInsert: {

                    cartId: req.cartId,
                    id: crypto.randomUUID()

                }
            },

            {
                upsert: true,
                new: true,
                runValidators: true,
                setDefaultsOnInsert: true
            }

        );

        res.status(201).json(record);

    })
);

// UPDATE SHIPPING INFORMATION
app.put(
    '/api/shipping/:id',
    cartSession,
    route(async (req, res) => {

        const record = await Shipping.findOneAndUpdate(

            {
                id: req.params.id,
                cartId: req.cartId,
                status: 'Draft'
            },

            {
                $set: shippingFields(req.body)
            },

            {
                new: true,
                runValidators: true
            }

        );

        ensure(
            record,
            'Shipping draft not found.',
            404
        );

        res.json(record);

    })
);

// DELETE SHIPPING INFORMATION
app.delete(
    '/api/shipping/:id',
    cartSession,
    route(async (req, res) => {

        const result = await Shipping.deleteOne({

            id: req.params.id,
            cartId: req.cartId,
            status: 'Draft'

        });

        ensure(
            result.deletedCount,
            'Shipping draft not found.',
            404
        );

        res.json({
            success: true
        });

    })
);

// ==========================================
// BILLING OPERATIONS
// ==========================================

async function finishOrder(req, res, record) {

    await Shipping.updateOne(

        {
            cartId: req.cartId,
            id: record.shippingId
        },

        {
            $set: {
                status: 'Ordered',
                orderId: record.id
            }
        }

    );

    await Cart.deleteMany({

        cartId: req.cartId

    });

    res.clearCookie(CART_COOKIE, {

        httpOnly: true,
        sameSite: 'strict',
        path: '/'

    });

    res.status(201).json({

        success: true,

        message:
            'Demo billing recorded. No payment was charged.',

        orderId: record.id

    });

}

// CREATE BILLING RECORD
app.post(
    '/api/billing',
    cartSession,
    route(async (req, res) => {

        const body = req.body || {};

        const {
            fullName,
            address,
            paymentMethod
        } = body;

        ensure(

            paymentMethod
            && typeof paymentMethod === 'object'
            && !Array.isArray(paymentMethod),

            'Masked demo payment information is required.'

        );

        ensure(

            !('cardNumber' in body)
            && !('cvv' in body)
            && !('cardNumber' in paymentMethod)
            && !('cvv' in paymentMethod),

            'Do not send full card numbers or CVV.'

        );

        ensure(

            text(fullName).length >= 2
            && text(address).length >= 5,

            'Enter valid billing name and address.'

        );

        ensure(

            paymentMethod?.type === 'demo_card'
            && paymentMethod.lastFourDigits === '4242'
            && /^(0[1-9]|1[0-2])\/\d{2}$/.test(
                paymentMethod.expiry || ''
            ),

            'Enter masked demo card details.'

        );

        // Prevent duplicate orders.
        const previous = await Billing.findOne({

            cartId: req.cartId

        });

        if (previous) {

            return finishOrder(req, res, previous);

        }

        const shipping = await Shipping.findOne({

            cartId: req.cartId,
            status: 'Draft'

        });

        ensure(
            shipping,
            'Complete shipping information before billing.'
        );

        const cart = await getCart(req.cartId);

        ensure(
            cart.length,
            'Your shopping cart is empty.'
        );

        const items = cart.map(({
            id,
            name,
            price,
            quantity
        }) => ({

            id,
            name,
            price,
            quantity

        }));

        const subtotal = money(

            items.reduce(

                (sum, p) =>
                    sum + p.price * p.quantity,

                0

            )

        );

        const data = {

            cartId: req.cartId,

            shippingId: shipping.id,

            name: text(fullName),

            address: text(address),

            paymentMethod: {

                type: 'Demo card',

                lastFourDigits:
                    paymentMethod.lastFourDigits,

                expiry:
                    paymentMethod.expiry

            },

            orderSummary: {

                items,

                totalItems: items.reduce(
                    (sum, p) => sum + p.quantity,
                    0
                ),

                subtotal,

                shipping: SHIPPING_FEE,

                total: money(
                    subtotal + SHIPPING_FEE
                )

            }

        };

        let record;

        try {

            record = await Billing.create(data);

        } catch (error) {

            if (error.code !== 11000) {
                throw error;
            }

            record = await Billing.findOne({

                cartId: req.cartId

            });

            if (!record) {
                throw error;
            }

        }

        return finishOrder(req, res, record);

    })
);

// READ BILLING RECORDS - ADMINISTRATOR ONLY
app.get(
    '/api/billing',
    adminOnly,
    route(async (req, res) => {

        res.json(

            await Billing
                .find()
                .sort({ receivedAt: -1 })
                .lean()

        );

    })
);

// ==========================================
// PRODUCT RETURNS
// ==========================================

app.post('/api/returns', route(async (req, res) => {

    const {

        items,
        reason,
        condition,
        comments

    } = req.body || {};

    ensure(

        Array.isArray(items)
        && items.length >= 1
        && items.length <= 30,

        'Select 1–30 products.'

    );

    const ids = [

        ...new Set(
            items.map(p => productId(p?.id))
        )

    ];

    ensure(
        ids.every(Boolean),
        'Invalid product ID.'
    );

    const catalog = await Product.find({

        id: {
            $in: ids
        }

    }).lean();

    ensure(

        catalog.length === ids.length,

        'One or more products are not in the cafe catalog.'

    );

    const record = await Return.create({

        items: catalog.map(({

            id,
            name,
            price,
            image

        }) => ({

            id,
            name,
            price,
            image

        })),

        reason,
        condition,
        comments

    });

    res.status(201).json({

        success: true,

        message:
            'Return request submitted for review.',

        returnId: record.id,

        status: record.status

    });

}));

// ==========================================
// COMMUNITY CONTENT SUBMISSIONS
// ==========================================

app.post('/api/submissions', route(async (req, res) => {

    const record = await Submission.create(

        pick(req.body, [

            'title',
            'author',
            'category',
            'content'

        ])

    );

    res.status(201).json({

        success: true,

        message:
            'Content submitted for moderator approval.',

        submissionId: record.id,

        status: record.status

    });

}));

// ==========================================
// MODERATOR DASHBOARD OPERATIONS
// ==========================================

function moderatorRoutes(
    resource,
    Model,
    label,
    dateField
) {

    // READ RECORDS
    app.get(

        `/api/${resource}`,

        adminOnly,

        route(async (req, res) => {

            if (req.query.status) {

                ensure(

                    statuses.includes(req.query.status),

                    'Invalid status.'

                );

            }

            const filter = req.query.status
                ? { status: req.query.status }
                : {};

            const records = await Model
                .find(filter)
                .sort({ [dateField]: -1 })
                .lean();

            res.json(records);

        })

    );

    // UPDATE APPROVAL STATUS
    app.patch(

        `/api/${resource}/:id/status`,

        adminOnly,

        route(async (req, res) => {

            ensure(

                ['Approved', 'Rejected'].includes(
                    req.body?.status
                ),

                'Status must be Approved or Rejected.'

            );

            const item = await Model.findOneAndUpdate(

                {
                    id: req.params.id,
                    status: 'Pending'
                },

                {
                    $set: {

                        status: req.body.status,

                        reviewedAt: new Date()

                    }
                },

                {
                    new: true,
                    runValidators: true
                }

            );

            ensure(

                item,

                'Request not found or already reviewed.',

                409

            );

            res.json({

                success: true,

                message:
                    `${label} ${item.status.toLowerCase()}.`,

                item

            });

        })

    );

    // DELETE RECORD
    app.delete(

        `/api/${resource}/:id`,

        adminOnly,

        route(async (req, res) => {

            const result = await Model.deleteOne({

                id: req.params.id

            });

            ensure(

                result.deletedCount,

                'Record not found.',

                404

            );

            res.json({
                success: true
            });

        })

    );

}

moderatorRoutes(
    'returns',
    Return,
    'Return request',
    'receivedAt'
);

moderatorRoutes(
    'submissions',
    Submission,
    'Content',
    'submittedAt'
);

// ==========================================
// REACT RESERVATION FORM
// ==========================================

app.post('/api/reservations', route(async (req, res) => {

    const data = pick(req.body, [

        'customerName',
        'customerEmail',
        'reservationDate',
        'reservationTime',
        'groupSize'

    ]);

    ensure(

        /^\d{4}-\d{2}-\d{2}$/.test(
            data.reservationDate || ''
        ),

        'Valid date is required.'

    );

    const date = new Date(
        `${data.reservationDate}T00:00:00Z`
    );

    ensure(

        !Number.isNaN(date.getTime())
        && date.toISOString().slice(0, 10)
            === data.reservationDate,

        'Valid date is required.'

    );

    ensure(

        /^([01]\d|2[0-3]):[0-5]\d$/.test(
            data.reservationTime || ''
        ),

        'Valid time is required.'

    );

    data.groupSize = Number(data.groupSize);

    ensure(

        integer(data.groupSize, 1, 20),

        'Group size must be 1–20.'

    );

    const record = await Reservation.create(data);

    res.status(201).json({

        success: true,

        message: 'Reservation saved.',

        reservationId: record.id

    });

}));

app.get(
    '/api/reservations',
    adminOnly,
    route(async (req, res) => {

        res.json(

            await Reservation
                .find()
                .sort({ receivedAt: -1 })
                .lean()

        );

    })
);

// ==========================================
// MEMBER REGISTRATION
// ==========================================

app.post('/api/members', route(async (req, res) => {

    const data = pick(req.body, [

        'name',
        'email',
        'age',
        'address',
        'phone'

    ]);

    if (Object.hasOwn(data, 'age')) {

        ensure(

            integer(data.age, 1, 120),

            'Age must be 1–120.'

        );

    }

    const record = await Member.create(data);

    res.status(201).json({

        success: true,

        message: 'Cafe signup saved successfully.',

        memberId: record.id

    });

}));

app.get(
    '/api/members',
    adminOnly,
    route(async (req, res) => {

        res.json(

            await Member
                .find()
                .sort({ joinedAt: -1 })
                .lean()

        );

    })
);

// ==========================================
// DATABASE HEALTH CHECK
// ==========================================

app.get('/api/health', (req, res) => {

    const connected =
        mongoose.connection.readyState === 1;

    res.status(connected ? 200 : 503).json({

        database: connected
            ? 'connected'
            : 'unavailable',

        name: mongoose.connection.name

    });

});

// ==========================================
// SERVE STATIC FRONTEND FILES
// ==========================================

app.use('/api', (req, res) => {

    res.status(404).json({

        errors: ['Unknown API endpoint.']

    });

});

app.use(

    express.static(
        path.join(__dirname, 'public')
    )

);

app.use((req, res) => {

    res.status(404).send('Page not found.');

});

// ==========================================
// ERROR HANDLING
// ==========================================

app.use((error, req, res, next) => {

    if (res.headersSent) {
        return next(error);
    }

    if (error.code === 11000) {

        return res.status(409).json({

            errors: [
                'A record with that identifier already exists.'
            ]

        });

    }

    if (error.name === 'ValidationError') {

        return res.status(400).json({

            errors: Object.values(error.errors)
                .map(e => e.message)

        });

    }

    if (error.status && error.status < 500) {

        return res.status(error.status).json({

            errors: [error.message]

        });

    }

    console.error(
        'API error:',
        error.name || 'Error'
    );

    res.status(500).json({

        errors: [
            'Server could not save or load the request.'
        ]

    });

});

// ==========================================
// CONNECT TO MONGODB AND START SERVER
// ==========================================

async function startServer() {

    if (

        !process.env.MONGO_URI
        || !process.env.CART_SECRET
        || process.env.CART_SECRET.length < 32

    ) {

        throw new Error(

            'Set MONGO_URI and a CART_SECRET of at least 32 characters in .env.'

        );

    }

    await mongoose.connect(

        process.env.MONGO_URI,

        {
            serverSelectionTimeoutMS: 10000
        }

    );

    // Initialize collections and database indexes.
    await Promise.all([

        Product,
        Cart,
        Shipping,
        Billing,
        Return,
        Reservation,
        Submission,
        Member

    ].map(async Model => {

        await Model.init();

    }));

    console.log('MongoDB connected successfully');

    console.log(
        `Database: ${mongoose.connection.name}`
    );

    app.listen(PORT, '127.0.0.1', () => {

        console.log(
            `Cozy Corner Cafe running: http://localhost:${PORT}`
        );

    });

}

startServer().catch(error => {

    console.error(
        'Startup failed:',
        error.message
    );

    process.exit(1);

});
