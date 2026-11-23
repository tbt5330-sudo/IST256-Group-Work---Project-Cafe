
"use strict";

// jQuery product search for the Returns page

$(document).ready(function () {

    // Find the existing product card
    const productCard = $(".return-card").first();

    // Create the search input
    const searchBox = $("<input>", {
        type: "search",
        id: "returnSearch",
        class: "form-control mb-3",
        placeholder: "Search products by name..."
    });

    // Add search box to the card
    productCard.find(".card-body").first()
        .prepend(searchBox);

    // Search the products displayed by AngularJS
    $("#returnSearch").on("input", function () {

        const searchTerm = $(this)
            .val()
            .trim()
            .toLowerCase();

        $(".product-item").each(function () {

            const productName = $(this)
                .find("h5")
                .text()
                .toLowerCase();

            // Show matching products
            $(this).toggle(
                productName.includes(searchTerm)
            );

        });

    });

});
