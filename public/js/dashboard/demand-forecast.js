const FORECAST_CACHE_PREFIX = "pawTrackForecast:";
const FORECAST_LAST_MONTH_KEY = "pawTrackForecast:lastMonth";
let currentInventoryComparisonData = null;

function saveForecastCache(month, data) {
    try {
        sessionStorage.setItem(
            FORECAST_CACHE_PREFIX + month,
            JSON.stringify(data)
        );
        sessionStorage.setItem(FORECAST_LAST_MONTH_KEY, month);
    } catch (error) {
        console.warn("Unable to save forecast cache:", error);
    }
}

function getForecastCache(month) {
    try {
        const cached = sessionStorage.getItem(
            FORECAST_CACHE_PREFIX + month
        );
        return cached ? JSON.parse(cached) : null;
    } catch (error) {
        console.warn("Unable to restore forecast cache:", error);
        return null;
    }
}

async function restoreForecast(data) {
    window.currentForecastData = data;

    renderForecast(data);
    renderHistoryChart(data);

    setForecastMessage(
        "Restored saved forecast. Values are estimates, not guaranteed sales.",
        "success"
    );

    document.getElementById("modelStatusText").innerHTML =
        '<i class="fa-solid fa-circle"></i> Model: Saved results restored';

    document.getElementById("modelStatusBadge").textContent =
        "SAVED RESULTS";

    document.getElementById("resultStatusBadge").textContent =
        "Estimate";

    await loadInventoryComparison(data.forecast_month);
}

document.addEventListener("DOMContentLoaded", () => {
    const monthSelect = document.getElementById("forecastMonth");
    const yearInput = document.getElementById("forecastYear");
    const categorySelect = document.getElementById("forecastCategory");
    const generateButton = document.getElementById("generateForecastBtn");

    generateButton.addEventListener("click", generateForecast);

    // Default to the next calendar month.
    const now = new Date();
    const nextMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        1
    );

    monthSelect.value = String(nextMonth.getMonth() + 1).padStart(2, "0");
    yearInput.value = nextMonth.getFullYear();

    // Restore the last selected month and year, if available.
    const lastMonth = sessionStorage.getItem(FORECAST_LAST_MONTH_KEY);
    const match = lastMonth?.match(/^(\d{4})-(\d{2})$/);

    if (match) {
        yearInput.value = match[1];
        monthSelect.value = match[2];
    }

    restoreCachedForecast();

    // Restore a cached forecast when the selected month or year changes.
    monthSelect.addEventListener("change", restoreCachedForecast);
    yearInput.addEventListener("change", restoreCachedForecast);

    categorySelect.addEventListener("change", () => {
        if (window.currentForecastData) {
            renderForecast(window.currentForecastData);
            renderHistoryChart(window.currentForecastData);
        }

        if (currentInventoryComparisonData) {
            renderInventoryComparison(currentInventoryComparisonData);
        }
    });

    loadForecastCategories();
});

function restoreCachedForecast() {
    const monthSelect = document.getElementById("forecastMonth");
    const yearInput = document.getElementById("forecastYear");

    const month = monthSelect.value;
    const year = Number(yearInput.value);

    if (
        !month ||
        !Number.isInteger(year) ||
        year < 2026 ||
        year > 2100
    ) {
        window.currentForecastData = null;
        setForecastMessage("Please enter a valid forecast month and year.", "error");
        return;
    }

    const monthKey = `${year}-${month}`;
    const cached = getForecastCache(monthKey);

    if (cached && Array.isArray(cached.forecasts)) {
        restoreForecast(cached);
    } else {
        window.currentForecastData = null;

        setForecastMessage(
            "No saved forecast for this month. Click Generate Forecast.",
            ""
        );
    }
}

async function loadForecastCategories() {
    const select = document.getElementById("forecastCategory");
    try {
        const response = await fetch("/api/products");
        const result = await response.json();
        if (!response.ok) throw new Error(result.detail || "Unable to load product categories.");

        const products = Array.isArray(result) ? result : (result.products || []);
        const categories = [...new Set(products.map(p => p.category).filter(Boolean))].sort();
        select.innerHTML = '<option value="">All Categories</option>';
        categories.forEach(category => {
            const option = document.createElement("option");
            option.value = category;
            option.textContent = category;
            select.appendChild(option);
        });
    } catch (error) {
        // Category filtering is optional; forecasting should still work if this endpoint differs.
        console.warn("Forecast category list unavailable:", error.message);
    }
}

async function generateForecast() {
    const monthSelect = document.getElementById("forecastMonth");
    const yearInput = document.getElementById("forecastYear");
    const button = document.getElementById("generateForecastBtn");

    const month = monthSelect.value;
    const year = Number(yearInput.value);

    if (
        !month ||
        !Number.isInteger(year) ||
        year < 2026 ||
        year > 2100
    ) {
        setForecastMessage(
            "Please select a month and enter a year from 2026 to 2100.",
            "error"
        );
        return;
    }

    const forecastMonth = `${year}-${month}`;

    button.disabled = true;
    button.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin"></i> Generating...';

    setForecastMessage(
        "Generating forecast. Historical records are being processed.",
        "loading"
    );

    document.getElementById("modelStatusText").innerHTML =
        '<i class="fa-solid fa-circle"></i> Model: Running';

    document.getElementById("modelStatusBadge").textContent = "GENERATING";

    try {
        const response = await fetch(
            `/api/forecast?month=${encodeURIComponent(forecastMonth)}`
        );

        let result;

        try {
            result = await response.json();
        } catch {
            throw new Error(
                "The forecast endpoint returned a response that is not valid JSON."
            );
        }

        if (!response.ok) {
            throw new Error(
                result.detail ||
                result.message ||
                `Forecast request failed (${response.status}).`
            );
        }

        if (!result || !Array.isArray(result.forecasts)) {
            throw new Error(
                "The API response does not contain the expected 'forecasts' array."
            );
        }

        saveForecastCache(forecastMonth, result);
        restoreForecast(result);
    } catch (error) {
        console.error("Demand forecast error:", error);

        setForecastMessage(
            error.message ||
            "Unable to generate the forecast. Check the API route and server logs.",
            "error"
        );

        document.getElementById("modelStatusText").innerHTML =
            '<i class="fa-solid fa-circle"></i> Model: Request failed';

        document.getElementById("modelStatusBadge").textContent =
            "REQUEST FAILED";

        document.getElementById("resultStatusBadge").textContent =
            "Unavailable";
    } finally {
        button.disabled = false;
        button.innerHTML =
            '<i class="fa-solid fa-rotate"></i> Generate Forecast';
    }
}

function getFilteredForecasts(data) {
    const selectedCategory = document.getElementById("forecastCategory").value;
    let rows = [...data.forecasts];
    if (selectedCategory) {
        rows = rows.filter(row => row.major_category === selectedCategory);
    }
    return rows.sort((a, b) => Number(b.predicted_monthly_demand || 0) - Number(a.predicted_monthly_demand || 0));
}

function renderForecast(data) {
    const rows = getFilteredForecasts(data);
    const total = rows.reduce((sum, row) => sum + Number(row.predicted_monthly_demand || 0), 0);
    document.getElementById("forecastTotal").textContent = formatNumber(
        document.getElementById("forecastCategory").value ? total : (data.total_predicted_demand ?? total)
    );
    document.getElementById("forecastPeriod").innerHTML =
        `<i class="fa-regular fa-calendar"></i> Forecast period: ${escapeHtml(data.forecast_month || "—")}`;
    document.getElementById("forecastCountBadge").textContent = `${rows.length} subcategories`;
    renderForecastTable(rows, data.forecast_month);
    renderBarChart(rows);
}

function renderForecastTable(rows, forecastMonth) {
    const tbody = document.getElementById("forecastTableBody");
    if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-table-state"><strong>No subcategories match this category.</strong></td></tr>';
        return;
    }

    tbody.innerHTML = rows.map((row, index) => `
        <tr>
            <td><span class="rank-badge">${index + 1}</span></td>
            <td><strong>${escapeHtml(row.subcategory || "Unspecified")}</strong></td>
            <td>${escapeHtml(row.major_category || "—")}</td>
            <td>${escapeHtml(row.forecast_month || forecastMonth || "—")}</td>
            <td class="text-right">${formatNumber(row.predicted_daily_demand)}</td>
            <td class="text-right forecast-value">${formatNumber(row.predicted_monthly_demand)}</td>
        </tr>
    `).join("");
}

function renderBarChart(rows) {
    const canvas = document.getElementById("demandBarChart");
    const empty = document.getElementById("barChartEmpty");
    const selectedRows = rows.slice(0, 12);
    if (!selectedRows.length) {
        empty.style.display = "flex";
        if (window.demandBarChartInstance) window.demandBarChartInstance.destroy();
        return;
    }
    empty.style.display = "none";
    if (window.demandBarChartInstance) window.demandBarChartInstance.destroy();
    if (!window.Chart) {
        empty.style.display = "flex";
        empty.querySelector("p").textContent = "Chart library could not load.";
        return;
    }
    window.demandBarChartInstance = new Chart(canvas, {
        type: "bar",
        data: {
            labels: selectedRows.map(row => row.subcategory),
            datasets: [{
                label: "Predicted monthly demand (units)",
                data: selectedRows.map(row => Number(row.predicted_monthly_demand || 0)),
                backgroundColor: "#204e33",
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: "y",
            plugins: { legend: { display: false } },
            scales: {
                x: { beginAtZero: true, title: { display: true, text: "Predicted units" } },
                y: { ticks: { autoSkip: false } }
            }
        }
    });
}

function renderHistoryChart(data) {
    const rows = getFilteredForecasts(data);
    const forecast = rows[0];
    const canvas = document.getElementById("demandHistoryChart");
    const empty = document.getElementById("historyChartEmpty");

    if (!forecast || !Array.isArray(forecast.historical_monthly_demand) || !forecast.historical_monthly_demand.length) {
        empty.style.display = "flex";
        if (window.demandHistoryChartInstance) window.demandHistoryChartInstance.destroy();
        return;
    }
    empty.style.display = "none";
    document.getElementById("historyChartSubtitle").textContent =
        `${forecast.subcategory}: historical monthly quantity and forecast for ${data.forecast_month}.`;

    const history = forecast.historical_monthly_demand;
    const labels = history.map(point => point.month);
    const actuals = history.map(point => Number(point.quantity || 0));
    labels.push(data.forecast_month);
    actuals.push(null);
    const predicted = Array(labels.length - 1).fill(null);
    predicted.push(Number(forecast.predicted_monthly_demand || 0));

    if (window.demandHistoryChartInstance) window.demandHistoryChartInstance.destroy();
    if (!window.Chart) {
        empty.style.display = "flex";
        empty.querySelector("p").textContent = "Chart library could not load.";
        return;
    }
    window.demandHistoryChartInstance = new Chart(canvas, {
        type: "line",
        data: {
            labels,
            datasets: [
                {
                    label: "Historical monthly quantity",
                    data: actuals,
                    borderColor: "#204e33",
                    backgroundColor: "#204e33",
                    tension: 0.2,
                    pointRadius: 2,
                    spanGaps: false
                },
                {
                    label: "Predicted monthly demand",
                    data: predicted,
                    borderColor: "#d97736",
                    backgroundColor: "#d97736",
                    borderDash: [6, 4],
                    tension: 0,
                    pointRadius: 5,
                    spanGaps: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            plugins: { legend: { position: "bottom" } },
            scales: {
                y: { beginAtZero: true, title: { display: true, text: "Units" } },
                x: { ticks: { maxTicksLimit: 12 } }
            }
        }
    });
}

function setForecastMessage(message, type) {
    const el = document.getElementById("forecastMessage");
    el.textContent = message;
    el.className = `forecast-message ${type || ""}`;
}

function formatNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.round(number).toLocaleString() : "—";
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[char]));
}

async function loadInventoryComparison(month) {
    const tbody = document.getElementById("inventoryComparisonTableBody");
    const message = document.getElementById("inventoryComparisonMessage");
    const monthBadge = document.getElementById("inventoryComparisonMonth");

    currentInventoryComparisonData = null;

    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="empty-table-state">
                <i class="fa-solid fa-spinner fa-spin"></i>
                <strong>Loading inventory comparison...</strong>
            </td>
        </tr>
    `;

    monthBadge.textContent = "Loading...";
    message.textContent = "";

    try {
        const response = await fetch(
            `/api/products/forecast-comparison?month=${encodeURIComponent(month)}`
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.detail ||
                result.message ||
                "Unable to load inventory comparison."
            );
        }

        if (!Array.isArray(result.comparisons)) {
            throw new Error(
                "The API response does not contain a valid comparisons array."
            );
        }

        currentInventoryComparisonData = result;

        renderInventoryComparison(result);

        monthBadge.textContent = result.forecast_month || month;
        message.textContent = "Inventory comparison successfully loaded.";

    } catch (error) {
        console.error("Inventory comparison error:", error);

        currentInventoryComparisonData = null;

        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-table-state">
                    <i class="fa-solid fa-circle-exclamation"></i>
                    <strong>Unable to load inventory comparison.</strong>
                    <span>${escapeHtml(error.message)}</span>
                </td>
            </tr>
        `;

        monthBadge.textContent = "Unavailable";
        message.textContent = error.message;
    }
}

function renderInventoryComparison(data) {
    const tbody = document.getElementById("inventoryComparisonTableBody");
    const selectedCategory = document.getElementById("forecastCategory").value;

    let rows = [...data.comparisons];

    if (selectedCategory) {
        rows = rows.filter(
            row => row.major_category === selectedCategory
        );
    }

    rows.sort((a, b) =>
        Number(b.predicted_monthly_demand || 0) -
        Number(a.predicted_monthly_demand || 0)
    );

    if (!rows.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-table-state">
                    <strong>No inventory comparison available.</strong>
                    <span>No subcategories match the selected category.</span>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = rows.map(row => {
        const demand = Number(row.predicted_monthly_demand || 0);
        const stock = Number(row.total_stock || 0);
        const shortage = Number(row.shortage || 0);

        const status = String(row.status || "").toLowerCase();

        let statusLabel = "Unknown";
        let statusClass = "unknown";

        if (status === "out_of_stock") {
            statusLabel = "Out of Stock";
            statusClass = "out-of-stock";
        } else if (status === "low_stock") {
            statusLabel = "Low Stock";
            statusClass = "low-stock";
        } else if (status === "sufficient") {
            statusLabel = "Sufficient";
            statusClass = "sufficient";
        }

        return `
            <tr>
                <td>
                    <strong>${escapeHtml(row.subcategory || "Unspecified")}</strong>
                </td>

                <td>${escapeHtml(row.major_category || "—")}</td>

                <td class="text-right">
                    ${formatNumber(demand)}
                </td>

                <td class="text-right">
                    ${formatNumber(stock)}
                </td>

                <td class="text-right">
                    ${formatNumber(shortage)}
                </td>

                <td class="text-center">
                    <span class="stock-status ${statusClass}">
                        ${statusLabel}
                    </span>
                </td>
            </tr>
        `;
    }).join("");
}