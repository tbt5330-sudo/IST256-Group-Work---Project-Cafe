'use strict';

let products = [];
let shoppingCart = [];
let busy = false;

const get = id => document.getElementById(id);

function escapeHtml(value) {
    return String(value ?? '').replace(
        /[&<>"']/g,
        character => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[character])
    );
}

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

function message(text = '') {
    const display = get('cartMessage');

    display.textContent = text;
    display.hidden = !text;
}

async function perform(action) {
    if (busy) return;

    busy = true;
    message();

    try {
        await action();
    } catch (error) {
        message(error.message);
    } finally {
        busy = false;
    }
}

function showAvailableProducts(term = '') {
    const search = term.toLowerCase();

    get('productList').innerHTML = products
        .filter(product =>
            `${product.id} ${product.name} ${product.category}`
                .toLowerCase()
                .includes(search)
        )
        .map(product => `
            <tr>
                <td>${escapeHtml(product.name)}</td>
                <td>${escapeHtml(product.category)}</td>
                <td>$${Number(product.price).toFixed(2)}</td>
                <td>
                    <button
                        type="button"
                        class="btn btn-add addToCartBtn"
                        data-id="${escapeHtml(product.id)}">
                        Add to Cart
                    </button>
                </td>
            </tr>
        `)
        .join('') || `
            <tr>
                <td colspan="4" class="text-center">
                    No products found.
                </td>
            </tr>
        `;
}

function showCart() {
    let count = 0;
    let total = 0;

    const rows = shoppingCart.map(item => {
        const quantity = Number(item.quantity);
        const price = Number(item.price);

        count += quantity;
        total += quantity * price;

        return `
            <tr>
                <td>${escapeHtml(item.name)}</td>

                <td>
                    <div class="d-flex align-items-center gap-2">
                        <button
                            type="button"
                            class="btn btn-sm btn-outline-secondary qtyBtn"
                            data-id="${escapeHtml(item.id)}"
                            data-qty="${quantity - 1}"
                            ${quantity <= 1 ? 'disabled' : ''}>
                            -
                        </button>

                        <span>${quantity}</span>

                        <button
                            type="button"
                            class="btn btn-sm btn-outline-secondary qtyBtn"
                            data-id="${escapeHtml(item.id)}"
                            data-qty="${quantity + 1}"
                            ${quantity >= 99 ? 'disabled' : ''}>
                            +
                        </button>
                    </div>
                </td>

                <td>$${price.toFixed(2)}</td>
                <td>$${(price * quantity).toFixed(2)}</td>

                <td>
                    <button
                        type="button"
                        class="btn btn-remove removeBtn"
                        data-id="${escapeHtml(item.id)}">
                        Remove
                    </button>
                </td>
            </tr>
        `;
    });

    get('cartTableBody').innerHTML = rows.join('') || `
        <tr>
            <td colspan="5" class="text-center">
                Your cart is empty.
            </td>
        </tr>
    `;

    get('itemCount').textContent = count;

    get('grandTotal').textContent =
        '$' + total.toFixed(2);
}

document.addEventListener('DOMContentLoaded', () => {
    const notice = document.createElement('div');

    notice.id = 'cartMessage';
    notice.className = 'alert alert-danger';
    notice.hidden = true;

    const container = get('searchBox').closest('.container');

    if (container) {
        container.prepend(notice);
    } else {
        document.body.prepend(notice);
    }

    // READ PRODUCTS AND CART FROM MONGODB
    perform(async () => {
        shoppingCart = await api('/api/cart');
        products = await api('/api/products');

        showAvailableProducts();
        showCart();
    });

    get('searchBox').addEventListener(
        'input',
        event => {
            showAvailableProducts(event.target.value);
        }
    );

    // CREATE CART ITEM
    get('productList').addEventListener(
        'click',
        event => {
            const button = event.target.closest(
                '.addToCartBtn'
            );

            if (!button) return;

            perform(async () => {
                shoppingCart = await api(
                    '/api/cart',
                    'POST',
                    {
                        productId: button.dataset.id,
                        quantity: 1
                    }
                );

                showCart();
            });
        }
    );

    // UPDATE OR DELETE CART ITEM
    get('cartTableBody').addEventListener(
        'click',
        event => {
            const button = event.target.closest(
                'button[data-id]'
            );

            if (!button) return;

            perform(async () => {
                const url = '/api/cart/' +
                    encodeURIComponent(button.dataset.id);

                if (button.classList.contains('removeBtn')) {
                    shoppingCart = await api(
                        url,
                        'DELETE'
                    );
                } else {
                    shoppingCart = await api(
                        url,
                        'PUT',
                        {
                            quantity: Number(
                                button.dataset.qty
                            )
                        }
                    );
                }

                showCart();
            });
        }
    );

    // PROCEED TO SHIPPING
    document.querySelectorAll('.btn-checkout')
        .forEach(button => {
            button.addEventListener('click', event => {
                event.preventDefault();

                if (busy) return;

                if (!shoppingCart.length) {
                    message('Your shopping cart is empty.');
                    return;
                }

                window.location.href = 'shipping.html';
            });
        });
});
