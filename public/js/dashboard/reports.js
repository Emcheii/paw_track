
const FORECAST_CACHE_PREFIX = "pawTrackForecast:";
const FORECAST_LAST_MONTH_KEY = "pawTrackForecast:lastMonth";

document.addEventListener("DOMContentLoaded", () => {
    loadReports();
    setupReportExport();

    // Update the report when returning to this browser tab.
    window.addEventListener("pageshow", loadCachedForecast);
    window.addEventListener("focus", loadCachedForecast);
});

let reportProducts = [];
let reportTopProducts = [];
let reportForecastMonth = null;
let reportChartInstance = null;

function loadCachedForecast() {
    try {
        const month = sessionStorage.getItem(FORECAST_LAST_MONTH_KEY);

        if (!month) {
            reportTopProducts = [];
            reportForecastMonth = null;
            renderTopProducts();
            return;
        }

        const cached = sessionStorage.getItem(
            FORECAST_CACHE_PREFIX + month
        );

        const data = cached ? JSON.parse(cached) : null;

        if (!data || !Array.isArray(data.forecasts)) {
            reportTopProducts = [];
            reportForecastMonth = null;
        } else {
            reportForecastMonth = data.forecast_month || month;

            reportTopProducts = [...data.forecasts]
                .sort(
                    (a, b) =>
                        Number(b.predicted_monthly_demand || 0) -
                        Number(a.predicted_monthly_demand || 0)
                )
                .slice(0, 5);
        }

        renderTopProducts();
    } catch (error) {
        console.error("Unable to load cached forecast:", error);
        reportTopProducts = [];
        reportForecastMonth = null;
        renderTopProducts();
    }
}

async function loadReports() {
    try {
        const response = await fetch("/api/products");
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || "Unable to load inventory.");
        }

        reportProducts = Array.isArray(result)
            ? result
            : result.products || [];

        // Summary metrics are calculated from current inventory.
        const total = reportProducts.length;

        const lowStock = reportProducts.filter(product => {
            const stock = Number(product.stock_quantity) || 0;
            const threshold = Number(product.low_stock_threshold) || 0;
            return stock > 0 && stock <= threshold;
        }).length;

        const outOfStock = reportProducts.filter(
            product => (Number(product.stock_quantity) || 0) <= 0
        ).length;

        renderInventoryMetrics({
            total_products: total,
            low_stock_products: lowStock,
            out_of_stock_products: outOfStock
        });

        renderInventoryTable();
        loadCachedForecast();
    } catch (error) {
        console.error("Reports loading error:", error);
        showReportsError();
    }
}


function renderInventoryMetrics(summary) {
    const cards = document.querySelectorAll(".metric-card");

    const metrics = [
        {
            title: "Total Products",
            value: summary.total_products ?? 0,
            description: "Products in inventory"
        },
        {
            title: "Low-Stock Products",
            value: summary.low_stock_products ?? 0,
            description: "Products at or below stock threshold, excluding zero stock"
        },
        {
            title: "Out-of-Stock Products",
            value: summary.out_of_stock_products ?? 0,
            description: "Products with zero or negative stock"
        }
    ];

    metrics.forEach((metric, index) => {
        const card = cards[index];
        if (!card) return;

        const title = card.querySelector(
            ".metric-label, .metric-title, h3, h4"
        );
        const value = card.querySelector(".metric-value");
        const description = card.querySelector(".metric-subtext");

        if (title) title.textContent = metric.title;
        if (value) value.textContent = Number(metric.value).toLocaleString();
        if (description) description.textContent = metric.description;
    });

    // Hide the fourth old metric card because the graph is our fourth section.
    if (cards[3]) {
        cards[3].style.display = "none";
    }
}


function renderTopProducts() {
    const tables = document.querySelectorAll(".data-table");
    const salesTable = tables[0];

    if (salesTable) {
        const headers = salesTable.querySelectorAll("thead th");
        const headerLabels = [
            "SUBCATEGORY",
            "CATEGORY",
            "PREDICTED MONTH",
            "PREDICTED MONTHLY DEMAND",
            "RANK"
        ];

        headers.forEach((header, index) => {
            if (headerLabels[index]) {
                header.textContent = headerLabels[index];
            }
        });

        const tbody = salesTable.querySelector("tbody");

        if (tbody) {
            tbody.replaceChildren();

            if (reportTopProducts.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" class="empty-table-state">
                            No cached forecast available. Generate a forecast first.
                        </td>
                    </tr>
                `;
            } else {
                reportTopProducts.forEach((item, index) => {
                    const row = document.createElement("tr");

                    [
                        item.subcategory || "Unspecified",
                        item.major_category || "—",
                        item.forecast_month || reportForecastMonth || "—",
                        Number(
                            item.predicted_monthly_demand || 0
                        ).toLocaleString(),
                        `#${index + 1}`
                    ].forEach(value => {
                        const cell = document.createElement("td");
                        cell.textContent = value;
                        row.appendChild(cell);
                    });

                    tbody.appendChild(row);
                });
            }
        }
    }

    renderTopProductsChart();
}

function renderTopProductsChart() {
    const canvas = document.getElementById("topProductsChart");
    if (!canvas) {
        console.warn("Reports chart canvas was not found.");
        return;
    }

    if (reportChartInstance) {
        reportChartInstance.destroy();
        reportChartInstance = null;
    }

    if (!window.Chart) {
        console.error("Chart.js is not loaded on the Reports page.");
        return;
    }

    const labels = reportTopProducts.map(
        item => item.subcategory || "Unspecified"
    );

    const values = reportTopProducts.map(
        item => Number(item.predicted_monthly_demand) || 0
    );

    reportChartInstance = new Chart(canvas, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Predicted monthly demand",
                data: values,
                backgroundColor: "#204e33",
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                title: {
                    display: true,
                    text: `Top 5 Predicted Demand — ${reportForecastMonth || "No forecast"}`
                },
                tooltip: {
                    callbacks: {
                        label: context =>
                            `Predicted demand: ${Number(context.raw).toLocaleString()} units`
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: "Predicted monthly units"
                    }
                },
                y: {
                    ticks: { autoSkip: false }
                }
            }
        }
    });
}


function renderInventoryTable() {
    const tables = document.querySelectorAll(".data-table");
    const stockTable = tables[1];

    if (!stockTable) return;

    const headers = stockTable.querySelectorAll("thead th");
    const headerLabels = [
        "PRODUCT",
        "CATEGORY",
        "CURRENT STOCK",
        "UNIT",
        "STATUS"
    ];

    headers.forEach((header, index) => {
        if (headerLabels[index]) {
            header.textContent = headerLabels[index];
        }
    });

    const tbody = stockTable.querySelector("tbody");
    if (!tbody) return;

    tbody.replaceChildren();

    if (!reportProducts.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-table-state">
                    No inventory records available.
                </td>
            </tr>
        `;
        return;
    }

    reportProducts.forEach(product => {
        const stock = Number(product.stock_quantity) || 0;
        const threshold = Number(product.low_stock_threshold) || 0;

        const status = stock <= 0
            ? "Out of Stock"
            : stock <= threshold
                ? "Low Stock"
                : "In Stock";

        const row = document.createElement("tr");

        [
            product.name || "Unnamed product",
            product.category || "Uncategorized",
            stock.toLocaleString(),
            product.unit || "—",
            status
        ].forEach(value => {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });

        tbody.appendChild(row);
    });
}

function showReportsError() {
    const footer = document.querySelector(".reports-page-footer");

    if (footer) {
        footer.textContent =
            "Unable to load report data. Please refresh the page or sign in again.";
    }
}

function setupReportExport() {
    const exportButton = document.querySelector(".export-btn");

    if (!exportButton || exportButton.dataset.exportReady === "true") {
        return;
    }

    exportButton.dataset.exportReady = "true";

    exportButton.addEventListener("click", async () => {
        const choice = await Swal.fire({
            title: "Export Report",
            text: "Choose your preferred file format.",
            icon: "question",
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonText: "CSV",
            denyButtonText: "PDF",
            cancelButtonText: "Cancel",
            confirmButtonColor: "#204e33",
            denyButtonColor: "#d97736"
        });

        if (choice.isDismissed) return;

        const format = choice.isConfirmed
            ? "csv"
            : choice.isDenied
                ? "pdf"
                : null;

        if (!format) return;

        const confirmation = await Swal.fire({
            title: "Proceed with Export?",
            text: `Export the inventory and Top 5 report as ${format.toUpperCase()}?`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Proceed",
            cancelButtonText: "Cancel",
            confirmButtonColor: "#204e33"
        });

        if (!confirmation.isConfirmed) return;

        if (format === "csv") {
            exportReportCSV();
        } else {
            exportReportPDF();
        }
    });
}

function getInventoryRows() {
    return reportProducts.map(product => {
        const stock = Number(product.stock_quantity) || 0;
        const threshold = Number(product.low_stock_threshold) || 0;

        return [
            product.name || "",
            product.category || "",
            stock,
            product.unit || "",
            threshold,
            stock <= 0
                ? "Out of Stock"
                : stock <= threshold
                    ? "Low Stock"
                    : "In Stock"
        ];
    });
}

function exportReportCSV() {
    const sections = [
        ["PAWFOOD INVENTORY REPORT"],
        ["Generated", new Date().toLocaleString()],
        [],
        ["INVENTORY", "Product", "Category", "Current Stock", "Unit", "Low Stock Threshold", "Status"],
        ...getInventoryRows().map(row => ["", ...row]),
        [],
        [`TOP 5 PREDICTED DEMAND — ${reportForecastMonth || "No forecast"}`],
        ["Subcategory", "Category", "Forecast Month", "Predicted Monthly Demand", "Rank"],
        ...reportTopProducts.map((item, index) => [
            item.subcategory || "",
            item.major_category || "",
            item.forecast_month || reportForecastMonth || "",
            Number(item.predicted_monthly_demand) || 0,
            index + 1
        ])
    ];

    const csvValue = value =>
        `"${String(value ?? "").replace(/"/g, '""')}"`;

    const csv = sections
        .map(row => row.map(csvValue).join(","))
        .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;"
    });

    downloadBlob(blob, "pawfood-report.csv");
}

function exportReportPDF() {
    if (!window.jspdf?.jsPDF) {
        Swal.fire({
            title: "PDF Export Unavailable",
            text: "The PDF library has not been loaded. You can export the report as CSV.",
            icon: "error",
            confirmButtonColor: "#204e33"
        });
        return;
    }

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();

    pdf.setFontSize(18);
    pdf.text("PawFood Report", 14, 18);

    pdf.setFontSize(10);
    pdf.text(`Generated: ${new Date().toLocaleString()}`, 14, 26);

    if (typeof pdf.autoTable !== "function") {
        Swal.fire({
            title: "PDF Export Unavailable",
            text: "The PDF table library has not been loaded.",
            icon: "error",
            confirmButtonColor: "#204e33"
        });
        return;
    }

    pdf.autoTable({
        startY: 34,
        head: [[
            "Product",
            "Category",
            "Current Stock",
            "Unit",
            "Low Stock Threshold",
            "Status"
        ]],
        body: getInventoryRows()
    });

    const nextY = pdf.lastAutoTable.finalY + 12;

    pdf.setFontSize(13);
    pdf.text(
        `Top 5 Predicted Demand — ${reportForecastMonth || "No forecast"}`,
        14,
        nextY
    );

    pdf.autoTable({
        startY: nextY + 4,
        head: [[
            "Rank",
            "Subcategory",
            "Category",
            "Forecast Month",
            "Predicted Monthly Demand"
        ]],
        body: reportTopProducts.map((item, index) => [
            index + 1,
            item.subcategory || "",
            item.major_category || "",
            item.forecast_month || reportForecastMonth || "",
            Number(item.predicted_monthly_demand || 0).toLocaleString()
        ])
    });

    pdf.save("pawfood-report.pdf");
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);

    Swal.fire({
        title: "Export Complete",
        text: "Your report has been generated.",
        icon: "success",
        confirmButtonColor: "#204e33"
    });
}
