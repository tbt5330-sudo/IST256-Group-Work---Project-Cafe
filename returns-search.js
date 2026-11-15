// returns-search.js - jQuery search for the Returns page
// Load jQuery and AngularJS first, then this file at the end of the Returns page:
//   <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
//   <script src="returns-search.js"></script>
//
// Expects these elements in the Returns HTML:
//   <input id="returnSearch" type="text" placeholder="Search products...">
//   <div id="searchResults"></div>
//   <div id="returnsApp" ng-app="cafeApp" ng-controller="ReturnsController"> ... </div>

$(function () {
  var allProducts = [];

  // Load the products JSON once. Accepts either [ {...}, {...} ] or { "products": [ {...} ] }.
  $.getJSON('products.json')
    .done(function (data) {
      allProducts = Array.isArray(data) ? data : (data.products || []);
    })
    .fail(function () {
      $('#searchResults').html('<p class="text-danger">Could not load products.</p>');
    });

  function showResults(matches) {
    var $results = $('#searchResults').empty();

    if (matches.length === 0) {
      $results.append('<p class="text-muted">No products found.</p>');
      return;
    }

    $.each(matches, function (index, product) {
      var $row = $('<div class="d-flex align-items-center border rounded p-2 mb-2"></div>');

      if (product.image) {
        $row.append($('<img class="me-3" style="width:50px;height:50px;object-fit:cover;">').attr('src', product.image));
      }

      $row.append(
        $('<div class="flex-grow-1"></div>')
          .append($('<strong></strong>').text(product.name))
          .append($('<div></div>').text('$' + Number(product.price || 0).toFixed(2)))
      );

      $('<button type="button" class="btn btn-sm btn-primary">Return this</button>')
        .on('click', function () {
          // Hand the chosen product to the AngularJS controller
          var scope = angular.element(document.getElementById('returnsApp')).scope();
          scope.$apply(function () {
            scope.addReturnItem(product);
          });
        })
        .appendTo($row);

      $results.append($row);
    });
  }

  // Filter as the customer types
  $('#returnSearch').on('input', function () {
    var term = $.trim($(this).val()).toLowerCase();

    if (term === '') {
      $('#searchResults').empty();
      return;
    }

    var matches = $.grep(allProducts, function (product) {
      return String(product.name || '').toLowerCase().indexOf(term) !== -1;
    });

    showResults(matches);
  });
});
