
const productModel = require("../models/product.model");
const forecastService = require("../services/forecast.service");

async function getProducts(req, res) {
    try {
        const products = await productModel.getAllProducts();

        return res.status(200).json({ products });
    } catch (error) {
        console.error("Get products error:", error);

        return res.status(500).json({
            detail: "Something went wrong while retrieving products."
        });
    }
}

async function getProductById(req, res) {
    try {
        const { id } = req.params;
        const product = await productModel.getProductById(id);

        if (!product) {
            return res.status(404).json({
                detail: "Product not found."
            });
        }

        return res.status(200).json({ product });
    } catch (error) {
        console.error("Get product error:", error);

        return res.status(500).json({
            detail: "Something went wrong while retrieving the product."
        });
    }
}

async function createProduct(req, res) {
    try {
        const {
            name,
            sku,
            category,
            subcategory,
            price,
            unit
        } = req.body;

        if (
            !name?.trim() ||
            !sku?.trim() ||
            !category?.trim() ||
            price === undefined ||
            !unit?.trim()
        ) {
            return res.status(400).json({
                detail: "Name, SKU, category, price, and unit are required."
            });
        }

        const parsedPrice = Number(price);

        if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
            return res.status(400).json({
                detail: "Price must be a valid non-negative number."
            });
        }

        const productId = await productModel.createProduct({
            name: name.trim(),
            sku: sku.trim(),
            category: category.trim(),
            subcategory: subcategory?.trim() || null,
            price: parsedPrice,
            unit: unit.trim()
        });

        return res.status(201).json({
            message: "Product created successfully. Initial stock is zero.",
            productId
        });
    } catch (error) {
        console.error("Create product error:", error);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                detail: "SKU is already in use."
            });
        }

        return res.status(500).json({
            detail: "Something went wrong while creating the product."
        });
    }
}

async function addStock(req, res) {
    try {
        const { id } = req.params;
        const { quantity } = req.body;
        const parsedQuantity = Number(quantity);

        if (
            quantity === undefined ||
            !Number.isInteger(parsedQuantity) ||
            parsedQuantity <= 0
        ) {
            return res.status(400).json({
                detail: "Quantity must be a positive integer."
            });
        }

        const product = await productModel.getProductById(id);

        if (!product) {
            return res.status(404).json({
                detail: "Product not found."
            });
        }

        const result = await productModel.addStock(
            id,
            parsedQuantity
        );

        return res.status(200).json({
            message: "Stock added successfully.",
            movement: result
        });
    } catch (error) {
        console.error("Add stock error:", error);

        return res.status(500).json({
            detail: "Something went wrong while adding stock."
        });
    }
}

async function deductStock(req, res) {
    try {
        const { id } = req.params;
        const { quantity } = req.body;
        const parsedQuantity = Number(quantity);

        if (
            quantity === undefined ||
            !Number.isInteger(parsedQuantity) ||
            parsedQuantity <= 0
        ) {
            return res.status(400).json({
                detail: "Quantity must be a positive integer."
            });
        }

        const product = await productModel.getProductById(id);

        if (!product) {
            return res.status(404).json({
                detail: "Product not found."
            });
        }

        const result = await productModel.deductStock(
            id,
            parsedQuantity
        );

        return res.status(200).json({
            message: "Stock deducted successfully.",
            movement: result
        });
    } catch (error) {
        console.error("Deduct stock error:", error);

        if (error.message === "Insufficient stock.") {
            return res.status(400).json({
                detail: "Insufficient stock for this deduction."
            });
        }

        return res.status(500).json({
            detail: "Something went wrong while deducting stock."
        });
    }
}

async function getStockMovements(req, res) {
    try {
        const productId = req.query.product_id || null;

        if (productId !== null) {
            const product = await productModel.getProductById(productId);

            if (!product) {
                return res.status(404).json({
                    detail: "Product not found."
                });
            }
        }

        const movements = await productModel.getStockMovements(productId);

        return res.status(200).json({ movements });
    } catch (error) {
        console.error("Get stock movements error:", error);

        return res.status(500).json({
            detail: "Something went wrong while retrieving stock movements."
        });
    }
}

async function getForecastStockComparison(req, res) {
    try {
        const month = req.query.month;

        if (!month) {
            return res.status(400).json({
                detail: "Please provide a forecast month in YYYY-MM format."
            });
        }

        const [forecastResult, stockRows] = await Promise.all([
            forecastService.generateForecast(month),
            productModel.getStockBySubcategory()
        ]);

        const stockMap = new Map(
            stockRows.map(row => [
                String(row.subcategory).trim().toUpperCase(),
                {
                    total_stock: Number(row.total_stock),
                    product_count: Number(row.product_count)
                }
            ])
        );

        const comparisons = forecastResult.forecasts.map(forecast => {
            const key = String(forecast.subcategory)
                .trim()
                .toUpperCase();

            const inventory = stockMap.get(key) || {
                total_stock: 0,
                product_count: 0
            };

            const demand = Number(forecast.predicted_monthly_demand);
            const stock = inventory.total_stock;

            let status = "sufficient";

            if (stock <= 0) {
                status = "out_of_stock";
            } else if (stock < demand) {
                status = "low_stock";
            }

            return {
                subcategory: forecast.subcategory,
                major_category: forecast.major_category,
                forecast_month: forecast.forecast_month,
                predicted_daily_demand: forecast.predicted_daily_demand,
                predicted_monthly_demand: demand,
                total_stock: stock,
                product_count: inventory.product_count,
                shortage: Math.max(0, demand - stock),
                status
            };
        });

        return res.status(200).json({
            forecast_month: forecastResult.forecast_month,
            comparisons
        });
    } catch (error) {
        console.error("Forecast stock comparison error:", error);

        return res.status(500).json({
            detail: error.message ||
                "Unable to compare forecast and inventory stock."
        });
    }
}

module.exports = {
    getProducts,
    getProductById,
    createProduct,
    addStock,
    deductStock,
    getStockMovements,
    getForecastStockComparison
};