
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

    $scope.status = {
      success: false,
      message: '',
      errors: []
    };

    $scope.submitting = false;

    try {
      const saved = JSON.parse(
        localStorage.getItem('cafeShoppingCart') || '[]'
      );

      $scope.cart = Array.isArray(saved) ? saved : [];
    } catch (_) {
      $scope.cart = [];
    }

    $scope.shipping = $scope.cart.length ? 2 : 0;

    $scope.totalItems = function () {
      return $scope.cart.reduce(
        (sum, p) =>
          sum + Number(p.quantity || 0),
        0
      );
    };

    $scope.subtotal = function () {
      return $scope.cart.reduce(
        (sum, p) =>
          sum +
          Number(p.price || 0) *
          Number(p.quantity || 0),
        0
      );
    };

    $scope.total = function () {
      return $scope.subtotal() + $scope.shipping;
    };

    function validCard(number) {
      if (!/^\d{13,19}$/.test(number)) {
        return false;
      }

      let total = 0;
      let doubleNext = false;

      for (let i = number.length - 1; i >= 0; i--) {
        let digit = Number(number[i]);

        if (doubleNext) {
          digit *= 2;

          if (digit > 9) {
            digit -= 9;
          }
        }

        total += digit;
        doubleNext = !doubleNext;
      }

      return total % 10 === 0;
    }

    $scope.submitBilling = function () {
      if ($scope.submitting) return;

      $scope.status = {
        success: false,
        message: '',
        errors: []
      };

      const fullName =
        ($scope.billing.fullName || '').trim();

      const address =
        ($scope.billing.address || '').trim();

      const number =
        ($scope.billing.cardNumber || '')
          .replace(/[\s-]/g, '');

      const cvv = String($scope.billing.cvv || '');
      const expiryDate = $scope.billing.expiration;

      if (fullName.length < 2) {
        $scope.status.errors.push(
          'Full name is required.'
        );
      }

      if (address.length < 5) {
        $scope.status.errors.push(
          'Full billing address is required.'
        );
      }

      if (!validCard(number)) {
        $scope.status.errors.push(
          'Enter a valid demo card number.'
        );
      }

      if (!/^\d{3,4}$/.test(cvv)) {
        $scope.status.errors.push(
          'CVV must be 3 or 4 digits.'
        );
      }

      if (
        !(expiryDate instanceof Date) ||
        Number.isNaN(expiryDate.getTime())
      ) {
        $scope.status.errors.push(
          'Choose a valid expiration month.'
        );
      } else {
        const now = new Date();
        const cardYear = expiryDate.getFullYear();
        const cardMonth = expiryDate.getMonth() + 1;

        if (
          cardYear < now.getFullYear() ||
          (
            cardYear === now.getFullYear() &&
            cardMonth < now.getMonth() + 1
          )
        ) {
          $scope.status.errors.push(
            'Card expiration month has passed.'
          );
        }
      }

      if (!$scope.cart.length) {
        $scope.status.errors.push(
          'Your cart is empty.'
        );
      }

      if ($scope.status.errors.length) {
        return;
      }

      const payload = {
        fullName,
        address,

        paymentMethod: {
          type: 'demo_card',
          lastFourDigits: number.slice(-4),

          expiry:
            String(
              expiryDate.getMonth() + 1
            ).padStart(2, '0') +
            '/' +
            String(
              expiryDate.getFullYear()
            ).slice(-2)
        },

        orderSummary: {
          items: $scope.cart.map(p => ({
            id: p.id,
            quantity: Number(p.quantity)
          })),

          totalItems: $scope.totalItems(),
          subtotal: $scope.subtotal(),
          shipping: $scope.shipping,
          total: $scope.total()
        }
      };

      $scope.submitting = true;

      $http.post('/api/billing', payload)
        .then(function (response) {
          $scope.status.success = true;

          $scope.status.message =
            response.data.message ||
            'Demo billing recorded.';

          localStorage.removeItem(
            'cafeShoppingCart'
          );

          $scope.cart = [];
          $scope.shipping = 0;
          $scope.billing = emptyBilling();

          $scope.billingForm.$setPristine();
          $scope.billingForm.$setUntouched();
        })
        .catch(function (error) {
          $scope.status.errors =
            error.data?.errors ||
            ['Unable to submit billing details.'];
        })
        .finally(function () {
          $scope.submitting = false;
        });
    };
  }
]);
