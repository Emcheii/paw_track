
const FORECAST_CACHE_PREFIX = "pawTrackForecast:";
const FORECAST_LAST_MONTH_KEY = "pawTrackForecast:lastMonth";

document.addEventListener("DOMContentLoaded", () => {
    loadDashboardSummary();
    loadLowStockProducts();
    loadForecastDemand();
    setCurrentDate();
    loadDemandOverviewChart();
});

async function loadDashboardSummary() {
    try {
        const response = await fetch("/api/dashboard/summary");

        const result = await response.json();

        if (!response.ok) {
            console.error("Dashboard summary error:", result.detail);
            return;
        }

        document.getElementById("totalProducts").textContent =
            result.totalProducts;

        document.getElementById("currentStock").textContent =
            result.currentStock;

    } catch (error) {
        console.error("Load dashboard summary error:", error);
    }
}


function loadForecastDemand() {
    const demandElement = document.getElementById("forecastDemand");
    const subtitleElement = document.getElementById("forecastDemandSubtitle");

    if (!demandElement || !subtitleElement) return;

    try {
        const month = sessionStorage.getItem(FORECAST_LAST_MONTH_KEY);

        if (!month) {
            demandElement.textContent = "-";
            subtitleElement.textContent = "No saved forecast available";
            return;
        }

        const cached = sessionStorage.getItem(
            FORECAST_CACHE_PREFIX + month
        );

        if (!cached) {
            demandElement.textContent = "-";
            subtitleElement.textContent = "No saved forecast available";
            return;
        }

        const data = JSON.parse(cached);

        if (
            !data ||
            !Array.isArray(data.forecasts) ||
            !Number.isFinite(Number(data.total_predicted_demand))
        ) {
            demandElement.textContent = "-";
            subtitleElement.textContent = "Saved forecast data is invalid";
            return;
        }

        demandElement.textContent =
            Number(data.total_predicted_demand).toLocaleString();

        subtitleElement.textContent =
            `Forecast for ${data.forecast_month || month}`;

    } catch (error) {
        console.error("Load forecast demand error:", error);
        demandElement.textContent = "-";
        subtitleElement.textContent = "Unable to read saved forecast";
    }
}


async function loadLowStockProducts() {
    try {
        const response = await fetch("/api/dashboard/low-stock");

        const result = await response.json();

        if (!response.ok) {
            console.error("Low stock error:", result.detail);
            return;
        }

        renderLowStockProducts(result.products);

    } catch (error) {
        console.error("Load low stock products error:", error);
    }
}


function renderLowStockProducts(products) {
    const tableBody = document.getElementById("lowStockTableBody");

    if (!tableBody) return;

    tableBody.innerHTML = "";

    if (!Array.isArray(products) || products.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-table-state">
                    No low stock products.
                </td>
            </tr>
        `;
        return;
    }

    products.forEach((product) => {
        const stock = Number(product.stock_quantity ?? 0);
        const threshold = Number(product.low_stock_threshold ?? 0);

        let status;
        let statusClass;

        if (stock <= 0) {
            status = "Out of Stock";
            statusClass = "dark-red";
        } else if (stock <= threshold) {
            status = "Low Stock";
            statusClass = "yellow";
        } else {
            status = "In Stock";
            statusClass = "green";
        }

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>
                <div class="product-item-cell">
                    <div>
                        <strong>${escapeHtml(product.name || "Unnamed Product")}</strong>
                        <span>SKU: ${escapeHtml(product.sku || "—")}</span>
                    </div>
                </div>
            </td>
            <td>
                <span class="category-pill">
                    ${escapeHtml(product.category || "—")}
                </span>
            </td>
            <td>
                <strong>${escapeHtml(stock)} ${escapeHtml(product.unit || "units")}</strong>
            </td>
            <td class="text-right">
                <span class="status-badge ${statusClass}">
                    ● ${status}
                </span>
            </td>
        `;

        tableBody.appendChild(row);
    });
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[char]));
}



function setCurrentDate() {
    const currentDateElement = document.getElementById("currentDate");

    if (!currentDateElement) {
        return;
    }

    const today = new Date();

    const formattedDate = today.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
    });

    currentDateElement.textContent = formattedDate;
}

let demandOverviewChartInstance = null;

function loadDemandOverviewChart() {
    const emptyState = document.getElementById("demandChartEmpty");
    const chartContainer = document.getElementById("demandChartContainer");
    const canvas = document.getElementById("demandOverviewChart");

    if (!emptyState || !chartContainer || !canvas) return;

    const month = sessionStorage.getItem("pawTrackForecast:lastMonth");
    const cached = month
        ? sessionStorage.getItem("pawTrackForecast:" + month)
        : null;

    if (!cached || typeof Chart === "undefined") {
        emptyState.style.display = "block";
        chartContainer.style.display = "none";
        return;
    }

    try {
        const data = JSON.parse(cached);

        if (!Array.isArray(data.forecasts) || data.forecasts.length === 0) {
            emptyState.style.display = "block";
            chartContainer.style.display = "none";
            return;
        }

        const forecasts = data.forecasts.filter(item =>
            Number.isFinite(Number(item.predicted_monthly_demand))
        );

        if (forecasts.length === 0) {
            emptyState.style.display = "block";
            chartContainer.style.display = "none";
            return;
        }

        const labels = forecasts.map(item =>
            item.subcategory || item.major_category || "Product"
        );

        const values = forecasts.map(item =>
            Number(item.predicted_monthly_demand)
        );

        emptyState.style.display = "none";
        chartContainer.style.display = "block";

        if (demandOverviewChartInstance) {
            demandOverviewChartInstance.destroy();
        }

        demandOverviewChartInstance = new Chart(canvas, {
            type: "bar",
            data: {
                labels,
                datasets: [{
                    label: "Predicted Monthly Demand",
                    data: values,
                    backgroundColor: "#52b788",
                    borderColor: "#2d6a4f",
                    borderWidth: 1,
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 10,
                        right: 12,
                        bottom: 5,
                        left: 5
                    }
                },
                plugins: {
                    legend: {
                        position: "top",
                        align: "start",
                        labels: {
                            boxWidth: 12,
                            boxHeight: 12,
                            padding: 15,
                            usePointStyle: true,
                            pointStyle: "rect"
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: "Predicted Monthly Demand"
                        },
                        ticks: {
                            precision: 0
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: "Product Category"
                        },
                        ticks: {
                            autoSkip: true,
                            maxRotation: 45,
                            minRotation: 0
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error("Demand overview chart error:", error);
        emptyState.style.display = "block";
        chartContainer.style.display = "none";
    }
}