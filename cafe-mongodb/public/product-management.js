'use strict';

let products = [];
let adminAuthorization = '';
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

function showMessage(message, type = 'success') {
    get('message').innerHTML = `
        <div class="alert alert-${type}">
            ${escapeHtml(message)}
        </div>
    `;
}

function askAdmin() {
    if (adminAuthorization) return;

    const username = prompt('Moderator username:');

    if (username === null) {
        throw Error('Operation cancelled.');
    }

    const password = prompt('Moderator password:');

    if (password === null) {
        throw Error('Operation cancelled.');
    }

    const credentials = new TextEncoder().encode(
        `${username}:${password}`
    );

    adminAuthorization = 'Basic ' +
        btoa(String.fromCharCode(...credentials));
}

async function api(
    url,
    method = 'GET',
    body,
    administrator = false
) {
    const headers = {};

    if (administrator) {
        askAdmin();
        headers.Authorization = adminAuthorization;
    }

    if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
        method,
        headers,
        ...(body === undefined
            ? {}
            : { body: JSON.stringify(body) })
    });

    const data = await response.json();

    if (!response.ok) {
        if (response.status === 401) {
            adminAuthorization = '';
        }

        throw Error(
            data.errors?.join(' ') ||
            'Request failed.'
        );
    }

    return data;
}

async function loadProducts() {
    products = await api('/api/products');

    showProducts(
        get('searchBox').value
    );
}

function getFormData() {
    const id = get('productID').value
        .trim()
        .toUpperCase();

    const name = get('productName').value.trim();
    const category = get('category').value;
    const unit = get('unit').value;
    const rawPrice = get('price').value;
    const price = Number(rawPrice);

    if (
        !id ||
        !name ||
        !category ||
        !unit ||
        rawPrice === '' ||
        !Number.isFinite(price) ||
        price < 0
    ) {
        throw Error(
            'Complete all fields with a valid price.'
        );
    }

    return {
        id,
        name,
        category,
        unit,
        price,
        image: get('productImage')?.value.trim() || ''
    };
}

function showProducts(term = '') {
    const search = term.toLowerCase();

    const filtered = products.filter(product =>
        `${product.id} ${product.name} ${product.category}`
            .toLowerCase()
            .includes(search)
    );

    get('productTableBody').innerHTML = filtered
        .map(product => `
            <tr>
                <td>${escapeHtml(product.id)}</td>
                <td>${escapeHtml(product.name)}</td>
                <td>${escapeHtml(product.category)}</td>
                <td>${escapeHtml(product.unit)}</td>
                <td>$${Number(product.price).toFixed(2)}</td>
                <td>
                    <button
                        type="button"
                        class="btn btn-sm btn-outline-secondary editBtn"
                        data-id="${escapeHtml(product.id)}">
                        Edit
                    </button>

                    <button
                        type="button"
                        class="btn btn-sm btn-outline-danger deleteBtn"
                        data-id="${escapeHtml(product.id)}">
                        Delete
                    </button>
                </td>
            </tr>
        `)
        .join('') || `
            <tr>
                <td colspan="6" class="text-center">
                    No products found.
                </td>
            </tr>
        `;
}

async function perform(action) {
    if (busy) return;

    busy = true;

    try {
        await action();
    } catch (error) {
        showMessage(error.message, 'danger');
    } finally {
        busy = false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Add an optional image URL field to the existing form.
    if (!get('productImage')) {
        const block = document.createElement('div');

        block.className = 'mb-3';

        block.innerHTML = `
            <label for="productImage" class="form-label">
                Product Image URL (Optional)
            </label>

            <input
                type="url"
                id="productImage"
                class="form-control"
                placeholder="https://example.com/image.jpg">
        `;

        get('price').parentElement.after(block);
    }

    perform(loadProducts);

    // CREATE PRODUCT
    get('productForm').addEventListener(
        'submit',
        event => {
            event.preventDefault();

            perform(async () => {
                const product = getFormData();

                await api(
                    '/api/products',
                    'POST',
                    product,
                    true
                );

                await loadProducts();
                get('productForm').reset();

                showMessage(
                    'Product added to MongoDB successfully.'
                );
            });
        }
    );

    // UPDATE PRODUCT
    get('updateBtn').addEventListener(
        'click',
        () => perform(async () => {
            const product = getFormData();

            await api(
                '/api/products/' +
                    encodeURIComponent(product.id),
                'PUT',
                product,
                true
            );

            await loadProducts();
            get('productForm').reset();

            showMessage(
                'Product updated in MongoDB successfully.'
            );
        })
    );

    // SEARCH PRODUCTS
    get('searchBox').addEventListener(
        'input',
        event => {
            showProducts(event.target.value);
        }
    );

    // EDIT / DELETE PRODUCTS
    get('productTableBody').addEventListener(
        'click',
        event => {
            const button = event.target.closest(
                'button[data-id]'
            );

            if (!button) return;

            const id = button.dataset.id;

            if (button.classList.contains('editBtn')) {
                const product = products.find(
                    item => item.id === id
                );

                if (!product) return;

                get('productID').value = product.id;
                get('productName').value = product.name;
                get('category').value = product.category;
                get('unit').value = product.unit;
                get('price').value = product.price;
                get('productImage').value =
                    product.image || '';

                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });

                return;
            }

            if (
                button.classList.contains('deleteBtn') &&
                confirm(`Delete product ${id}?`)
            ) {
                perform(async () => {
                    await api(
                        '/api/products/' +
                            encodeURIComponent(id),
                        'DELETE',
                        undefined,
                        true
                    );

                    await loadProducts();

                    showMessage(
                        'Product deleted from MongoDB.'
                    );
                });
            }
        }
    );

    // DOWNLOAD CURRENT PRODUCT DATA
    get('downloadBtn').addEventListener(
        'click',
        () => perform(async () => {
            await loadProducts();

            const blob = new Blob(
                [JSON.stringify(products, null, 2)],
                { type: 'application/json' }
            );

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');

            link.href = url;
            link.download = 'products.json';
            link.click();

            URL.revokeObjectURL(url);
        })
    );
});
