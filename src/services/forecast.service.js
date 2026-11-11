
const salesModel = require("../models/sales.model");
const mlService = require("./ml.service");

const MIN_HISTORY_MONTHS = 12;

function monthKey(year, month) {
    return `${year}-${String(month).padStart(2, "0")}`;
}

function parseMonth(value) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value || "")) {
        throw new Error("Month must use YYYY-MM format, e.g. 2026-11.");
    }

    const [year, month] = value.split("-").map(Number);
    return { year, month };
}

function daysInMonth(year, month) {
    return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function dateToMonthKey(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        throw new Error(`Invalid sale date: ${value}`);
    }

    return monthKey(date.getUTCFullYear(), date.getUTCMonth() + 1);
}

function buildMonthlySeries(records) {
    const products = new Map();

    for (const row of records) {
        const sub = String(row.subcategory || "").trim().toUpperCase();
        if (!sub) continue;

        const key = dateToMonthKey(row.sale_date);

        if (!products.has(sub)) {
            products.set(sub, {
                sub,
                majorCategory: row.major_category,
                monthly: new Map()
            });
        }

        const item = products.get(sub);

        item.monthly.set(
            key,
            (item.monthly.get(key) || 0) + Number(row.quantity)
        );
    }

    if (products.size === 0) {
        throw new Error("No subcategory sales data is available.");
    }

    const allMonths = [
        ...new Set(records.map(row => dateToMonthKey(row.sale_date)))
    ].sort();

    const [startYear, startMonth] = allMonths[0].split("-").map(Number);
    const [endYear, endMonth] = allMonths.at(-1).split("-").map(Number);

    const monthKeys = [];
    let year = startYear;
    let month = startMonth;

    while (
        year < endYear ||
        (year === endYear && month <= endMonth)
    ) {
        monthKeys.push(monthKey(year, month));

        month++;
        if (month > 12) {
            month = 1;
            year++;
        }
    }

    for (const item of products.values()) {
        for (const key of monthKeys) {
            if (!item.monthly.has(key)) {
                item.monthly.set(key, 0);
            }
        }
    }

    return { products, monthKeys };
}

function calculateFeatures(item, monthKeys, targetYear, targetMonth) {
    const targetKey = monthKey(targetYear, targetMonth);
    const historyKeys = monthKeys.filter(key => key < targetKey);

    if (historyKeys.length < MIN_HISTORY_MONTHS) {
        throw new Error(
            `${item.sub} has fewer than ${MIN_HISTORY_MONTHS} historical months before ${targetKey}.`
        );
    }

    const dailyRates = historyKeys.map(key => {
        const [year, month] = key.split("-").map(Number);
        return (item.monthly.get(key) || 0) / daysInMonth(year, month);
    });

    const last = dailyRates.length;
    const average = count =>
        dailyRates.slice(-count).reduce((sum, value) => sum + value, 0) /
        count;

    return {
        lag1: dailyRates[last - 1],
        lag2: dailyRates[last - 2],
        lag3: dailyRates[last - 3],
        roll3: average(3),
        roll6: average(6),
        roll12: average(12),
        month_sin: Math.sin(2 * Math.PI * (targetMonth - 1) / 12),
        month_cos: Math.cos(2 * Math.PI * (targetMonth - 1) / 12),
        trend: historyKeys.length,
        sub: item.sub,
        historyKeys
    };
}

async function generateForecast(month) {
    const startedAt = Date.now();
    const { year, month: targetMonth } = parseMonth(month);

    const dbStartedAt = Date.now();
    const records = await salesModel.getAllDetailedSalesHistory();

    console.log(
        `[Forecast ${month}] Database query: ${Date.now() - dbStartedAt} ms`
    );

    if (records.length === 0) {
        throw new Error("No detailed sales history has been imported.");
    }

    const aggregationStartedAt = Date.now();
    const { products, monthKeys } = buildMonthlySeries(records);

    const items = [...products.values()];
    const prepared = items.map(item => ({
        item,
        features: calculateFeatures(
            item,
            monthKeys,
            year,
            targetMonth
        )
    }));

    console.log(
        `[Forecast ${month}] Aggregation and features: ${Date.now() - aggregationStartedAt} ms`
    );

    const predictionStartedAt = Date.now();

    // One Python process for the complete batch.
    const predictions = await mlService.predictDemands(
        prepared.map(entry => entry.features)
    );

    console.log(
        `[Forecast ${month}] Batch prediction: ${Date.now() - predictionStartedAt} ms`
    );

    const forecasts = prepared.map(({ item, features }, index) => {
        const prediction = predictions[index];

        if (!prediction || prediction.sub !== item.sub) {
            throw new Error(
                `Prediction mismatch for subcategory ${item.sub}.`
            );
        }

        const predictedDaily = Number(prediction.predicted_value);

        if (!Number.isFinite(predictedDaily)) {
            throw new Error(`Invalid model prediction for ${item.sub}.`);
        }

        const predictedMonthly = Math.max(
            0,
            Math.round(predictedDaily * daysInMonth(year, targetMonth))
        );

        const historical = features.historyKeys.map(key => ({
            month: key,
            quantity: item.monthly.get(key) || 0
        }));

        return {
            subcategory: item.sub,
            major_category: item.majorCategory,
            forecast_month: monthKey(year, targetMonth),
            predicted_daily_demand: Math.max(0, predictedDaily),
            predicted_monthly_demand: predictedMonthly,
            historical_monthly_demand: historical
        };
    });

    forecasts.sort(
        (a, b) => b.predicted_monthly_demand - a.predicted_monthly_demand
    );

    const result = {
        forecast_month: monthKey(year, targetMonth),
        total_predicted_demand: forecasts.reduce(
            (sum, item) => sum + item.predicted_monthly_demand,
            0
        ),
        forecasts
    };

    console.log(
        `[Forecast ${month}] Total service time: ${Date.now() - startedAt} ms`
    );

    return result;
}

module.exports = {
    generateForecast
};
