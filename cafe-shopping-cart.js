
'use strict';

let products = [];
let shoppingCart = [];

$(document).ready(function () {
  loadCartProducts();
  loadCart();

  $('#searchBox').on('input', function () {
    showAvailableProducts($(this).val());
  });

  $('#productList').on('click', '.addToCartBtn', function () {
    addToCart($(this).attr('data-id'));
  });

  $('#cartTableBody').on('click', '.removeBtn', function () {
    removeFromCart($(this).attr('data-id'));
  });

  $('.btn-checkout').on('click', function () {
    if (!shoppingCart.length) {
      alert('Your shopping cart is empty.');
      return;
    }

    window.location.href = 'cafe-billing.html';
  });
});

function safeCart(items) {
  return Array.isArray(items)
    ? items.filter(item =>
        item &&
        typeof item.id === 'string' &&
        Number.isInteger(Number(item.quantity)) &&
        Number(item.quantity) > 0
      )
    : [];
}

function loadCartProducts() {
  try {
    const saved = localStorage.getItem('cafeProducts');

    if (saved) {
      const parsed = JSON.parse(saved);

      if (Array.isArray(parsed)) {
        products = parsed;
        showAvailableProducts('');
        return;
      }
    }
  } catch (error) {
    console.warn(
      'Saved products unavailable; loading catalog.',
      error
    );
  }

  $.getJSON('products.json')
    .done(function (data) {
      products = Array.isArray(data) ? data : [];
      showAvailableProducts('');
    })
    .fail(function () {
      $('#productList').html(
        '<tr><td colspan="4">Unable to load cafe products.</td></tr>'
      );
    });
}

function loadCart() {
  try {
    shoppingCart = safeCart(
      JSON.parse(
        localStorage.getItem('cafeShoppingCart') || '[]'
      )
    );
  } catch (_) {
    shoppingCart = [];
  }

  showCart();
}

function saveCart() {
  localStorage.setItem(
    'cafeShoppingCart',
    JSON.stringify(shoppingCart)
  );
}

function escapeHtml(value) {
  return $('<div>')
    .text(String(value == null ? '' : value))
    .html();
}

function showAvailableProducts(term) {
  const search = String(term || '').toLowerCase();
  let rows = '';

  products.forEach(function (product) {
    const words = (
      product.id + ' ' +
      product.name + ' ' +
      product.category
    ).toLowerCase();

    if (!words.includes(search)) return;

    rows += `
      <tr>
        <td>${escapeHtml(product.name)}</td>
        <td>${escapeHtml(product.category)}</td>
        <td>$${Number(product.price).toFixed(2)}</td>
        <td>
          <button type="button"
                  class="btn btn-add addToCartBtn"
                  data-id="${escapeHtml(product.id)}">
            Add to Cart
          </button>
        </td>
      </tr>
    `;
  });

  $('#productList').html(
    rows ||
    '<tr><td colspan="4" class="text-center">No products found.</td></tr>'
  );
}

function addToCart(id) {
  const product = products.find(
    p => p.id === id
  );

  if (!product) return;

  const existing = shoppingCart.find(
    p => p.id === id
  );

  if (existing) {
    existing.quantity = Math.min(
      99,
      Number(existing.quantity) + 1
    );
  } else {
    shoppingCart.push({
      id: product.id,
      name: product.name,
      category: product.category,
      unit: product.unit,
      price: Number(product.price),
      quantity: 1
    });
  }

  saveCart();
  showCart();
}

function removeFromCart(id) {
  shoppingCart = shoppingCart.filter(
    p => p.id !== id
  );

  saveCart();
  showCart();
}

function showCart() {
  let rows = '';
  let items = 0;
  let total = 0;

  shoppingCart.forEach(function (item) {
    const quantity = Number(item.quantity);
    const price = Number(item.price);
    const line = price * quantity;

    items += quantity;
    total += line;

    rows += `
      <tr>
        <td>${escapeHtml(item.name)}</td>
        <td>${quantity}</td>
        <td>$${price.toFixed(2)}</td>
        <td>$${line.toFixed(2)}</td>
        <td>
          <button type="button"
                  class="btn btn-remove removeBtn"
                  data-id="${escapeHtml(item.id)}">
            Remove
          </button>
        </td>
      </tr>
    `;
  });

  $('#cartTableBody').html(
    rows ||
    '<tr><td colspan="5" class="text-center">Your cart is empty.</td></tr>'
  );

  $('#itemCount').text(items);
  $('#grandTotal').text('$' + total.toFixed(2));
}
