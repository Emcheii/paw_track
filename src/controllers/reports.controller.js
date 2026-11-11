
const productsModel = require("../models/product.model");
const salesModel = require("../models/sales.model");

async function getHistoricalSalesReport(req, res) {
    try {
        // Get current inventory from the existing Products model.
        const products = await productsModel.getAllProducts();

        const totalProducts = products.length;

        const lowStockProducts = products.filter(product =>
            Number(product.stock_quantity) > 0 &&
            Number(product.stock_quantity) <= Number(product.low_stock_threshold)
        ).length;

        const outOfStockProducts = products.filter(product =>
            Number(product.stock_quantity) <= 0
        ).length;

        // Reuse historical records from the existing Sales model.
        const salesHistory = await salesModel.getAllDetailedSalesHistory();

        // Combine historical quantities by product name.
        const productTotals = {};

        for (const sale of salesHistory) {
            const name = sale.product_name || "Unspecified Product";
            const quantity = Number(sale.quantity) || 0;

            productTotals[name] = (productTotals[name] || 0) + quantity;
        }

        // Get the five products with the highest historical quantities.
        const topFiveProducts = Object.entries(productTotals)
            .map(([product_name, total_quantity]) => ({
                product_name,
                total_quantity
            }))
            .sort((a, b) => b.total_quantity - a.total_quantity)
            .slice(0, 5);

        return res.status(200).json({
            summary: {
                total_products: totalProducts,
                low_stock_products: lowStockProducts,
                out_of_stock_products: outOfStockProducts
            },
            top_five_products: topFiveProducts
        });
    } catch (error) {
        console.error("Historical sales report error:", error);

        return res.status(500).json({
            detail: "Unable to load the reports."
        });
    }
}

module.exports = {
    getHistoricalSalesReport
};
