
let allProducts = [];
let forecastComparisons = [];

document.addEventListener("DOMContentLoaded", () => {
    loadProducts();

    document.getElementById("productSearchInput").addEventListener("input", applyFilters);
    document.getElementById("categoryFilter").addEventListener("change", applyFilters);
    document.getElementById("stockLevelFilter").addEventListener("change", applyFilters);

    document.getElementById("addProductBtn").addEventListener("click", () => {
        document.getElementById("addProductModal").classList.add("show");
    });

    document.getElementById("closeProductModal").addEventListener("click", closeAddProductModal);
    document.getElementById("cancelProductBtn").addEventListener("click", closeAddProductModal);
    document.getElementById("addProductForm").addEventListener("submit", handleAddProduct);

    document.getElementById("closeAddStockModal").addEventListener("click", closeAddStockModal);
    document.getElementById("cancelAddStockBtn").addEventListener("click", closeAddStockModal);
    document.getElementById("addStockForm").addEventListener("submit", handleAddStock);

    document.getElementById("closeDeductStockModal").addEventListener("click", closeDeductStockModal);
    document.getElementById("cancelDeductStockBtn").addEventListener("click", closeDeductStockModal);
    document.getElementById("deductStockForm").addEventListener("submit", handleDeductStock);

    document.getElementById("productsTableBody").addEventListener("click", handleProductActions);

    document.querySelectorAll(".modal-overlay").forEach(modal => {
        modal.addEventListener("click", event => {
            if (event.target === modal) {
                modal.classList.remove("show");
            }
        });
    });
});

async function loadProducts() {
    try {
        const response = await fetch("/api/products");

        if (!response.ok) {
            throw new Error("Failed to load products.");
        }

        const result = await response.json();

        allProducts = result.products || [];

        await loadForecastComparisons();

        updateProductMetrics();
        populateCategoryFilter();
        applyFilters();
    } catch (error) {
        console.error("Load products error:", error);

        await Swal.fire({
            icon: "error",
            title: "Unable to Load Products",
            text: error.message || "Something went wrong while loading products."
        });
    }
}

async function loadForecastComparisons() {
    try {
        const currentDate = new Date();
        const month = [
            currentDate.getFullYear(),
            String(currentDate.getMonth() + 1).padStart(2, "0")
        ].join("-");

        const response = await fetch(
            `/api/products/forecast-comparison?month=${month}`
        );

        if (!response.ok) {
            const result = await response.json();
            throw new Error(result.detail || "Unable to load forecast comparison.");
        }

        const result = await response.json();

        forecastComparisons = result.comparisons || [];
    } catch (error) {
        forecastComparisons = [];
        console.error("Forecast comparison error:", error);
    }
}

function getForecastComparison(subcategory) {
    const key = String(subcategory || "").trim().toUpperCase();

    return forecastComparisons.find(item =>
        String(item.subcategory || "").trim().toUpperCase() === key
    ) || null;
}

function isForecastLowStock(product) {
    const comparison = getForecastComparison(product.subcategory);

    if (!comparison) {
        return false;
    }

    return Number(comparison.total_stock) <
        Number(comparison.predicted_monthly_demand);
}

function applyFilters() {
    const searchTerm = document
        .getElementById("productSearchInput")
        .value
        .toLowerCase()
        .trim();

    const selectedCategory = document.getElementById("categoryFilter").value;
    const selectedStockLevel = document.getElementById("stockLevelFilter").value;

    const filteredProducts = allProducts.filter(product => {
        const name = String(product.name || "").toLowerCase();
        const sku = String(product.sku || "").toLowerCase();
        const category = String(product.category || "").toLowerCase();
        const subcategory = String(product.subcategory || "").toLowerCase();

        const matchesSearch =
            name.includes(searchTerm) ||
            sku.includes(searchTerm) ||
            category.includes(searchTerm) ||
            subcategory.includes(searchTerm);

        const matchesCategory =
            selectedCategory === "" ||
            product.category === selectedCategory;

        const stock = Number(product.stock_quantity);

        let matchesStockLevel = true;

        if (selectedStockLevel === "in-stock") {
            matchesStockLevel = stock > 0 && !isForecastLowStock(product);
        }

        if (selectedStockLevel === "low-stock") {
            matchesStockLevel = stock > 0 && isForecastLowStock(product);
        }

        if (selectedStockLevel === "out-of-stock") {
            matchesStockLevel = stock <= 0;
        }

        return matchesSearch && matchesCategory && matchesStockLevel;
    });

    renderProducts(filteredProducts);
}

function updateProductMetrics() {
    const totalProducts = allProducts.length;

    const inStock = allProducts.filter(product =>
        Number(product.stock_quantity) > 0
    ).length;

    const outOfStock = allProducts.filter(product =>
        Number(product.stock_quantity) <= 0
    ).length;

    const lowStockSubcategories = forecastComparisons.filter(comparison =>
        Number(comparison.total_stock) <
        Number(comparison.predicted_monthly_demand)
    ).length;

    document.getElementById("totalProducts").textContent = totalProducts;
    document.getElementById("inStockCount").textContent = inStock;
    document.getElementById("lowStockCount").textContent = lowStockSubcategories;
    document.getElementById("outOfStockCount").textContent = outOfStock;
}

function renderProducts(products) {
    const tableBody = document.getElementById("productsTableBody");

    tableBody.innerHTML = "";

    document.getElementById("productCountText").textContent =
        `Showing ${products.length} product${products.length === 1 ? "" : "s"}`;

    if (products.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-table-message">
                    No products found.
                </td>
            </tr>
        `;
        return;
    }

    products.forEach(product => {
        const row = document.createElement("tr");

        const productName = escapeHTML(product.name);
        const productSku = escapeHTML(product.sku);
        const category = escapeHTML(product.category);
        const unit = escapeHTML(product.unit);
        const stock = Number(product.stock_quantity);
        const price = Number(product.price);
        const productId = Number(product.id);

        row.innerHTML = `
            <td>
                <div class="product-item-cell">
                    <div>
                        <strong>${productName}</strong>
                        <span>SKU: ${productSku}</span>
                    </div>
                </div>
            </td>

            <td>
                <span class="category-pill">${category}</span>
            </td>

            <td>
                <strong>₱${price.toLocaleString("en-PH", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                })}</strong>
            </td>

            <td>
                <div class="stock-qty-wrap">
                    <span>${stock} ${unit}</span>
                </div>
            </td>

            <td>
                ${getStockStatus(product)}
            </td>

            <td class="text-right">
                <button
                    type="button"
                    class="action-text-btn add-stock-btn"
                    data-id="${productId}"
                >
                    Add Stock
                </button>

                <button
                    type="button"
                    class="action-text-btn red deduct-stock-btn"
                    data-id="${productId}"
                >
                    Deduct
                </button>
            </td>
        `;

        tableBody.appendChild(row);
    });
}

function getStockStatus(product) {
    const stock = Number(product.stock_quantity);

    if (stock <= 0) {
        return '<span class="status-badge red">● Out of Stock</span>';
    }

    if (isForecastLowStock(product)) {
        return '<span class="status-badge yellow">● Low Stock</span>';
    }

    return '<span class="status-badge green">● In Stock</span>';
}

function populateCategoryFilter() {
    const categoryFilter = document.getElementById("categoryFilter");
    const selectedCategory = categoryFilter.value;

    const categories = [
        ...new Set(allProducts.map(product => product.category).filter(Boolean))
    ].sort();

    categoryFilter.innerHTML = '<option value="">All Categories</option>';

    categories.forEach(category => {
        const option = document.createElement("option");

        option.value = category;
        option.textContent = category;

        categoryFilter.appendChild(option);
    });

    if (categories.includes(selectedCategory)) {
        categoryFilter.value = selectedCategory;
    }
}

function handleProductActions(event) {
    const addButton = event.target.closest(".add-stock-btn");
    const deductButton = event.target.closest(".deduct-stock-btn");

    if (addButton) {
        openAddStockModal(addButton.dataset.id);
        return;
    }

    if (deductButton) {
        openDeductStockModal(deductButton.dataset.id);
    }
}

function openAddStockModal(productId) {
    const product = allProducts.find(item =>
        Number(item.id) === Number(productId)
    );

    if (!product) {
        return;
    }

    document.getElementById("addStockProductId").value = product.id;
    document.getElementById("addStockProductName").value = product.name;
    document.getElementById("addStockCurrentQuantity").value = product.stock_quantity;
    document.getElementById("addStockQuantity").value = "";

    document.getElementById("addStockModal").classList.add("show");
}

function closeAddStockModal() {
    document.getElementById("addStockModal").classList.remove("show");
    document.getElementById("addStockForm").reset();
}

function openDeductStockModal(productId) {
    const product = allProducts.find(item =>
        Number(item.id) === Number(productId)
    );

    if (!product) {
        return;
    }

    document.getElementById("deductStockProductId").value = product.id;
    document.getElementById("deductStockProductName").value = product.name;
    document.getElementById("deductStockCurrentQuantity").value = product.stock_quantity;
    document.getElementById("deductStockQuantity").value = "";
    document.getElementById("deductStockQuantity").max = product.stock_quantity;

    document.getElementById("deductStockModal").classList.add("show");
}

function closeDeductStockModal() {
    document.getElementById("deductStockModal").classList.remove("show");
    document.getElementById("deductStockForm").reset();
}

function closeAddProductModal() {
    document.getElementById("addProductModal").classList.remove("show");
    document.getElementById("addProductForm").reset();
}

async function handleAddProduct(event) {
    event.preventDefault();

    const productData = {
        name: document.getElementById("productName").value.trim(),
        sku: document.getElementById("productSku").value.trim(),
        category: document.getElementById("productCategory").value.trim(),
        subcategory: document.getElementById("productSubcategory").value.trim(),
        price: Number(document.getElementById("productPrice").value),
        unit: document.getElementById("productUnit").value.trim()
    };

    try {
        const response = await fetch("/api/products", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(productData)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || "Failed to add product.");
        }

        closeAddProductModal();

        await loadProducts();

        await Swal.fire({
            icon: "success",
            title: "Product Added",
            text: "The product was added successfully with zero initial stock.",
            timer: 1500,
            timerProgressBar: true,
            showConfirmButton: false
        });
    } catch (error) {
        console.error("Add product error:", error);

        await Swal.fire({
            icon: "error",
            title: "Failed to Add Product",
            text: error.message || "Unable to connect to the server."
        });
    }
}

async function handleAddStock(event) {
    event.preventDefault();

    const productId = document.getElementById("addStockProductId").value;
    const quantity = Number(document.getElementById("addStockQuantity").value);

    if (!Number.isInteger(quantity) || quantity <= 0) {
        await Swal.fire({
            icon: "warning",
            title: "Invalid Quantity",
            text: "Enter a quantity greater than zero."
        });
        return;
    }

    try {
        const response = await fetch(`/api/products/${productId}/stock/add`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ quantity })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || "Unable to add stock.");
        }

        closeAddStockModal();

        await loadProducts();

        await Swal.fire({
            icon: "success",
            title: "Stock Added",
            text: `Stock successfully increased by ${quantity}.`,
            timer: 1500,
            timerProgressBar: true,
            showConfirmButton: false
        });
    } catch (error) {
        console.error("Add stock error:", error);

        await Swal.fire({
            icon: "error",
            title: "Stock Addition Failed",
            text: error.message || "Unable to connect to the server."
        });
    }
}

async function handleDeductStock(event) {
    event.preventDefault();

    const productId = document.getElementById("deductStockProductId").value;
    const quantity = Number(document.getElementById("deductStockQuantity").value);
    const currentStock = Number(
        document.getElementById("deductStockCurrentQuantity").value
    );

    if (!Number.isInteger(quantity) || quantity <= 0) {
        await Swal.fire({
            icon: "warning",
            title: "Invalid Quantity",
            text: "Enter a quantity greater than zero."
        });
        return;
    }

    if (quantity > currentStock) {
        await Swal.fire({
            icon: "warning",
            title: "Insufficient Stock",
            text: "The deduction quantity cannot exceed the current stock."
        });
        return;
    }

    try {
        const response = await fetch(`/api/products/${productId}/stock/deduct`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ quantity })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || "Unable to deduct stock.");
        }

        closeDeductStockModal();

        await loadProducts();

        await Swal.fire({
            icon: "success",
            title: "Stock Deducted",
            text: `Stock successfully decreased by ${quantity}.`,
            timer: 1500,
            timerProgressBar: true,
            showConfirmButton: false
        });
    } catch (error) {
        console.error("Deduct stock error:", error);

        await Swal.fire({
            icon: "error",
            title: "Stock Deduction Failed",
            text: error.message || "Unable to connect to the server."
        });
    }
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return entities[character];
    });
}