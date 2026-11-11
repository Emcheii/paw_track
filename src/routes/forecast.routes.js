const express = require("express");
const { requireAuth } = require("../middleware/auth.middleware");
const { getDemandForecast } = require("../controllers/forecast.controller");

const router = express.Router();

router.get("/", requireAuth, getDemandForecast);

module.exports = router;