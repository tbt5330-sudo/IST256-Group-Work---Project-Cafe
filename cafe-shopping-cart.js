let products = [];
let shoppingCart = [];

$(document).ready(function () {
    loadCartProducts();
    loadCart();

    // Search products
    $("#searchBox").on("keyup", function () {
        const searchTerm = $(this).val().toLowerCase();
        showAvailableProducts(searchTerm);
    });

    // Add product to cart
    $("#productList").on("click", ".addToCartBtn", function () {
        const productID = $(this).data("id");
        addToCart(productID);
    });

    // Remove product from cart
    $("#cartTableBody").on("click", ".removeBtn", function () {
        const productID = $(this).data("id");
        removeFromCart(productID);
    });

    // Checkout
    $(".btn-checkout").on("click", function () {
        if (shoppingCart.length === 0) {
            alert("Your shopping cart is empty.");
            return;
        }

        sendCartToAPI();
    });
});


// Load products from Product Management/localStorage or products.json
function loadCartProducts() {
    const savedProducts = localStorage.getItem("cafeProducts");

    if (savedProducts) {
        products = JSON.parse(savedProducts);
        showAvailableProducts("");
    } else {
        $.getJSON("products.json", function (data) {
            products = data;
            showAvailableProducts("");
        }).fail(function () {
            $("#productList").html(`
                <tr>
                    <td colspan="4" class="text-center">
                        Could not load products.
                    </td>
                </tr>
            `);
        });
    }
}


// Load the saved shopping cart
function loadCart() {
    const savedCart = localStorage.getItem("cafeShoppingCart");

    if (savedCart) {
        shoppingCart = JSON.parse(savedCart);
    } else {
        shoppingCart = [];
    }

    showCart();
}


// Save shopping cart as JSON in localStorage
function saveCart() {
    localStorage.setItem(
        "cafeShoppingCart",
        JSON.stringify(shoppingCart)
    );
}


// Display and search available products
function showAvailableProducts(searchTerm) {
    searchTerm = searchTerm || "";

    let rows = "";

    $.each(products, function (index, product) {
        const productText = (
            product.id + " " +
            product.name + " " +
            product.category
        ).toLowerCase();

        if (productText.includes(searchTerm.toLowerCase())) {
            rows += `
                <tr>
                    <td>${escapeHtml(product.name)}</td>
                    <td>${escapeHtml(product.category)}</td>
                    <td>$${Number(product.price).toFixed(2)}</td>
                    <td>
                        <button
                            class="btn btn-add addToCartBtn"
                            data-id="${escapeHtml(product.id)}">
                            Add to Cart
                        </button>
                    </td>
                </tr>
            `;
        }
    });

    if (rows === "") {
        rows = `
            <tr>
                <td colspan="4" class="text-center">
                    No products found.
                </td>
            </tr>
        `;
    }

    $("#productList").html(rows);
}


// Add a product to the shopping cart
function addToCart(productID) {
    const product = products.find(function (item) {
        return item.id === productID;
    });

    if (!product) {
        return;
    }

    const existingItem = shoppingCart.find(function (item) {
        return item.id === productID;
    });

    if (existingItem) {
        existingItem.quantity += 1;
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


// Remove a product from the shopping cart
function removeFromCart(productID) {
    shoppingCart = shoppingCart.filter(function (item) {
        return item.id !== productID;
    });

    saveCart();
    showCart();
}


// Display the shopping cart
function showCart() {
    let rows = "";
    let totalItems = 0;
    let grandTotal = 0;

    $.each(shoppingCart, function (index, item) {
        const itemTotal = Number(item.price) * item.quantity;

        totalItems += item.quantity;
        grandTotal += itemTotal;

        rows += `
            <tr>
                <td>${escapeHtml(item.name)}</td>
                <td>${item.quantity}</td>
                <td>$${Number(item.price).toFixed(2)}</td>
                <td>$${itemTotal.toFixed(2)}</td>
                <td>
                    <button
                        class="btn btn-remove removeBtn"
                        data-id="${escapeHtml(item.id)}">
                        Remove
                    </button>
                </td>
            </tr>
        `;
    });

    if (rows === "") {
        rows = `
            <tr>
                <td colspan="5" class="text-center">
                    Your cart is empty.
                </td>
            </tr>
        `;
    }

    $("#cartTableBody").html(rows);
    $("#itemCount").text(totalItems);
    $("#grandTotal").text("$" + grandTotal.toFixed(2));
}


// Prepare cart JSON and send it to the future REST API
function sendCartToAPI() {
    const cartData = {
        items: shoppingCart,
        totalItems: shoppingCart.reduce(function (total, item) {
            return total + item.quantity;
        }, 0),
        grandTotal: shoppingCart.reduce(function (total, item) {
            return total + (Number(item.price) * item.quantity);
        }, 0)
    };

    $.ajax({
        // Replace with your real API URL when the REST API is created
        url: "https://example.com/api/cart",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify(cartData),

        success: function () {
            alert("Your order was successfully sent!");
        },

        error: function () {
            // Expected until the REST API is created
            console.log("Cart JSON ready for the future REST API:");
            console.log(JSON.stringify(cartData, null, 2));

            alert(
                "Your cart data has been prepared as JSON for the future REST API."
            );
        }
    });
}


// Prevent text from being interpreted as HTML
function escapeHtml(text) {
    return $("<div>").text(text).html();
}
