'use strict';

require('dotenv').config();

const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

const BASE_URL = process.env.BASE_URL ||
    `http://127.0.0.1:${process.env.PORT || 3000}`;

const USERNAME = process.env.CAFE_ADMIN_USER;
const PASSWORD = process.env.CAFE_ADMIN_PASSWORD;

const adminAuth = 'Basic ' +
    Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64');

const suffix = randomUUID().slice(0, 8);
const productId = 'TEST-' + suffix.toUpperCase();

const customer = { cookie: '' };
const otherCustomer = { cookie: '' };

async function request(
    method,
    endpoint,
    body,
    {
        session,
        admin = false,
        expected = 200
    } = {}
) {
    const headers = {};

    if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
    }

    if (admin) {
        headers.Authorization = adminAuth;
    }

    if (session && session.cookie) {
        headers.Cookie = session.cookie;
    }

    const response = await fetch(
        BASE_URL + endpoint,
        {
            method,
            headers,
            ...(body === undefined
                ? {}
                : { body: JSON.stringify(body) })
        }
    );

    if (session) {
        const cookies = response.headers.getSetCookie();

        for (const cookie of cookies) {
            if (cookie.startsWith('cafeCartId=')) {
                session.cookie = cookie.split(';')[0];
            }
        }
    }

    const data = await response.json();

    assert.equal(
        response.status,
        expected,
        `${method} ${endpoint}: ${JSON.stringify(data)}`
    );

    return data;
}

async function runTests() {
    assert.ok(
        USERNAME && PASSWORD,
        'Configure administrator credentials in .env.'
    );

    // ====================================
    // DATABASE CONNECTION
    // ====================================
    const health = await request(
        'GET',
        '/api/health'
    );

    assert.equal(health.database, 'connected');

    console.log('PASS: MongoDB connection');

    // ====================================
    // PRODUCT CREATE
    // ====================================
    const newProduct = {
        id: productId,
        name: 'Test Cappuccino',
        category: 'Coffee',
        unit: 'Cup',
        price: 5,
        image: ''
    };

    await request(
        'POST',
        '/api/products',
        newProduct,
        { expected: 401 }
    );

    await request(
        'POST',
        '/api/products',
        newProduct,
        {
            admin: true,
            expected: 201
        }
    );

    // ====================================
    // PRODUCT READ
    // ====================================
    const product = await request(
        'GET',
        '/api/products/' + productId
    );

    assert.equal(product.name, 'Test Cappuccino');
    assert.equal(product.price, 5);

    // ====================================
    // PRODUCT UPDATE
    // ====================================
    const updatedProduct = await request(
        'PUT',
        '/api/products/' + productId,
        {
            price: 5.5
        },
        { admin: true }
    );

    assert.equal(updatedProduct.price, 5.5);

    console.log(
        'PASS: Product Create, Read, Update and authentication'
    );

    // ====================================
    // SHOPPING CART CREATE
    // ====================================
    const initialCart = await request(
        'GET',
        '/api/cart',
        undefined,
        { session: customer }
    );

    assert.deepEqual(initialCart, []);

    await request(
        'POST',
        '/api/cart',
        {
            productId,
            quantity: 1
        },
        {
            session: customer,
            expected: 201
        }
    );

    // ====================================
    // SHOPPING CART READ
    // ====================================
    const cart = await request(
        'GET',
        '/api/cart',
        undefined,
        { session: customer }
    );

    assert.equal(cart.length, 1);
    assert.equal(cart[0].quantity, 1);

    // Different customers must have different carts.
    const separateCart = await request(
        'GET',
        '/api/cart',
        undefined,
        { session: otherCustomer }
    );

    assert.deepEqual(separateCart, []);

    // ====================================
    // SHOPPING CART UPDATE
    // ====================================
    const updatedCart = await request(
        'PUT',
        '/api/cart/' + productId,
        { quantity: 2 },
        { session: customer }
    );

    assert.equal(updatedCart[0].quantity, 2);

    // ====================================
    // SHOPPING CART DELETE
    // ====================================
    const emptyCart = await request(
        'DELETE',
        '/api/cart/' + productId,
        undefined,
        { session: customer }
    );

    assert.deepEqual(emptyCart, []);

    console.log(
        'PASS: Shopping Cart Create, Read, Update and Delete'
    );

    console.log(
        'PASS: Separate shopping carts for different customers'
    );

    // Add the product again for checkout testing.
    await request(
        'POST',
        '/api/cart',
        {
            productId,
            quantity: 2
        },
        {
            session: customer,
            expected: 201
        }
    );

    // ====================================
    // SHIPPING CREATE
    // ====================================
    const shippingData = {
        fullName: 'Demo Customer',
        email: `demo-${suffix}@example.com`,
        address: '100 Fictional Street',
        city: 'Example City',
        state: 'PA',
        zip: '17057'
    };

    const shipping = await request(
        'POST',
        '/api/shipping',
        shippingData,
        {
            session: customer,
            expected: 201
        }
    );

    assert.ok(shipping.id);

    // ====================================
    // SHIPPING READ
    // ====================================
    const savedShipping = await request(
        'GET',
        '/api/shipping',
        undefined,
        { session: customer }
    );

    assert.equal(savedShipping.id, shipping.id);

    // ====================================
    // SHIPPING UPDATE
    // ====================================
    const changedShipping = await request(
        'PUT',
        '/api/shipping/' + shipping.id,
        {
            ...shippingData,
            city: 'Updated City'
        },
        { session: customer }
    );

    assert.equal(changedShipping.city, 'Updated City');

    console.log(
        'PASS: Shipping Create, Read and Update'
    );

    // ====================================
    // BILLING CREATE
    // ====================================
    const billing = await request(
        'POST',
        '/api/billing',
        {
            fullName: 'Demo Customer',
            address: '100 Fictional Street',
            paymentMethod: {
                type: 'demo_card',
                lastFourDigits: '4242',
                expiry: '12/39'
            }
        },
        {
            session: customer,
            expected: 201
        }
    );

    assert.ok(billing.orderId);

    // ====================================
    // BILLING READ
    // ====================================
    const orders = await request(
        'GET',
        '/api/billing',
        undefined,
        { admin: true }
    );

    const order = orders.find(
        item => item.id === billing.orderId
    );

    assert.ok(order);

    // 2 items at $5.50 + $2.00 shipping
    assert.equal(order.orderSummary.total, 13);

    assert.equal(order.shippingId, shipping.id);

    // Confirm the cart is empty after checkout.
    const postCheckoutCart = await request(
        'GET',
        '/api/cart',
        undefined,
        { session: customer }
    );

    assert.deepEqual(postCheckoutCart, []);

    console.log(
        'PASS: Billing persisted in MongoDB'
    );

    console.log(
        'PASS: Server-calculated order totals'
    );

    console.log(
        'PASS: Cart cleared after checkout'
    );

    // ====================================
    // RETURNS
    // ====================================
    const returnRequest = await request(
        'POST',
        '/api/returns',
        {
            items: [
                { id: productId }
            ],
            reason: 'Incorrect item',
            condition: 'Unused',
            comments: 'Fictional database lab test'
        },
        { expected: 201 }
    );

    assert.ok(returnRequest.returnId);

    // Moderator approves a return.
    const reviewedReturn = await request(
        'PATCH',
        `/api/returns/${returnRequest.returnId}/status`,
        {
            status: 'Approved'
        },
        { admin: true }
    );

    assert.equal(
        reviewedReturn.item.status,
        'Approved'
    );

    console.log(
        'PASS: Returns and moderator approval'
    );

    // ====================================
    // RESERVATIONS
    // ====================================
    const reservation = await request(
        'POST',
        '/api/reservations',
        {
            customerName: 'Demo Customer',
            customerEmail: `demo-${suffix}@example.com`,
            reservationDate: '2030-06-01',
            reservationTime: '12:00',
            groupSize: 2
        },
        { expected: 201 }
    );

    assert.ok(reservation.reservationId);

    console.log('PASS: Reservations');

    // ====================================
    // MEMBERS
    // ====================================
    const member = await request(
        'POST',
        '/api/members',
        {
            name: 'Demo Customer',
            email: `demo-${suffix}@example.com`,
            age: 25,
            address: '100 Fictional Street',
            phone: '555-0100'
        },
        { expected: 201 }
    );

    assert.ok(member.memberId);

    console.log('PASS: Member registration');

    // ====================================
    // COMMUNITY SUBMISSIONS
    // ====================================
    const submission = await request(
        'POST',
        '/api/submissions',
        {
            title: 'Demo Cafe Story',
            author: 'Demo Author',
            category: 'Cafe Story',
            content:
                'This is fictional content for our MongoDB lab.'
        },
        { expected: 201 }
    );

    assert.ok(submission.submissionId);

    const approvedSubmission = await request(
        'PATCH',
        `/api/submissions/${submission.submissionId}/status`,
        {
            status: 'Approved'
        },
        { admin: true }
    );

    assert.equal(
        approvedSubmission.item.status,
        'Approved'
    );

    console.log(
        'PASS: Community submissions and moderator approval'
    );

    // ====================================
    // PRODUCT DELETE
    // ====================================
    await request(
        'DELETE',
        '/api/products/' + productId,
        undefined,
        { admin: true }
    );

    await request(
        'GET',
        '/api/products/' + productId,
        undefined,
        { expected: 404 }
    );

    console.log('PASS: Product Delete');

    console.log('----------------------------------');
    console.log('ALL API SMOKE TESTS PASSED');
    console.log('----------------------------------');
}

runTests().catch(error => {
    console.error('TEST FAILED:', error.message);
    process.exitCode = 1;
});
