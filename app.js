
"use strict";

// AngularJS application for Cozy Corner Cafe Returns
// Matches ng-app="returnsApp" in cafe-returns.html

angular.module("returnsApp", [])

.controller("ReturnsController", [
    "$scope",
    "$http",
    function ($scope, $http) {

        // Store cafe products and return form information
        $scope.returnProducts = [];
        $scope.returnReason = "";
        $scope.productCondition = "";
        $scope.comments = "";

        // Display submission and validation messages
        $scope.status = {
            success: false,
            message: "",
            errors: []
        };

        // Load products from the existing JSON file
        $http.get("products.json")
            .then(function (response) {

                $scope.returnProducts = response.data;

            })
            .catch(function () {

                $scope.status.errors = [
                    "Unable to load products."
                ];

            });

        // Calculate the price of selected products
        $scope.refundTotal = function () {

            return $scope.returnProducts
                .filter(function (product) {
                    return product.selected;
                })
                .reduce(function (total, product) {
                    return total + Number(product.price);
                }, 0);

        };

        // Submit the return request
        $scope.submitReturn = function () {

            $scope.status = {
                success: false,
                message: "",
                errors: []
            };

            // Find products selected by the customer
            const selectedProducts = $scope.returnProducts
                .filter(function (product) {
                    return product.selected;
                });

            // JavaScript form validation
            if (selectedProducts.length === 0) {

                $scope.status.errors.push(
                    "Please select at least one product."
                );

            }

            if (!$scope.returnReason) {

                $scope.status.errors.push(
                    "Please select a reason for your return."
                );

            }

            if (!$scope.productCondition) {

                $scope.status.errors.push(
                    "Please select the product condition."
                );

            }

            // Stop submission if validation fails
            if ($scope.status.errors.length > 0) {
                return;
            }

            // Create JSON object for the return request
            const returnData = {

                items: selectedProducts.map(function (product) {

                    return {
                        id: product.id,
                        name: product.name,
                        category: product.category,
                        price: Number(product.price),
                        image: product.image || ""
                    };

                }),

                reason: $scope.returnReason,
                condition: $scope.productCondition

            };

            // AJAX: Send JSON data to Node.js REST service
            $http.post("/api/returns", returnData)

                .then(function (response) {

                    $scope.status.success = true;
                    $scope.status.message =
                        response.data.message;

                    // Clear selected products after success
                    $scope.returnProducts.forEach(
                        function (product) {
                            product.selected = false;
                        }
                    );

                    // Reset return form
                    $scope.returnReason = "";
                    $scope.productCondition = "";
                    $scope.comments = "";

                })

                .catch(function (error) {

                    $scope.status.errors =
                        error.data && error.data.errors
                            ? error.data.errors
                            : ["Unable to submit return request."];

                });

        };

    }
]);
