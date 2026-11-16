
// billing.js
// Cozy Corner Cafe Billing Details
// AngularJS, JavaScript validation, JSON, and AJAX

"use strict";

angular.module("billingApp", [])

.controller("BillingController", [
    "$scope",
    "$http",
    function ($scope, $http) {

        // Billing form information
        $scope.billing = {
            fullName: "",
            address: "",
            cardNumber: "",
            expiration: null,
            cvv: ""
        };

        // Validation and submission messages
        $scope.status = {
            success: false,
            message: "",
            errors: []
        };

        $scope.submitting = false;

        // Retrieve cart from existing website storage
        function loadCart() {

            try {

                const savedCart = JSON.parse(
                    localStorage.getItem("cafeShoppingCart") || "[]"
                );

                return Array.isArray(savedCart)
                    ? savedCart
                    : [];

            } catch (error) {

                return [];

            }
        }

        $scope.cart = loadCart();

        // Shipping cost
        $scope.shipping =
            $scope.cart.length > 0 ? 2.00 : 0;


        // Calculate total number of items
        $scope.totalItems = function () {

            return $scope.cart.reduce(
                function (total, item) {

                    return total + Number(item.quantity);

                }, 0
            );

        };


        // Calculate order subtotal
        $scope.subtotal = function () {

            return $scope.cart.reduce(
                function (total, item) {

                    return total +
                        Number(item.price) *
                        Number(item.quantity);

                }, 0
            );

        };


        // Calculate order total
        $scope.total = function () {

            return $scope.subtotal() + $scope.shipping;

        };


        // Validate credit card number with Luhn algorithm
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


        // Submit billing form
        $scope.submitBilling = function () {

            if ($scope.submitting) {
                return;
            }

            // Clear previous messages
            $scope.status = {
                success: false,
                message: "",
                errors: []
            };

            // Read AngularJS bound fields
            const fullName =
                ($scope.billing.fullName || "").trim();

            const address =
                ($scope.billing.address || "").trim();

            const cardNumber =
                ($scope.billing.cardNumber || "")
                    .replace(/[\s-]/g, "");

            const cvv = $scope.billing.cvv || "";

            const expiration =
                $scope.billing.expiration;


            // Validate full name
            if (fullName.length < 2) {

                $scope.status.errors.push(
                    "Please enter your full name."
                );

            }


            // Validate address
            if (!address) {

                $scope.status.errors.push(
                    "Billing address is required."
                );

            }


            // Validate card number
            if (!validateCard(cardNumber)) {

                $scope.status.errors.push(
                    "Please enter a valid credit card number."
                );

            }


            // Validate CVV
            if (!/^\d{3,4}$/.test(cvv)) {

                $scope.status.errors.push(
                    "Security code must be 3 or 4 digits."
                );

            }


            // Validate expiration date
            let expiry = "";

            if (
                expiration instanceof Date &&
                !isNaN(expiration.getTime())
            ) {

                const month =
                    expiration.getMonth() + 1;

                const year =
                    expiration.getFullYear();

                // Format expected by existing Server.js
                expiry =
                    String(month).padStart(2, "0") +
                    "/" +
                    String(year).slice(-2);

                const today = new Date();

                if (
                    year < today.getFullYear() ||
                    (
                        year === today.getFullYear() &&
                        month < today.getMonth() + 1
                    )
                ) {

                    $scope.status.errors.push(
                        "The credit card has expired."
                    );

                }

            } else {

                $scope.status.errors.push(
                    "Please enter a valid expiration date."
                );

            }


            // Validate shopping cart
            if ($scope.cart.length === 0) {

                $scope.status.errors.push(
                    "Your shopping cart is empty."
                );

            }


            // Stop submission if validation fails
            if ($scope.status.errors.length > 0) {
                return;
            }


            // Create billing JSON object
            const billingData = {

                fullName: fullName,

                address: address,

                // Demo-only payment fields expected by Server.js
                cardNumber: cardNumber,

                expiry: expiry,

                cvv: cvv,

                orderSummary: {

                    items: $scope.cart,

                    totalItems: $scope.totalItems(),

                    subtotal: $scope.subtotal(),

                    shipping: $scope.shipping,

                    total: $scope.total()

                }

            };


            // Prevent multiple submissions
            $scope.submitting = true;


            // AJAX: Send billing JSON to Node.js REST service
            $http.post("/api/billing", billingData)

                .then(function (response) {

                    // Display server confirmation
                    $scope.status.success = true;

                    $scope.status.message =
                        response.data.message ||
                        "Billing details submitted successfully.";

                    // Clear shopping cart after success
                    localStorage.removeItem(
                        "cafeShoppingCart"
                    );

                    $scope.cart = [];

                    $scope.shipping = 0;


                    // Reset billing form
                    $scope.billing = {
                        fullName: "",
                        address: "",
                        cardNumber: "",
                        expiration: null,
                        cvv: ""
                    };

                })

                .catch(function (error) {

                    // Display server errors
                    $scope.status.errors =
                        error.data &&
                        Array.isArray(error.data.errors)

                            ? error.data.errors

                            : [
                                "Unable to submit billing details."
                            ];

                })

                .finally(function () {

                    $scope.submitting = false;

                });

        };

    }
]);
