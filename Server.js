
'use strict';

const express = require('express');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const PRIVATE = path.join(ROOT, '.cafe-private');

const FILES = {
    billing: path.join(PRIVATE, 'billing.json'),
    returns: path.join(PRIVATE, 'returns.json'),
    submissions: path.join(PRIVATE, 'submissions.json'),
    reservations: path.join(PRIVATE, 'reservations.json')
};

const ADMIN_USER = process.env.CAFE_ADMIN_USER;
const ADMIN_PASSWORD = process.env.CAFE_ADMIN_PASSWORD;
const SHIPPING = 2;
const ALLOWED_STATUSES = ['Approved', 'Rejected'];
const CATEGORIES = [
    'Cafe Story',
    'Recipe Idea',
    'Community Event'
];

const queue = new Map();

app.disable('x-powered-by');
app.use(express.json({ limit: '64kb' }));

function bad(res, errors) {
    return res.status(400).json({
        success: false,
        errors
    });
}

function nonempty(value, min = 1, max = 2000) {
    return typeof value === 'string' &&
        value.trim().length >= min &&
        value.trim().length <= max;
}

function text(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function money(number) {
    return Math.round(
        (number + Number.EPSILON) * 100
    ) / 100;
}

async function readList(file) {
    try {
        const data = JSON.parse(
            await fs.readFile(file, 'utf8')
        );

        if (!Array.isArray(data)) {
            throw new Error('Storage data is not an array');
        }

        return data;
    } catch (error) {
        if (error.code === 'ENOENT') {
            return [];
        }

        throw error;
    }
}

async function updateList(file, operation) {
    const prior = queue.get(file) || Promise.resolve();

    const current = prior.catch(() => {}).then(async () => {
        const records = await readList(file);
        const result = operation(records);

        if (result === null) {
            return null;
        }

        await fs.mkdir(PRIVATE, {
            recursive: true,
            mode: 0o700
        });

        const temp =
            file + '.' + crypto.randomUUID() + '.tmp';

        await fs.writeFile(
            temp,
            JSON.stringify(records, null, 2),
            { mode: 0o600 }
        );

        await fs.rename(temp, file);
        return result;
    });

    queue.set(file, current);

    current.finally(() => {
        if (queue.get(file) === current) {
            queue.delete(file);
        }
    }).catch(() => {});

    return current;
}

function safeError(res, error) {
    console.error(error);

    return res.status(500).json({
        success: false,
        errors: [
            'Server could not save or load the request.'
        ]
    });
}

function adminOnly(req, res, next) {
    if (!ADMIN_USER || !ADMIN_PASSWORD) {
        return res.status(503).json({
            errors: [
                'Set CAFE_ADMIN_USER and CAFE_ADMIN_PASSWORD before starting the server.'
            ]
        });
    }

    const header = req.get('authorization') || '';
    let user = '';
    let pass = '';

    if (header.startsWith('Basic ')) {
        const decoded = Buffer.from(
            header.slice(6),
            'base64'
        ).toString('utf8');

        const index = decoded.indexOf(':');

        if (index >= 0) {
            user = decoded.slice(0, index);
            pass = decoded.slice(index + 1);
        }
    }

    const hash = value =>
        crypto.createHash('sha256')
            .update(value)
            .digest();

    if (
        !crypto.timingSafeEqual(
            hash(user),
            hash(ADMIN_USER)
        ) ||
        !crypto.timingSafeEqual(
            hash(pass),
            hash(ADMIN_PASSWORD)
        )
    ) {
        return res.status(401).json({
            errors: ['Invalid moderator credentials.']
        });
    }

    next();
}

// PRODUCT CATALOG
app.get('/api/products', async (req, res) => {
    try {
        const data = JSON.parse(
            await fs.readFile(
                path.join(ROOT, 'products.json'),
                'utf8'
            )
        );

        res.json(data);
    } catch (error) {
        safeError(res, error);
    }
});

// BILLING DEMO
app.post('/api/billing', async (req, res) => {
    const {
        fullName,
        address,
        paymentMethod,
        orderSummary
    } = req.body || {};

    const errors = [];

    if (!nonempty(fullName, 2, 120)) {
        errors.push('Enter a valid full name.');
    }

    if (!nonempty(address, 5, 300)) {
        errors.push('Enter a valid billing address.');
    }

    if (
        req.body &&
        (
            'cardNumber' in req.body ||
            'cvv' in req.body
        )
    ) {
        errors.push(
            'Do not send full payment card numbers or CVV to this demo API.'
        );
    }

    if (
        !paymentMethod ||
        paymentMethod.type !== 'demo_card' ||
        !/^\d{4}$/.test(
            String(paymentMethod.lastFourDigits || '')
        ) ||
        !/^(0[1-9]|1[0-2])\/\d{2}$/.test(
            String(paymentMethod.expiry || '')
        )
    ) {
        errors.push(
            'Masked demo card number and expiration month are required.'
        );
    }

    if (
        !orderSummary ||
        !Array.isArray(orderSummary.items) ||
        !orderSummary.items.length
    ) {
        errors.push('A non-empty order is required.');
    }

    if (errors.length) {
        return bad(res, errors);
    }

    try {
        const products = JSON.parse(
            await fs.readFile(
                path.join(ROOT, 'products.json'),
                'utf8'
            )
        );

        const items = [];

        for (const selected of orderSummary.items) {
            const product = products.find(
                p => p.id === selected.id
            );

            const quantity = Number(
                selected.quantity
            );

            if (
                !product ||
                !Number.isInteger(quantity) ||
                quantity < 1 ||
                quantity > 99
            ) {
                return bad(res, [
                    'Order contains an unknown product or invalid quantity.'
                ]);
            }

            items.push({
                id: product.id,
                name: product.name,
                price: Number(product.price),
                quantity
            });
        }

        const subtotal = money(
            items.reduce(
                (sum, item) =>
                    sum + item.price * item.quantity,
                0
            )
        );

        const record = {
            id: crypto.randomUUID(),
            name: text(fullName),
            address: text(address),

            paymentMethod: {
                type: 'Demo card',
                lastFourDigits:
                    paymentMethod.lastFourDigits,
                expiry: paymentMethod.expiry
            },

            orderSummary: {
                items,
                totalItems: items.reduce(
                    (sum, p) => sum + p.quantity,
                    0
                ),
                subtotal,
                shipping: SHIPPING,
                total: money(subtotal + SHIPPING)
            },

            status: 'Recorded (no payment charged)',
            receivedAt: new Date().toISOString()
        };

        await updateList(FILES.billing, records => {
            records.push(record);
            return record;
        });

        res.status(201).json({
            success: true,
            message:
                'Demo billing recorded. No payment was charged.',
            orderId: record.id
        });
    } catch (error) {
        safeError(res, error);
    }
});

// RETURNS SUBMISSION
app.post('/api/returns', async (req, res) => {
    const {
        items,
        reason,
        condition,
        comments
    } = req.body || {};

    const errors = [];

    if (
        !Array.isArray(items) ||
        !items.length ||
        items.length > 30
    ) {
        errors.push('Select 1–30 products.');
    }

    if (!nonempty(reason, 3, 200)) {
        errors.push('Return reason is required.');
    }

    if (!nonempty(condition, 3, 100)) {
        errors.push('Product condition is required.');
    }

    if (
        comments !== undefined &&
        !nonempty(comments, 0, 1000)
    ) {
        errors.push(
            'Comments cannot exceed 1,000 characters.'
        );
    }

    if (errors.length) {
        return bad(res, errors);
    }

    try {
        const catalog = JSON.parse(
            await fs.readFile(
                path.join(ROOT, 'products.json'),
                'utf8'
            )
        );

        const selected = [];

        for (const item of items) {
            const product = catalog.find(
                p => p.id === item.id
            );

            if (!product) {
                return bad(res, [
                    'One or more products are not in the cafe catalog.'
                ]);
            }

            if (
                !selected.some(
                    p => p.id === product.id
                )
            ) {
                selected.push({
                    id: product.id,
                    name: product.name,
                    price: Number(product.price),
                    image: product.image || ''
                });
            }
        }

        const record = {
            id: crypto.randomUUID(),
            items: selected,
            reason: text(reason),
            condition: text(condition),
            comments: text(comments),
            status: 'Pending',
            receivedAt: new Date().toISOString()
        };

        await updateList(FILES.returns, list => {
            list.push(record);
            return record;
        });

        res.status(201).json({
            success: true,
            message:
                'Return request submitted for review.',
            returnId: record.id,
            status: record.status
        });
    } catch (error) {
        safeError(res, error);
    }
});

// MODERATOR: LIST RETURNS
app.get('/api/returns', adminOnly, async (req, res) => {
    try {
        const list = await readList(FILES.returns);

        res.json(
            req.query.status
                ? list.filter(
                    item =>
                        item.status === req.query.status
                )
                : list
        );
    } catch (error) {
        safeError(res, error);
    }
});

// MODERATOR: APPROVE OR REJECT RETURNS
app.patch(
    '/api/returns/:id/status',
    adminOnly,
    async (req, res) => {
        if (
            !ALLOWED_STATUSES.includes(
                req.body?.status
            )
        ) {
            return bad(res, [
                'Status must be Approved or Rejected.'
            ]);
        }

        try {
            const record = await updateList(
                FILES.returns,
                list => {
                    const item = list.find(
                        v => v.id === req.params.id
                    );

                    if (
                        !item ||
                        item.status !== 'Pending'
                    ) {
                        return null;
                    }

                    item.status = req.body.status;
                    item.reviewedAt =
                        new Date().toISOString();

                    return item;
                }
            );

            if (!record) {
                return res.status(409).json({
                    errors: [
                        'Request not found or already reviewed.'
                    ]
                });
            }

            res.json({
                success: true,
                message:
                    'Return request ' +
                    record.status.toLowerCase() +
                    '.',
                item: record
            });
        } catch (error) {
            safeError(res, error);
        }
    }
);

// CONTENT SUBMISSION
app.post('/api/submissions', async (req, res) => {
    const {
        title,
        author,
        category,
        content
    } = req.body || {};

    const errors = [];

    if (!nonempty(title, 5, 120)) {
        errors.push(
            'Title must be 5–120 characters.'
        );
    }

    if (!nonempty(author, 2, 100)) {
        errors.push(
            'Name must be 2–100 characters.'
        );
    }

    if (!CATEGORIES.includes(category)) {
        errors.push('Choose a valid category.');
    }

    if (!nonempty(content, 20, 5000)) {
        errors.push(
            'Content must be 20–5,000 characters.'
        );
    }

    if (errors.length) {
        return bad(res, errors);
    }

    const record = {
        id: crypto.randomUUID(),
        title: text(title),
        author: text(author),
        category,
        content: text(content),
        status: 'Pending',
        submittedAt: new Date().toISOString()
    };

    try {
        await updateList(
            FILES.submissions,
            list => {
                list.push(record);
                return record;
            }
        );

        res.status(201).json({
            success: true,
            message:
                'Content submitted for moderator approval.',
            submissionId: record.id,
            status: record.status
        });
    } catch (error) {
        safeError(res, error);
    }
});

// MODERATOR: LIST CONTENT
app.get(
    '/api/submissions',
    adminOnly,
    async (req, res) => {
        try {
            const list =
                await readList(FILES.submissions);

            res.json(
                req.query.status
                    ? list.filter(
                        item =>
                            item.status ===
                            req.query.status
                    )
                    : list
            );
        } catch (error) {
            safeError(res, error);
        }
    }
);

// MODERATOR: APPROVE OR REJECT CONTENT
app.patch(
    '/api/submissions/:id/status',
    adminOnly,
    async (req, res) => {
        if (
            !ALLOWED_STATUSES.includes(
                req.body?.status
            )
        ) {
            return bad(res, [
                'Status must be Approved or Rejected.'
            ]);
        }

        try {
            const record = await updateList(
                FILES.submissions,
                list => {
                    const item = list.find(
                        v => v.id === req.params.id
                    );

                    if (
                        !item ||
                        item.status !== 'Pending'
                    ) {
                        return null;
                    }

                    item.status = req.body.status;
                    item.reviewedAt =
                        new Date().toISOString();

                    return item;
                }
            );

            if (!record) {
                return res.status(409).json({
                    errors: [
                        'Submission not found or already reviewed.'
                    ]
                });
            }

            res.json({
                success: true,
                message:
                    'Content ' +
                    record.status.toLowerCase() +
                    '.',
                item: record
            });
        } catch (error) {
            safeError(res, error);
        }
    }
);

// RESERVATIONS
app.post('/api/reservations', async (req, res) => {
    const {
        customerName,
        customerEmail,
        reservationDate,
        reservationTime,
        groupSize
    } = req.body || {};

    const errors = [];

    if (!nonempty(customerName, 2, 120)) {
        errors.push(
            'Customer name is required.'
        );
    }

    if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            text(customerEmail)
        )
    ) {
        errors.push('Valid email is required.');
    }

    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
            text(reservationDate)
        ) ||
        Number.isNaN(
            Date.parse(reservationDate)
        )
    ) {
        errors.push('Valid date is required.');
    }

    if (
        !/^\d{2}:\d{2}$/.test(
            text(reservationTime)
        )
    ) {
        errors.push('Valid time is required.');
    }

    if (
        !Number.isInteger(
            Number(groupSize)
        ) ||
        Number(groupSize) < 1 ||
        Number(groupSize) > 20
    ) {
        errors.push(
            'Group size must be 1–20.'
        );
    }

    if (errors.length) {
        return bad(res, errors);
    }

    const record = {
        id: crypto.randomUUID(),
        customerName: text(customerName),
        customerEmail: text(customerEmail),
        reservationDate,
        reservationTime,
        groupSize: Number(groupSize),
        receivedAt: new Date().toISOString()
    };

    try {
        await updateList(
            FILES.reservations,
            list => {
                list.push(record);
                return record;
            }
        );

        res.status(201).json({
            success: true,
            message: 'Reservation saved.',
            reservationId: record.id
        });
    } catch (error) {
        safeError(res, error);
    }
});

// PUBLIC FILE ALLOWLIST
const publicFiles = new Set([
    'index.html',
    'Style.Css',
    'signup.css',
    'product-management.css',
    'product-management.html',
    'product-management.js',
    'cafe-shopping-cart.html',
    'cafe-shopping-cart.js',
    'cafe-billing.html',
    'billing.js',
    'cafe-returns.html',
    'app.js',
    'returns-search.js',
    'reservation.html',
    'cafe-reservation.js',
    'User Sign-Up Page.html',
    'register.js',
    'signup.js',
    'products.json',
    'content-submit.html',
    'content-submit.js',
    'moderator.html',
    'moderator.js'
]);

app.get('/', (req, res) => {
    res.sendFile(
        path.join(ROOT, 'index.html')
    );
});

app.get('/:file', (req, res) => {
    if (!publicFiles.has(req.params.file)) {
        return res.sendStatus(404);
    }

    res.sendFile(
        path.join(ROOT, req.params.file)
    );
});

app.use('/api', (req, res) => {
    res.status(404).json({
        errors: ['Unknown API endpoint.']
    });
});

app.listen(
    PORT,
    '127.0.0.1',
    () => {
        console.log(
            `Cafe demo running: http://127.0.0.1:${PORT}`
        );
    }
);
