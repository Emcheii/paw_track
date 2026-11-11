
const path = require("path");
const XLSX = require("xlsx");
const pool = require("../src/config/database");

const EXCEL_PATH = path.join(
    __dirname,
    "..",
    "machine_learning",
    "data",
    "cleaned_transaction.xlsx"
);

function formatExcelDate(value) {
    if (value instanceof Date) {
        return value.toISOString().slice(0, 10);
    }

    if (typeof value === "number") {
        const parsed = XLSX.SSF.parse_date_code(value);

        if (!parsed) {
            throw new Error(`Invalid Excel date: ${value}`);
        }

        return [
            parsed.y,
            String(parsed.m).padStart(2, "0"),
            String(parsed.d).padStart(2, "0")
        ].join("-");
    }

    throw new Error(`Unsupported date value: ${value}`);
}

async function importSalesHistory() {
    const workbook = XLSX.readFile(EXCEL_PATH);
    const sheet = workbook.Sheets["Cleaned_Transactions"];

    if (!sheet) {
        throw new Error("Cleaned_Transactions sheet not found.");
    }

    const rows = XLSX.utils.sheet_to_json(sheet, {
        defval: null
    });

    if (rows.length === 0) {
        throw new Error("The Excel sheet contains no data.");
    }

    const connection = await pool.getConnection();

    try {
        const [countRows] = await connection.query(
            "SELECT COUNT(*) AS total FROM sales_history_detail"
        );

        if (Number(countRows[0].total) > 0) {
            throw new Error(
                "sales_history_detail is not empty. Import cancelled to prevent duplicates."
            );
        }

        const preparedRows = rows.map((row, index) => {
            const required = [
                "Date",
                "Year",
                "Month",
                "Product",
                "Quantity",
                "Major_Category",
                "Subcategory",
                "Date_Reliability"
            ];

            for (const column of required) {
                if (row[column] === null || row[column] === undefined ||
                    row[column] === "") {
                    throw new Error(
                        `Missing ${column} at Excel data row ${index + 2}`
                    );
                }
            }

            const quantity = Number(row.Quantity);
            const year = Number(row.Year);

            if (!Number.isFinite(quantity) || quantity < 0) {
                throw new Error(`Invalid Quantity at Excel row ${index + 2}`);
            }

            if (!Number.isInteger(year)) {
                throw new Error(`Invalid Year at Excel row ${index + 2}`);
            }

            return [
                formatExcelDate(row.Date),
                year,
                String(row.Month),
                row.Weekday ? String(row.Weekday) : null,
                String(row.Product).trim(),
                quantity,
                String(row.Major_Category),
                String(row.Subcategory),
                String(row.Date_Reliability)
            ];
        });

        await connection.beginTransaction();

        const columns = [
            "sale_date",
            "sale_year",
            "sale_month",
            "weekday",
            "product_name",
            "quantity",
            "major_category",
            "subcategory",
            "date_reliability"
        ];

        const batchSize = 500;

        for (let start = 0; start < preparedRows.length; start += batchSize) {
            const batch = preparedRows.slice(start, start + batchSize);
            const placeholders = batch
                .map(() => `(${columns.map(() => "?").join(",")})`)
                .join(",");

            const values = batch.flat();

            await connection.query(
                `INSERT INTO sales_history_detail
                (${columns.join(",")})
                VALUES ${placeholders}`,
                values
            );

            console.log(
                `Imported ${Math.min(start + batch.length, preparedRows.length)} / ${preparedRows.length}`
            );
        }

        await connection.commit();

        console.log("Import completed successfully.");
        console.log("Total imported:", preparedRows.length);
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

importSalesHistory()
    .catch(error => {
        console.error("Import failed:", error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await pool.end();
    });
