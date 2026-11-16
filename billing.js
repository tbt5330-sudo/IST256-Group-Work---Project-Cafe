
// billing.js
// Billing validation, JSON creation, and AJAX submission

$(document).ready(function () {

    const SHIPPING_COST = 2.00;
    const API_URL = "/api/billing";

    // Retrieve existing shopping cart
    function getCart() {
        return JSON.parse(
            localStorage.getItem("cafeShoppingCart") || "[]"
        );
    }

    // Calculate order totals
    function calculateOrder() {

        const cart = getCart();

        let subtotal = 0;
        let totalItems = 0;

        cart.forEach(function (item) {
            subtotal += Number(item.price) * Number(item.quantity);
            totalItems += Number(item.quantity);
        });

        return {
            items: cart,
            totalItems: totalItems,
            subtotal: subtotal,
            shipping: SHIPPING_COST,
            total: subtotal + SHIPPING_COST
        };
    }

    // Display order summary
    function displayOrder() {

        const order = calculateOrder();
        const summary = $(".col-lg-4 .billing-card .card-body");

        summary.find(".dynamic-order-item").remove();

        const shippingInfo = summary.find(".shipping-info");

        order.items.forEach(function (item) {

            const row = $("<div>")
                .addClass("order-item dynamic-order-item");

            row.append(
                $("<span>").text(
                    item.name + " x " + item.quantity
                )
            );

            row.append(
                $("<span>").text(
                    "$" + (
                        Number(item.price) * item.quantity
                    ).toFixed(2)
                )
            );

            shippingInfo.before(row);

        });

        summary.find(".order-total strong:last")
            .text("$" + order.total.toFixed(2));

        summary.find(".order-item:not(.dynamic-order-item)")
            .last()
            .find("span:last")
            .text("$" + SHIPPING_COST.toFixed(2));

    }

    displayOrder();

    // Credit card validation using Luhn algorithm
    function validateCard(number) {

        if (!/^\d{13,19}$/.test(number)) {
            return false;
        }

        let sum = 0;
        let doubleDigit = false;

        for (let i = number.length - 1; i >= 0; i--) {

            let digit = Number(number[i]);

            if (doubleDigit) {
                digit *= 2;

                if (digit > 9) {
                    digit -= 9;
                }
            }

            sum += digit;
            doubleDigit = !doubleDigit;
        }

        return sum % 10 === 0;
    }

    // Billing form submission
    $("#billingForm").on("submit", function (event) {

        event.preventDefault();

        const cart = getCart();

        const fullName = $("#fullName").val().trim();
        const address = $("#address").val().trim();

        const cardNumber = $("#cardNumber")
            .val()
            .replace(/[\s-]/g, "");

        const expiration = $("#expiration").val();
        const cvv = $("#cvv").val().trim();

        if (!this.reportValidity()) {
            return;
        }

        if (cart.length === 0) {
            alert("Your shopping cart is empty.");
            return;
        }

        if (!validateCard(cardNumber)) {
            alert("Please enter a valid credit card number.");
            return;
        }

        if (!/^\d{3,4}$/.test(cvv)) {
            alert("Please enter a valid security code.");
            return;
        }

        // Convert HTML month input (YYYY-MM) to MM/YY
        const parts = expiration.split("-");

        const year = Number(parts[0]);
        const month = Number(parts[1]);

        if (!year || month < 1 || month > 12) {
            alert("Please enter a valid expiration date.");
            return;
        }

        const today = new Date();

        if (
            year < today.getFullYear() ||
            (year === today.getFullYear() &&
             month < today.getMonth() + 1)
        ) {
            alert("Your credit card has expired.");
            return;
        }

        const order = calculateOrder();

        // Create billing JSON
        const billingData = {

            fullName: fullName,

            address: address,

            cardNumber: cardNumber,

            expiry:
                String(month).padStart(2, "0") +
                "/" +
                String(year).slice(-2),

            cvv: cvv,

            orderSummary: order

        };

        // AJAX request to Node.js
        $.ajax({

            url: API_URL,

            type: "POST",

            contentType: "application/json",

            dataType: "json",

            data: JSON.stringify(billingData),

            success: function (response) {

                alert(response.message);

                localStorage.removeItem("cafeShoppingCart");

                $("#billingForm")[0].reset();

                displayOrder();

            },

            error: function (xhr) {

                const errors =
                    xhr.responseJSON &&
                    xhr.responseJSON.errors;

                alert(
                    errors
                        ? errors.join("\n")
                        : "Unable to submit billing information."
                );

            }

        });

    });

});
