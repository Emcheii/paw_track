
const pool = require("../config/database");

async function getAllDetailedSalesHistory() {
    const [rows] = await pool.execute(`
        SELECT
            sale_date,
            product_name,
            quantity,
            major_category,
            subcategory,
            date_reliability
        FROM sales_history_detail
        ORDER BY sale_date ASC, id ASC
    `);

    return rows;
}

module.exports = {
    getAllDetailedSalesHistory
};
