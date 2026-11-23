'use strict';

document.addEventListener('DOMContentLoaded', async () => {
    const menu = document.getElementById('live-menu');

    if (!menu) return;

    try {
        const response = await fetch('/api/products');

        if (!response.ok) {
            throw Error('Unable to load menu.');
        }

        const products = await response.json();

        menu.replaceChildren();

        const descriptions = {
            LAT001:
                'Smooth espresso blended with creamy steamed milk.',
            CRO002:
                'A golden, flaky pastry baked for a perfect morning.',
            CAK003:
                'A rich chocolate treat for your afternoon break.'
        };

        products.forEach(product => {
            const column = document.createElement('div');
            column.className = 'col-md-4';

            const card = document.createElement('div');
            card.className = 'card menu-card h-100';

            if (
                product.image &&
                product.image.startsWith('https://')
            ) {
                const image = document.createElement('img');

                image.className = 'card-img-top';
                image.src = product.image;
                image.alt = product.name;

                card.appendChild(image);
            }

            const body = document.createElement('div');
            body.className = 'card-body text-center';

            const title = document.createElement('h3');
            title.className = 'card-title';
            title.textContent = product.name;

            const description = document.createElement('p');
            description.className = 'card-text';
            description.textContent =
                descriptions[product.id] ||
                `${product.category} - ${product.unit}`;

            const price = document.createElement('p');
            price.className = 'menu-price';
            price.textContent =
                '$' + Number(product.price).toFixed(2);

            body.append(
                title,
                description,
                price
            );

            card.appendChild(body);
            column.appendChild(card);
            menu.appendChild(column);
        });

        if (!products.length) {
            menu.textContent =
                'No products are currently available.';
        }
    } catch (error) {
        menu.textContent = error.message;
    }
});
