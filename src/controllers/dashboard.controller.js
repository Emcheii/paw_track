const pool = require("../config/database");

async function getDashboardSummary(req, res) {
    try {
        const [rows] = await pool.execute(`
            SELECT
                COUNT(*) AS total_products,
                COALESCE(SUM(stock_quantity), 0) AS current_stock,
                SUM(
                    CASE
                        WHEN stock_quantity > 0
                        AND stock_quantity <= low_stock_threshold
                        THEN 1
                        ELSE 0
                    END
                ) AS low_stock_count,
                SUM(
                    CASE
                        WHEN stock_quantity = 0
                        THEN 1
                        ELSE 0
                    END
                ) AS out_of_stock_count
            FROM products
        `);

        return res.status(200).json({
            totalProducts: Number(rows[0].total_products),
            currentStock: Number(rows[0].current_stock),
            lowStockCount: Number(rows[0].low_stock_count),
            outOfStockCount: Number(rows[0].out_of_stock_count)
        });

    } catch (error) {
        console.error("Dashboard summary error:", error);

        return res.status(500).json({
            detail: "Something went wrong while retrieving dashboard data."
        });
    }
}


async function getLowStockProducts(req, res) {
    try {
        const [rows] = await pool.execute(`
            SELECT
                id,
                name,
                sku,
                category,
                stock_quantity,
                unit,
                low_stock_threshold
            FROM products
            WHERE stock_quantity <= low_stock_threshold
            ORDER BY stock_quantity ASC, id ASC
        `);

        return res.status(200).json({
            products: rows
        });

    } catch (error) {
        console.error("Low stock products error:", error);

        return res.status(500).json({
            detail: "Something went wrong while retrieving low stock products."
        });
    }
}

module.exports = {
    getDashboardSummary,
    getLowStockProducts
};