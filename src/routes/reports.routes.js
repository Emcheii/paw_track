const express = require("express");
const router = express.Router();

const {
    getHistoricalSalesReport
} = require("../controllers/reports.controller");

router.get("/historical-sales", getHistoricalSalesReport);

module.exports = router;