
"use strict";

// Cafe Product Management - JavaScript

document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("productForm");

    const productID = document.getElementById("productID");
    const productName = document.getElementById("productName");
    const category = document.getElementById("category");
    const unit = document.getElementById("unit");
    const price = document.getElementById("price");

    const tableBody = document.querySelector(
        ".management-card table tbody"
    );

    const updateButton = document.querySelector(".btn-update");

    // Stop if the required HTML elements cannot be found.
    if (!form || !tableBody) {
        console.error("Product form or product table was not found.");
        return;
    }

    // Create a message area for validation and success messages.
    const message = document.createElement("div");
    message.id = "formMessage";
    message.className = "alert d-none";
    message.setAttribute("role", "alert");
    form.parentNode.insertBefore(message, form);

    let editingID = null;

    // Display a message to the user.
    function showMessage(text, type) {
        message.textContent = text;
        message.className = "alert alert-" + type;
    }

    // Validate required fields.
    function validateForm() {
        form.classList.add("was-validated");

        const fields = [
            productID,
            productName,
            category,
            unit,
            price
        ];

        let valid = true;

        fields.forEach(function (field) {
            field.classList.remove("is-invalid", "is-valid");

            const fieldValid =
                field.value.trim() !== "" &&
                field.checkValidity();

            field.classList.add(
                fieldValid ? "is-valid" : "is-invalid"
            );

            if (!fieldValid) {
                valid = false;
            }
        });

        if (!valid) {
            showMessage(
                "Please complete all required fields correctly.",
                "danger"
            );
            return false;
        }

        return true;
    }

    // Find an existing product row by its Product ID.
    function findProductRow(id) {
        return Array.from(tableBody.rows).find(function (row) {
            return row.cells[0] &&
                row.cells[0].textContent.trim().toLowerCase() ===
                id.trim().toLowerCase();
        });
    }

    // Create or update a product row in the table.
    function displayProduct(product, existingRow = null) {
        const row = existingRow || document.createElement("tr");

        // Create the required product columns.
        const values = [
            product.id,
            product.name,
            product.category,
            product.unit,
            "$" + product.price.toFixed(2)
        ];

        // Rebuild the row using safe text content.
        row.replaceChildren();

        values.forEach(function (value) {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });

        // Add Edit and Delete buttons.
        const actionCell = document.createElement("td");

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className =
            "btn btn-sm btn-outline-primary me-2";
        editButton.textContent = "Edit";
        editButton.addEventListener("click", function () {
            loadProduct(product.id);
        });

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className =
            "btn btn-sm btn-outline-danger";
        deleteButton.textContent = "Delete";
        deleteButton.addEventListener("click", function () {
            if (editingID === product.id) {
                resetForm();
            }

            row.remove();
            showMessage("Product deleted successfully.", "success");
        });

        actionCell.append(editButton, deleteButton);
        row.appendChild(actionCell);

        if (!existingRow) {
            tableBody.appendChild(row);
        }
    }

    // Read product information from the form.
    function getProductFromForm() {
        return {
            id: productID.value.trim(),
            name: productName.value.trim(),
            category: category.value,
            unit: unit.value,
            price: Number(price.value)
        };
    }

    // Add a new product when the form is submitted.
    form.addEventListener("submit", function (event) {
        event.preventDefault();

        if (!validateForm()) {
            return;
        }

        const product = getProductFromForm();

        // Prevent duplicate Product IDs when adding products.
        if (!editingID && findProductRow(product.id)) {
            productID.classList.add("is-invalid");
            showMessage(
                "This Product ID already exists. Please use a different ID.",
                "danger"
            );
            return;
        }

        // Update the selected product if editing.
        if (editingID) {
            const row = findProductRow(editingID);

            if (!row) {
                showMessage("The product could not be found.", "danger");
                return;
            }

            // Prevent changing an ID to one already in use.
            const duplicate = findProductRow(product.id);

            if (duplicate && duplicate !== row) {
                productID.classList.add("is-invalid");
                showMessage(
                    "Another product already uses this ID.",
                    "danger"
                );
                return;
            }

            displayProduct(product, row);
            showMessage("Product updated successfully!", "success");
        } else {
            displayProduct(product);
            showMessage("Product added successfully!", "success");
        }

        resetForm();
    });

    // Load an existing product into the form.
    function loadProduct(id) {
        const row = findProductRow(id);

        if (!row) {
            showMessage("Product not found.", "danger");
            return;
        }

        productID.value = row.cells[0].textContent.trim();
        productName.value = row.cells[1].textContent.trim();
        category.value = row.cells[2].textContent.trim();
        unit.value = row.cells[3].textContent.trim();

        price.value = row.cells[4].textContent
            .replace("$", "")
            .trim();

        editingID = id;

        showMessage(
            "Edit the product details, then submit the form to save changes.",
            "info"
        );

        form.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    // Reset the form after adding or updating a product.
    function resetForm() {
        form.reset();
        form.classList.remove("was-validated");

        form.querySelectorAll(".is-valid, .is-invalid")
            .forEach(function (field) {
                field.classList.remove("is-valid", "is-invalid");
            });

        editingID = null;
    }

    // Connect the existing Update button, if present.
    if (updateButton) {
        updateButton.addEventListener("click", function () {
            if (!editingID) {
                showMessage(
                    "Select a product using its Edit button before updating.",
                    "warning"
                );
                return;
            }

            form.requestSubmit();
        });
    }

    // Add an Actions heading if the table does not already have one.
    const table = tableBody.closest("table");
    const headerRow = table
        ? table.querySelector("thead tr")
        : null;

    if (
        headerRow &&
        headerRow.cells.length === 5
    ) {
        const heading = document.createElement("th");
        heading.textContent = "Actions";
        headerRow.appendChild(heading);
    }

    // Add action buttons to existing sample product rows.
    Array.from(tableBody.rows).forEach(function (row) {
        if (row.cells.length === 5) {
            const id = row.cells[0].textContent.trim();
            const name = row.cells[1].textContent.trim();
            const productCategory = row.cells[2].textContent.trim();
            const productUnit = row.cells[3].textContent.trim();
            const productPrice = Number(
                row.cells[4].textContent.replace("$", "").trim()
            );

            displayProduct({
                id: id,
                name: name,
                category: productCategory,
                unit: productUnit,
                price: productPrice
            }, row);
        }
    });
});
