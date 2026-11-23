'use strict';

const form = document.getElementById('shippingForm');
const button = document.getElementById('shippingButton');
const message = document.getElementById('shippingMessage');

const fields = [
    'fullName',
    'email',
    'address',
    'city',
    'state',
    'zip'
];

let shippingId = null;

async function api(url, method = 'GET', body) {
    const options = { method };

    if (body !== undefined) {
        options.headers = {
            'Content-Type': 'application/json'
        };

        options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
        throw Error(
            data.errors?.join(' ') ||
            'Request failed.'
        );
    }

    return data;
}

function showError(error) {
    message.textContent = error.message;
    message.hidden = false;
}

// LOAD SAVED SHIPPING INFORMATION
async function loadShipping() {
    try {
        const cart = await api('/api/cart');

        if (!cart.length) {
            throw Error(
                'Your cart is empty. Add products before shipping.'
            );
        }

        const shipping = await api('/api/shipping');

        if (shipping) {
            shippingId = shipping.id;

            fields.forEach(field => {
                document.getElementById(field).value =
                    shipping[field] || '';
            });
        }

        button.disabled = false;
    } catch (error) {
        showError(error);
    }
}

loadShipping();

// SAVE SHIPPING INFORMATION
form.addEventListener('submit', async event => {
    event.preventDefault();

    if (
        button.disabled ||
        !form.reportValidity()
    ) {
        return;
    }

    const data = {};

    fields.forEach(field => {
        data[field] =
            document.getElementById(field).value.trim();
    });

    data.state = data.state.toUpperCase();

    button.disabled = true;
    message.hidden = true;

    try {
        if (shippingId) {
            await api(
                '/api/shipping/' +
                    encodeURIComponent(shippingId),
                'PUT',
                data
            );
        } else {
            await api(
                '/api/shipping',
                'POST',
                data
            );
        }

        window.location.href = 'cafe-billing.html';
    } catch (error) {
        showError(error);
        button.disabled = false;
    }
});
