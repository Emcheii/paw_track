
const forecastService = require("../services/forecast.service");


async function getDemandForecast(req, res) {
    const startedAt = Date.now();

    try {
        const month = req.query.month;

        if (!month) {
            return res.status(400).json({
                detail: "Please provide a forecast month in YYYY-MM format."
            });
        }

        console.time(`[Forecast ${month}] Service`);

        const result = await forecastService.generateForecast(month);

        console.timeEnd(`[Forecast ${month}] Service`);

        console.log(
            `[Forecast ${month}] Total controller time: ${Date.now() - startedAt} ms`
        );

        return res.status(200).json(result);

    } catch (error) {
        console.error("Demand forecast error:", error);

        console.log(
            `[Forecast] Failed after ${Date.now() - startedAt} ms`
        );

        return res.status(400).json({
            detail: error.message
        });
    }
}

module.exports = {
    getDemandForecast
};
