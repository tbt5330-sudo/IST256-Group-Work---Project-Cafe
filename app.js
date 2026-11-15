// app.js - AngularJS module and controllers for the Billing and Returns pages
// Load AngularJS first, then this file:
//   <script src="https://cdnjs.cloudflare.com/ajax/libs/angular.js/1.8.3/angular.min.js"></script>
//   <script src="app.js"></script>

angular.module('cafeApp', [])

  // ---------------- Billing page ----------------
  // HTML: <div ng-app="cafeApp" ng-controller="BillingController"> ... </div>
  .controller('BillingController', ['$scope', '$http', function ($scope, $http) {

    // Form data (bind with ng-model="billing.fullName", etc.)
    $scope.billing = {
      fullName: '',
      address: '',
      cardNumber: '',
      expiry: '',
      cvv: ''
    };

    // Order summary. Uses the saved cart if one exists, otherwise sample items.
    var savedCart = null;
    try { savedCart = JSON.parse(localStorage.getItem('cart')); } catch (e) {}

    $scope.cart = Array.isArray(savedCart) && savedCart.length > 0 ? savedCart : [
      { name: 'Latte', price: 4.50, qty: 2 },
      { name: 'Blueberry Muffin', price: 3.25, qty: 1 }
    ];
    $scope.shipping = 5.00;

    $scope.subtotal = function () {
      return $scope.cart.reduce(function (sum, item) {
        return sum + item.price * item.qty;
      }, 0);
    };

    $scope.total = function () {
      return $scope.subtotal() + $scope.shipping;
    };

    $scope.status = { message: '', errors: [], success: false };

    $scope.submitBilling = function () {
      $scope.status = { message: '', errors: [], success: false };

      var payload = angular.copy($scope.billing);
      payload.orderSummary = {
        items: $scope.cart,
        total: $scope.total(),
        shipping: $scope.shipping
      };

      $http.post('/api/billing', payload).then(function (response) {
        $scope.status.success = true;
        $scope.status.message = response.data.message;
        $scope.billing = { fullName: '', address: '', cardNumber: '', expiry: '', cvv: '' };
      }, function (error) {
        $scope.status.errors = (error.data && error.data.errors) || ['Could not reach the server.'];
      });
    };
  }])

  // ---------------- Returns page ----------------
  // HTML: <div id="returnsApp" ng-app="cafeApp" ng-controller="ReturnsController"> ... </div>
  .controller('ReturnsController', ['$scope', '$http', function ($scope, $http) {

    $scope.returnItems = [];   // products the customer wants to return
    $scope.returnForm = { reason: '', condition: '' };
    $scope.conditions = ['Unopened', 'Opened, like new', 'Used', 'Damaged'];
    $scope.status = { message: '', errors: [], success: false };

    // Called from the jQuery search (returns-search.js) and from ng-click buttons.
    $scope.addReturnItem = function (product) {
      var alreadyAdded = $scope.returnItems.some(function (p) { return p.name === product.name; });
      if (!alreadyAdded) {
        $scope.returnItems.push({ name: product.name, image: product.image, price: product.price });
      }
    };

    $scope.removeReturnItem = function (index) {
      $scope.returnItems.splice(index, 1);
    };

    $scope.refundTotal = function () {
      return $scope.returnItems.reduce(function (sum, item) {
        return sum + Number(item.price || 0);
      }, 0);
    };

    $scope.submitReturn = function () {
      $scope.status = { message: '', errors: [], success: false };

      var payload = {
        items: $scope.returnItems,
        reason: $scope.returnForm.reason,
        condition: $scope.returnForm.condition
      };

      $http.post('/api/returns', payload).then(function (response) {
        $scope.status.success = true;
        $scope.status.message = response.data.message;
        $scope.returnItems = [];
        $scope.returnForm = { reason: '', condition: '' };
      }, function (error) {
        $scope.status.errors = (error.data && error.data.errors) || ['Could not reach the server.'];
      });
    };
  }]);
