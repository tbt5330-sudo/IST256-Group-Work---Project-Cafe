var products = [];

$(document).ready(function () {
  loadProducts();

  // Add Product (form submit)
  $("#productForm").on("submit", function (e) {
    e.preventDefault();
    var item = getFormData();
    if (!item) return;

    var exists = products.some(function (p) { return p.id === item.id; });
    if (exists) {
      showMessage("That Product ID already exists. Use Update Product instead.", "danger");
      return;
    }

    products.push(item);
    saveProducts();
    showProducts($("#searchBox").val());
    clearForm();
    showMessage("Product added.", "success");
  });

  // Update Product button
  $("#updateBtn").on("click", function () {
    var item = getFormData();
    if (!item) return;

    var found = false;
    $.each(products, function (i, p) {
      if (p.id === item.id) {
        products[i] = item;
        found = true;
      }
    });

    if (!found) {
      showMessage("No product with that ID. Use Add Product to create it.", "danger");
      return;
    }

    saveProducts();
    showProducts($("#searchBox").val());
    clearForm();
    showMessage("Product updated.", "success");
  });

  // Search with jQuery
  $("#searchBox").on("keyup", function () {
    showProducts($(this).val());
  });

  // Edit button: fill the form with the row's data
  $("#productTableBody").on("click", ".editBtn", function () {
    var id = $(this).data("id");
    var p = products.find(function (item) { return item.id === id; });
    $("#productID").val(p.id);
    $("#productName").val(p.name);
    $("#category").val(p.category);
    $("#unit").val(p.unit);
    $("#price").val(p.price);
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // Delete button
  $("#productTableBody").on("click", ".deleteBtn", function () {
    var id = $(this).data("id");
    if (!confirm("Delete product " + id + "?")) return;
    products = products.filter(function (item) { return item.id !== id; });
    saveProducts();
    showProducts($("#searchBox").val());
    showMessage("Product deleted.", "success");
  });

  // Download the current JSON data
  $("#downloadBtn").on("click", function () {
    var blob = new Blob([JSON.stringify(products, null, 2)], { type: "application/json" });
    var link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "products.json";
    link.click();
  });
});

// Retrieve data: saved JSON first, otherwise products.json
function loadProducts() {
  var saved = localStorage.getItem("cafeProducts");
  if (saved) {
    products = JSON.parse(saved);
    showProducts("");
  } else {
    $.getJSON("products.json", function (data) {
      products = data;
      saveProducts();
      showProducts("");
    }).fail(function () {
      showMessage("Could not load products.json. Run the page with a local server.", "danger");
    });
  }
}

// Store data as JSON
function saveProducts() {
  localStorage.setItem("cafeProducts", JSON.stringify(products));
}

// Read and validate the form
function getFormData() {
  var id = $("#productID").val().trim().toUpperCase();
  var name = $("#productName").val().trim();
  var category = $("#category").val();
  var unit = $("#unit").val();
  var price = parseFloat($("#price").val());

  if (id === "" || name === "" || category === "" || unit === "") {
    showMessage("Please fill in all fields.", "danger");
    return null;
  }
  if (isNaN(price) || price < 0) {
    showMessage("Enter a valid price.", "danger");
    return null;
  }
  return { id: id, name: name, category: category, unit: unit, price: price };
}

// Build the table rows (filtered by the search text)
function showProducts(term) {
  term = (term || "").toLowerCase();
  var rows = "";

  $.each(products, function (i, p) {
    var text = (p.id + " " + p.name + " " + p.category).toLowerCase();
    if (text.indexOf(term) !== -1) {
      rows += "<tr>" +
        "<td>" + escapeHtml(p.id) + "</td>" +
        "<td>" + escapeHtml(p.name) + "</td>" +
        "<td>" + escapeHtml(p.category) + "</td>" +
        "<td>" + escapeHtml(p.unit) + "</td>" +
        "<td>$" + p.price.toFixed(2) + "</td>" +
        "<td>" +
          "<button class='btn btn-sm btn-outline-secondary editBtn' data-id='" + escapeHtml(p.id) + "'>Edit</button> " +
          "<button class='btn btn-sm btn-outline-danger deleteBtn' data-id='" + escapeHtml(p.id) + "'>Delete</button>" +
        "</td>" +
        "</tr>";
    }
  });

  if (rows === "") {
    rows = "<tr><td colspan='6' class='text-center'>No products found.</td></tr>";
  }
  $("#productTableBody").html(rows);
}

function escapeHtml(text) {
  return $("<div>").text(text).html();
}

function clearForm() {
  $("#productForm")[0].reset();
}

function showMessage(text, type) {
  $("#message").html("<div class='alert alert-" + type + " py-2'>" + escapeHtml(text) + "</div>");
  setTimeout(function () { $("#message").empty(); }, 3000);
}