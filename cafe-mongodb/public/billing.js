'use strict';

angular.module('billingApp', [])
.controller('BillingController', [
    '$scope',
    '$http',
    function ($scope, $http) {
        function emptyBilling() {
            return {
                fullName: '',
                address: '',
                cardNumber: '',
                expiration: null,
                cvv: ''
            };
        }

        $scope.billing = emptyBilling();
        $scope.cart = [];
        $scope.shipping = 0;
        $scope.submitting = false;

        $scope.status = {
            success: false,
            message: '',
            errors: []
        };

        let shippingReady = false;

        // LOAD CART AND SHIPPING DATA FROM DATABASE
        $http.get('/api/cart')
            .then(function (response) {
                $scope.cart = response.data;

                $scope.shipping =
                    $scope.cart.length ? 2 : 0;

                return $http.get('/api/shipping');
            })
            .then(function (response) {
                const shipping = response.data;

                if (!shipping) {
                    $scope.status.errors = [
                        'Complete your shipping information first.'
                    ];
                    return;
                }

                shippingReady = true;

                $scope.billing.fullName =
                    shipping.fullName;

                $scope.billing.address =
                    `${shipping.address}, ${shipping.city}, ` +
                    `${shipping.state} ${shipping.zip}`;
            })
            .catch(function (error) {
                $scope.status.errors =
                    error.data?.errors || [
                        'Unable to load checkout information.'
                    ];
            });

        // ORDER TOTALS
        $scope.totalItems = function () {
            return $scope.cart.reduce(
                (total, product) =>
                    total + Number(product.quantity),
                0
            );
        };

        $scope.subtotal = function () {
            return $scope.cart.reduce(
                (total, product) =>
                    total +
                    Number(product.price) *
                    Number(product.quantity),
                0
            );
        };

        $scope.total = function () {
            return $scope.subtotal() + $scope.shipping;
        };

        // SUBMIT DEMO BILLING
        $scope.submitBilling = function () {
            if ($scope.submitting) return;

            $scope.status = {
                success: false,
                message: '',
                errors: []
            };

            const billing = $scope.billing;
            const errors = $scope.status.errors;

            const fullName =
                (billing.fullName || '').trim();

            const address =
                (billing.address || '').trim();

            const number = String(
                billing.cardNumber || ''
            ).replace(/[\s-]/g, '');

            const cvv = String(billing.cvv || '');
            const expiration = billing.expiration;

            // Fictional card only.
            if (number !== '4242424242424242') {
                errors.push(
                    'Use demo card 4242 4242 4242 4242.'
                );
            }

            if (cvv !== '123') {
                errors.push(
                    'Use the fictional CVV 123.'
                );
            }

            const now = new Date();

            if (
                !(expiration instanceof Date) ||
                Number.isNaN(expiration.getTime()) ||
                expiration < new Date(
                    now.getFullYear(),
                    now.getMonth(),
                    1
                )
            ) {
                errors.push(
                    'Choose a valid future expiration month.'
                );
            }

            if (
                fullName.length < 2 ||
                address.length < 5
            ) {
                errors.push(
                    'Enter your name and billing address.'
                );
            }

            if (!$scope.cart.length) {
                errors.push('Your cart is empty.');
            }

            if (!shippingReady) {
                errors.push(
                    'Complete shipping details first.'
                );
            }

            if (errors.length) return;

            // Full card number and CVV are NOT sent.
            const payload = {
                fullName,
                address,
                paymentMethod: {
                    type: 'demo_card',
                    lastFourDigits: '4242',
                    expiry:
                        String(
                            expiration.getMonth() + 1
                        ).padStart(2, '0') +
                        '/' +
                        String(
                            expiration.getFullYear()
                        ).slice(-2)
                }
            };

            $scope.submitting = true;

            $http.post('/api/billing', payload)
                .then(function (response) {
                    $scope.status.success = true;

                    $scope.status.message =
                        response.data.message +
                        ' Order ID: ' +
                        response.data.orderId;

                    $scope.cart = [];
                    $scope.shipping = 0;
                    shippingReady = false;
                    $scope.billing = emptyBilling();

                    if ($scope.billingForm) {
                        $scope.billingForm.$setPristine();
                        $scope.billingForm.$setUntouched();
                    }
                })
                .catch(function (error) {
                    $scope.status.errors =
                        error.data?.errors || [
                            'Unable to submit billing.'
                        ];
                })
                .finally(function () {
                    $scope.submitting = false;
                });
        };
    }
]);
