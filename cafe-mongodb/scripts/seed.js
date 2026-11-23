'use strict';

require('dotenv').config();

const mongoose = require('mongoose');
const path = require('node:path');
const fs = require('node:fs/promises');

const { Product } = require('../models');

async function seedProducts() {
    try {
        const uri = process.env.MONGO_URI;

        if (!uri) {
            throw new Error(
                'MONGO_URI is missing. Configure your .env file.'
            );
        }

        const filePath = path.join(
            __dirname,
            '..',
            'data',
            'products.json'
        );

        const raw = await fs.readFile(filePath, 'utf8');
        const products = JSON.parse(raw);

        if (!Array.isArray(products)) {
            throw new Error(
                'data/products.json must contain a JSON array.'
            );
        }

        console.log('Connecting to MongoDB...');

        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 10000
        });

        console.log(
            'Connected to database:',
            mongoose.connection.name
        );

        await Product.init();

        let inserted = 0;
        let existing = 0;

        for (const product of products) {
            const result = await Product.updateOne(
                {
                    id: product.id
                },
                {
                    $setOnInsert: {
                        id: product.id,
                        name: product.name,
                        category: product.category,
                        unit: product.unit,
                        price: product.price,
                        image: product.image || ''
                    }
                },
                {
                    upsert: true,
                    runValidators: true
                }
            );

            if (result.upsertedCount) {
                inserted++;
            } else {
                existing++;
            }
        }

        const count = await Product.countDocuments();

        console.log('Database seeding complete.');
        console.log('Products inserted:', inserted);
        console.log('Products already present:', existing);
        console.log('Total products in MongoDB:', count);

    } catch (error) {
        console.error(
            'Database seed failed:',
            error.message
        );

        process.exitCode = 1;

    } finally {
        await mongoose.disconnect();
    }
}

seedProducts();
