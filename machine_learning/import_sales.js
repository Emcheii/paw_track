const XLSX = require("xlsx");
const path = require("path");
const pool = require("../src/config/database");

const FILE_PATH = path.join(
    __dirname,
    "data",
    "paw_track_sales_history.xlsx"
);

const SHEET_NAME = "Cleaned_Transactions";

const BATCH_SIZE = 500;

function normalizeCategory(category) {
    const value = String(category).trim().toUpperCase();

    if (
        value === "SHAMPOO" ||
        value === "ACCESSORIES" ||
        value === "ECTOPARASITE"
    ) {
        return "SMALL ITEMS";
    }

    if (value === "UNCATEGORIZED") {
        return "Uncategorized";
    }

    return value;
}

function normalizeDate(value) {
    if (value instanceof Date) {
        return value.toISOString().slice(0, 10);
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date.toISOString().slice(0, 10);
}

async function importSales() {
    try {
        console.log("Reading Excel file...");

        const workbook = XLSX.readFile(FILE_PATH);

        if (!workbook.SheetNames.includes(SHEET_NAME)) {
            throw new Error(
                `Sheet "${SHEET_NAME}" was not found in the workbook.`
            );
        }

        const worksheet = workbook.Sheets[SHEET_NAME];

        const rows = XLSX.utils.sheet_to_json(worksheet, {
            defval: null
        });

        console.log(`Excel rows found: ${rows.length}`);

        const [existingRows] = await pool.execute(
            "SELECT COUNT(*) AS total FROM sales_history"
        );

        const existingCount = Number(existingRows[0].total);

        if (existingCount > 0) {
            throw new Error(
                `sales_history already contains ${existingCount} records. Import stopped to prevent duplicate data.`
            );
        }

        const records = [];

        let skippedRows = 0;

        for (const row of rows) {
            const saleDate = normalizeDate(row.Date);
            const category = normalizeCategory(row.Major_Category);
            const quantity = Number(row.Quantity);

            if (!saleDate || !row.Major_Category || !Number.isFinite(quantity)) {
                skippedRows++;
                continue;
            }

            if (
                category === "SERVICE/FEE (NOT A PRODUCT)" ||
                category === "CONSUMABLES"
            ) {
                skippedRows++;
                continue;
            }

            if (!Number.isInteger(quantity) || quantity <= 0) {
                skippedRows++;
                continue;
            }

            records.push([
                saleDate,
                category,
                quantity
            ]);
        }

        console.log(`Valid records to import: ${records.length}`);
        console.log(`Skipped records: ${skippedRows}`);

        if (records.length === 0) {
            throw new Error("No valid sales records were found.");
        }

        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            for (let i = 0; i < records.length; i += BATCH_SIZE) {
                const batch = records.slice(i, i + BATCH_SIZE);

                const placeholders = batch
                    .map(() => "(?, ?, ?)")
                    .join(", ");

                const values = batch.flat();

                await connection.execute(
                    `
                    INSERT INTO sales_history
                        (sale_date, category, quantity_sold)
                    VALUES
                        ${placeholders}
                    `,
                    values
                );

                console.log(
                    `Imported ${Math.min(
                        i + BATCH_SIZE,
                        records.length
                    )} / ${records.length}`
                );
            }

            await connection.commit();

            console.log("");
            console.log("Sales history import completed successfully.");
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }

        const [summary] = await pool.execute(`
            SELECT
                category,
                COUNT(*) AS records,
                SUM(quantity_sold) AS total_units
            FROM sales_history
            GROUP BY category
            ORDER BY category
        `);

        console.log("");
        console.log("Imported category summary:");
        console.table(summary);

    } catch (error) {
        console.error("");
        console.error("Sales import failed:");
        console.error(error.message);

        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

importSales();