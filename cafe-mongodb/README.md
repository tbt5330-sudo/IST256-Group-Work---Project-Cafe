# Cozy Corner Cafe

## IST256 - MongoDB Database Integration Project

Cozy Corner Cafe is a web-based cafe storefront developed
using Node.js, Express, MongoDB, HTML, CSS, JavaScript,
Bootstrap, AngularJS, React, and jQuery.

The application provides persistent data storage through
MongoDB and RESTful services through Express.

## Technologies Used

Frontend:
- HTML5
- CSS3
- Bootstrap 5
- JavaScript
- jQuery
- AngularJS
- React

Backend:
- Node.js
- Express.js

Database:
- MongoDB
- Mongoose

Security:
- Administrator Basic Authentication
- Signed customer cart cookies
- Environment-based configuration
- Server-side input validation

## Database Collections

The application defines these MongoDB collections:

1. products
2. carts
3. shipping
4. billing
5. returns
6. reservations
7. submissions
8. members

## Product Management

Administrators can create, read, update and delete products.

REST API Endpoints:

GET /api/products
GET /api/products/:id
POST /api/products
PUT /api/products/:id
PATCH /api/products/:id
DELETE /api/products/:id

Product modifications require administrator credentials.

## Shopping Cart

Customers can create, read, update and delete shopping
cart items.

GET /api/cart
POST /api/cart
PUT /api/cart/:productId
PATCH /api/cart/:productId
DELETE /api/cart/:productId
DELETE /api/cart

Shopping carts are stored in MongoDB.

A signed cookie identifies each customer's cart.

## Shipping

Customers can save, view, update and delete shipping drafts.

GET /api/shipping
GET /api/shipping/:id
POST /api/shipping
PUT /api/shipping/:id
DELETE /api/shipping/:id

Shipping information is stored in MongoDB.

## Billing

Customers can submit fictional billing details.

POST /api/billing

Administrators can retrieve order records.

GET /api/billing

The backend calculates totals using product prices
from the database.

No real payment is charged.

Full card numbers and CVV are never transmitted to
the billing endpoint or stored in MongoDB.

## Returns

Customers submit return requests.

POST /api/returns

Administrators can retrieve and review returns.

GET /api/returns
PATCH /api/returns/:id/status

Return statuses include Pending, Approved and Rejected.

## Additional Features

- Cafe reservations using React
- Product returns using AngularJS
- Moderator approval dashboard
- Member registration
- Community content submissions
- Dynamic homepage menu
- MongoDB database persistence

## Installation Requirements

- Node.js version 20 or newer
- MongoDB Community Server or MongoDB Atlas
- npm
- Web browser

MongoDB Compass is recommended for viewing collections.

## Setup Instructions

Open a terminal inside the cafe-mongodb directory.

Install dependencies:

npm install

Create a .env file based on .env.example.

Configure:

PORT
MONGO_URI
CAFE_ADMIN_USER
CAFE_ADMIN_PASSWORD
CART_SECRET

A CART_SECRET of at least 32 characters is required.

Do not commit your real .env file to GitHub.

## Initialize Database

Run:

npm run seed

This reads data/products.json and imports sample products
into MongoDB.

Existing products with matching IDs are preserved.

## Start Application

Run:

npm start

The application is available at:

http://localhost:3000

## Test APIs

With the server running, execute:

npm run test:api

The automated script tests:

- MongoDB connectivity
- Product CRUD
- Shopping cart CRUD
- Customer cart separation
- Shipping operations
- Billing persistence
- Return requests
- Moderator approval
- Reservations
- Member registration
- Community submissions

The test creates fictional records.

## Demonstration Payment

Use only the fictional test card below.

Card Number: 4242 4242 4242 4242
CVV: 123
Expiration: A valid future month

This application does not support real payments.

## Database Evidence

The assignment report should include screenshots of:

1. Node.js successfully connecting to MongoDB
2. MongoDB Compass collections
3. Sample documents inside collections
4. Mongoose schemas
5. Database connection code
6. Product CRUD operations
7. Shopping cart CRUD operations
8. Shipping and billing data persistence
9. Frontend pages interacting with MongoDB

## Group Member Contributions

Add each group member's name and describe their actual
contribution to the project.

## Notes

This application is designed for classroom demonstration.

Do not deploy the demonstration payment form as a real
payment processing system.
