const express = require("express");
const { getDashboardSummary, getLowStockProducts } = require("../controllers/dashboard.controller");
const { requireAuth } = require("../middleware/auth.middleware");


const router = express.Router();

router.get("/summary", requireAuth, getDashboardSummary);
router.get("/low-stock", requireAuth, getLowStockProducts);

module.exports = router;