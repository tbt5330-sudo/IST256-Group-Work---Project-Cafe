
'use strict';

angular.module('returnsApp', [])
.controller('ReturnsController', [
  '$scope',
  '$http',
  function ($scope, $http) {

    $scope.returnProducts = [];
    $scope.returnReason = '';
    $scope.productCondition = '';
    $scope.comments = '';
    $scope.submitting = false;

    $scope.status = {
      success: false,
      message: '',
      errors: []
    };

    $http.get('/api/products')
      .then(function (response) {
        $scope.returnProducts = response.data;
      })
      .catch(function () {
        $scope.status.errors = [
          'Could not load cafe products.'
        ];
      });

    $scope.refundTotal = function () {
      return $scope.returnProducts
        .filter(p => p.selected)
        .reduce(
          (sum, p) =>
            sum + Number(p.price || 0),
          0
        );
    };

    $scope.submitReturn = function () {
      if ($scope.submitting) return;

      $scope.status = {
        success: false,
        message: '',
        errors: []
      };

      const selected = $scope.returnProducts
        .filter(p => p.selected);

      const reason =
        ($scope.returnReason || '').trim();

      const condition =
        ($scope.productCondition || '').trim();

      const comments =
        ($scope.comments || '').trim();

      if (!selected.length) {
        $scope.status.errors.push(
          'Select at least one product to return.'
        );
      }

      if (!reason) {
        $scope.status.errors.push(
          'Choose a reason for return.'
        );
      }

      if (!condition) {
        $scope.status.errors.push(
          'Choose product condition.'
        );
      }

      if (comments.length > 1000) {
        $scope.status.errors.push(
          'Comments cannot exceed 1,000 characters.'
        );
      }

      if ($scope.status.errors.length) return;

      const payload = {
        items: selected.map(p => ({
          id: p.id
        })),
        reason,
        condition,
        comments
      };

      $scope.submitting = true;

      $http.post('/api/returns', payload)
        .then(function (response) {
          $scope.status.success = true;

          $scope.status.message =
            response.data.message +
            ' ID: ' +
            response.data.returnId;

          $scope.returnProducts.forEach(p => {
            p.selected = false;
          });

          $scope.returnReason = '';
          $scope.productCondition = '';
          $scope.comments = '';

          if ($scope.returnsForm) {
            $scope.returnsForm.$setPristine();
            $scope.returnsForm.$setUntouched();
          }
        })
        .catch(function (error) {
          $scope.status.errors =
            error.data?.errors ||
            ['Could not submit return request.'];
        })
        .finally(function () {
          $scope.submitting = false;
        });
    };
  }
]);
