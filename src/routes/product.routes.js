
const express = require("express");

const {
    getProducts,
    getProductById,
    createProduct,
    addStock,
    deductStock,
    getStockMovements,
    getForecastStockComparison
} = require("../controllers/product.controller");

const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", requireAuth, getProducts);
router.post("/", requireAuth, createProduct);

router.get("/forecast-comparison", requireAuth, getForecastStockComparison);
router.get("/stock-movements", requireAuth, getStockMovements);

router.get("/:id", requireAuth, getProductById);

router.patch("/:id/stock/add", requireAuth, addStock);
router.patch("/:id/stock/deduct", requireAuth, deductStock);

module.exports = router;
