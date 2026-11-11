
const pool = require("../config/database");

async function getAllProducts() {
    const [rows] = await pool.execute(
        `SELECT * FROM products ORDER BY id ASC`
    );

    return rows;
}

async function getProductById(id) {
    const [rows] = await pool.execute(
        `SELECT * FROM products WHERE id = ? LIMIT 1`,
        [id]
    );

    return rows[0] || null;
}

async function createProduct({
    name,
    sku,
    category,
    subcategory,
    price,
    unit
}) {
    const [result] = await pool.execute(
        `INSERT INTO products (
            name,
            sku,
            category,
            subcategory,
            price,
            stock_quantity,
            unit
        )
        VALUES (?, ?, ?, ?, ?, 0, ?)`,
        [
            name,
            sku,
            category,
            subcategory || null,
            price,
            unit
        ]
    );

    return result.insertId;
}

async function addStock(id, quantity) {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [products] = await connection.execute(
            `SELECT stock_quantity
             FROM products
             WHERE id = ?
             FOR UPDATE`,
            [id]
        );

        if (products.length === 0) {
            throw new Error("Product not found.");
        }

        const stockBefore = Number(products[0].stock_quantity);
        const stockAfter = stockBefore + quantity;

        await connection.execute(
            `UPDATE products
             SET stock_quantity = ?
             WHERE id = ?`,
            [stockAfter, id]
        );

        await connection.execute(
            `INSERT INTO inventory_movements (
                product_id,
                movement_type,
                quantity,
                stock_before,
                stock_after
            )
            VALUES (?, 'stock_in', ?, ?, ?)`,
            [id, quantity, stockBefore, stockAfter]
        );

        await connection.commit();

        return {
            product_id: Number(id),
            quantity_added: quantity,
            stock_before: stockBefore,
            stock_after: stockAfter
        };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function deductStock(id, quantity) {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [products] = await connection.execute(
            `SELECT stock_quantity
             FROM products
             WHERE id = ?
             FOR UPDATE`,
            [id]
        );

        if (products.length === 0) {
            throw new Error("Product not found.");
        }

        const stockBefore = Number(products[0].stock_quantity);

        if (quantity > stockBefore) {
            throw new Error("Insufficient stock.");
        }

        const stockAfter = stockBefore - quantity;

        await connection.execute(
            `UPDATE products
             SET stock_quantity = ?
             WHERE id = ?`,
            [stockAfter, id]
        );

        await connection.execute(
            `INSERT INTO inventory_movements (
                product_id,
                movement_type,
                quantity,
                stock_before,
                stock_after
            )
            VALUES (?, 'manual_out', ?, ?, ?)`,
            [id, quantity, stockBefore, stockAfter]
        );

        await connection.commit();

        return {
            product_id: Number(id),
            quantity_deducted: quantity,
            stock_before: stockBefore,
            stock_after: stockAfter
        };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function getStockMovements(productId = null) {
    let query = `
        SELECT
            im.id,
            im.product_id,
            p.name AS product_name,
            p.sku,
            im.movement_type,
            im.quantity,
            im.stock_before,
            im.stock_after,
            im.created_at
        FROM inventory_movements im
        INNER JOIN products p
            ON p.id = im.product_id
    `;

    const params = [];

    if (productId !== null) {
        query += ` WHERE im.product_id = ?`;
        params.push(productId);
    }

    query += ` ORDER BY im.created_at DESC, im.id DESC`;

    const [rows] = await pool.execute(query, params);

    return rows;
}

async function getStockBySubcategory() {
    const [rows] = await pool.execute(`
        SELECT
            UPPER(TRIM(subcategory)) AS subcategory,
            SUM(stock_quantity) AS total_stock,
            COUNT(*) AS product_count
        FROM products
        WHERE subcategory IS NOT NULL
          AND TRIM(subcategory) <> ''
        GROUP BY UPPER(TRIM(subcategory))
        ORDER BY subcategory ASC
    `);

    return rows;
}

module.exports = {
    getAllProducts,
    getProductById,
    createProduct,
    addStock,
    deductStock,
    getStockMovements,
    getStockBySubcategory
};