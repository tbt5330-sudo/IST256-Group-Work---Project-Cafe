
'use strict';

angular.module('moderatorApp', [])
.controller('ModeratorController', [
  '$scope',
  '$http',
  function ($scope, $http) {

    $scope.login = {
      username: '',
      password: ''
    };

    $scope.loggedIn = false;
    $scope.tab = 'submissions';
    $scope.statusFilter = 'Pending';
    $scope.submissions = [];
    $scope.returns = [];
    $scope.message = '';
    $scope.error = '';
    $scope.busy = false;

    let auth = '';

    function headers() {
      return { Authorization: auth };
    }

    function errorText(error) {
      return (
        error.data?.errors ||
        ['Could not contact the server.']
      ).join(' ');
    }

    $scope.signIn = function () {
      $scope.error = '';
      $scope.message = '';

      if (
        !$scope.login.username ||
        !$scope.login.password
      ) {
        $scope.error =
          'Enter moderator username and password.';
        return;
      }

      auth = 'Basic ' +
        btoa(
          $scope.login.username +
          ':' +
          $scope.login.password
        );

      $scope.busy = true;

      $http.get('/api/submissions', {
        headers: headers()
      })
      .then(function (response) {
        $scope.submissions = response.data;
        $scope.loggedIn = true;
        $scope.login.password = '';

        return $http.get('/api/returns', {
          headers: headers()
        });
      })
      .then(function (response) {
        $scope.returns = response.data;
      })
      .catch(function (error) {
        $scope.error = errorText(error);
        $scope.loggedIn = false;
        auth = '';
      })
      .finally(function () {
        $scope.busy = false;
      });
    };

    $scope.signOut = function () {
      auth = '';
      $scope.loggedIn = false;
      $scope.submissions = [];
      $scope.returns = [];
      $scope.login.password = '';
    };

    $scope.refresh = function () {
      if (!$scope.loggedIn) return;

      $scope.error = '';
      $scope.busy = true;

      Promise.all([
        $http.get('/api/submissions', {
          headers: headers()
        }),
        $http.get('/api/returns', {
          headers: headers()
        })
      ])
      .then(function (responses) {
        $scope.$applyAsync(function () {
          $scope.submissions = responses[0].data;
          $scope.returns = responses[1].data;
        });
      })
      .catch(function (error) {
        $scope.$applyAsync(function () {
          $scope.error = errorText(error);
        });
      })
      .finally(function () {
        $scope.$applyAsync(function () {
          $scope.busy = false;
        });
      });
    };

    $scope.review = function (type, item, decision) {
      if (
        !$scope.loggedIn ||
        $scope.busy ||
        item.status !== 'Pending'
      ) {
        return;
      }

      $scope.error = '';
      $scope.message = '';
      $scope.busy = true;

      $http.patch(
        '/api/' +
        type +
        '/' +
        encodeURIComponent(item.id) +
        '/status',

        { status: decision },

        { headers: headers() }
      )
      .then(function (response) {
        item.status = response.data.item.status;
        item.reviewedAt =
          response.data.item.reviewedAt;
        $scope.message = response.data.message;
      })
      .catch(function (error) {
        $scope.error = errorText(error);
      })
      .finally(function () {
        $scope.busy = false;
      });
    };

    $scope.visible = function (item) {
      return $scope.statusFilter === 'All' ||
        item.status === $scope.statusFilter;
    };

  }
]);
