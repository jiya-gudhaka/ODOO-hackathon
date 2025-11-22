import express from "express"
import cors from "cors"
import pg from "pg"
import dotenv from "dotenv"
import { createServer } from "http"
import { Server } from "socket.io"
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"

dotenv.config()

const app = express()
const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
})

// Middleware
app.use(cors())
app.use(express.json())

// Database connection
const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? true : { rejectUnauthorized: false },
})

// Test DB connection
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("❌ Database connection failed:", err.message)
  } else {
    console.log("✅ Database connected successfully at", res.rows[0].now)
  }
})

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]

  if (!token) return res.status(401).json({ error: "Access denied" })

  jwt.verify(token, process.env.JWT_SECRET || "your-secret-key", (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" })
    req.user = user
    next()
  })
}

io.on("connection", (socket) => {
  console.log(`[v0] Client connected: ${socket.id}`)

  // Join warehouse-specific rooms
  socket.on("join-warehouse", (warehouseId) => {
    socket.join(`warehouse:${warehouseId}`)
    console.log(`[v0] Socket ${socket.id} joined warehouse:${warehouseId}`)
  })

  socket.on("disconnect", () => {
    console.log(`[v0] Client disconnected: ${socket.id}`)
  })
})

const emitStockUpdate = (productId, warehouseId, newQty, oldQty) => {
  io.to(`warehouse:${warehouseId}`).emit("stockUpdated", {
    productId,
    warehouseId,
    newQty,
    oldQty,
    timestamp: new Date(),
  })
  io.emit("stockUpdated", { productId, warehouseId, newQty, oldQty, timestamp: new Date() })
}

const checkLowStock = async (productId, warehouseId) => {
  try {
    const result = await pool.query(
      `SELECT p.name, p.sku, p.min_quantity, s.quantity, w.name as warehouse_name, p.id as product_id, w.id as warehouse_id
       FROM products p
       JOIN stock s ON s.product_id = p.id
       JOIN warehouses w ON w.id = s.warehouse_id
       WHERE p.id = $1 AND s.warehouse_id = $2`,
      [productId, warehouseId],
    )

    if (result.rows.length > 0) {
      const row = result.rows[0]
      if (row.quantity < row.min_quantity) {
        // Insert notification
        await pool.query(
          `INSERT INTO notifications (type, title, message, product_id, warehouse_id)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            "low_stock",
            "Low Stock Alert",
            `${row.name} (${row.sku}) is below minimum quantity in ${row.warehouse_name}. Current: ${row.quantity}, Min: ${row.min_quantity}`,
            productId,
            warehouseId,
          ],
        )

        // Emit socket event
        io.emit("lowStock", {
          productId: row.product_id,
          warehouseId: row.warehouse_id,
          productName: row.name,
          sku: row.sku,
          quantity: row.quantity,
          minQuantity: row.min_quantity,
          warehouseName: row.warehouse_name,
        })
      }
    }
  } catch (err) {
    console.error("[v0] Error checking low stock:", err)
  }
}

// ==================== AUTH ROUTES ====================

app.post("/api/auth/signup", async (req, res) => {
  const { email, password, name } = req.body
  try {
    const hashedPassword = await bcrypt.hash(password, 10)
    const result = await pool.query(
      "INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name, role",
      [email, hashedPassword, name],
    )
    const user = result.rows[0]
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || "your-secret-key", {
      expiresIn: "7d",
    })
    res.json({ success: true, user, token })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body
  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email])
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" })
    }
    const user = result.rows[0]
    const validPassword = await bcrypt.compare(password, user.password)
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" })
    }
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || "your-secret-key", {
      expiresIn: "7d",
    })
    res.json({ success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role }, token })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.post("/api/auth/request-otp", async (req, res) => {
  const { email } = req.body
  try {
    const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [email])
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" })
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    await pool.query("INSERT INTO otps (email, otp, expires_at) VALUES ($1, $2, $3)", [email, otp, expiresAt])

    console.log(`[v0] OTP for ${email}: ${otp}`)
    res.json({ success: true, message: "OTP sent", otp: otp }) // In production, don't return OTP
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.post("/api/auth/verify-otp", async (req, res) => {
  const { email, otp, newPassword } = req.body
  try {
    const result = await pool.query(
      "SELECT * FROM otps WHERE email = $1 AND otp = $2 AND used = FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1",
      [email, otp],
    )

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Invalid or expired OTP" })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await pool.query("UPDATE users SET password = $1 WHERE email = $2", [hashedPassword, email])
    await pool.query("UPDATE otps SET used = TRUE WHERE id = $1", [result.rows[0].id])

    res.json({ success: true, message: "Password reset successfully" })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// ==================== PRODUCT ROUTES ====================

app.get("/api/products", async (req, res) => {
  const { q, sku, category, warehouse, lowStock, sortBy = "name", sortDir = "ASC", page = 1, limit = 50 } = req.query

  try {
    let query = `
      SELECT DISTINCT p.*, 
             c.name as category_name,
             COALESCE(SUM(s.quantity), 0) as total_stock
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN stock s ON s.product_id = p.id
      WHERE 1=1
    `
    const params = []
    let paramCount = 1

    if (q) {
      query += ` AND (p.name ILIKE $${paramCount} OR p.sku ILIKE $${paramCount})`
      params.push(`%${q}%`)
      paramCount++
    }

    if (sku) {
      query += ` AND p.sku ILIKE $${paramCount}`
      params.push(`%${sku}%`)
      paramCount++
    }

    if (category) {
      query += ` AND p.category_id = $${paramCount}`
      params.push(category)
      paramCount++
    }

    if (warehouse) {
      query += ` AND s.warehouse_id = $${paramCount}`
      params.push(warehouse)
      paramCount++
    }

    query += ` GROUP BY p.id, c.name`

    if (lowStock === "true") {
      query += ` HAVING COALESCE(SUM(s.quantity), 0) < p.min_quantity`
    }

    const validSortFields = ["name", "sku", "created_at", "total_stock"]
    const sortField = validSortFields.includes(sortBy) ? sortBy : "name"
    const direction = sortDir.toUpperCase() === "DESC" ? "DESC" : "ASC"

    query += ` ORDER BY ${sortField} ${direction}`

    const offset = (Number.parseInt(page) - 1) * Number.parseInt(limit)
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`
    params.push(Number.parseInt(limit), offset)

    const result = await pool.query(query, params)

    // Get stock details for each product
    for (const product of result.rows) {
      const stockResult = await pool.query(
        `SELECT s.*, w.name as warehouse_name 
         FROM stock s 
         JOIN warehouses w ON w.id = s.warehouse_id 
         WHERE s.product_id = $1`,
        [product.id],
      )
      product.stock_by_warehouse = stockResult.rows
    }

    res.json(result.rows)
  } catch (err) {
    console.error("[v0] Error fetching products:", err)
    res.status(400).json({ error: err.message })
  }
})

app.get("/api/products/autocomplete", async (req, res) => {
  const { q } = req.query
  try {
    const result = await pool.query("SELECT id, name, sku FROM products WHERE sku ILIKE $1 OR name ILIKE $1 LIMIT 10", [
      `%${q}%`,
    ])
    res.json(result.rows)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.get("/api/products/:id", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM products WHERE id = $1", [req.params.id])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" })
    }
    res.json(result.rows[0])
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.post("/api/products", authenticateToken, async (req, res) => {
  const { name, sku, category_id, uom, min_quantity, initial_stock, warehouse_id } = req.body

  try {
    await pool.query("BEGIN")

    const result = await pool.query(
      "INSERT INTO products (name, sku, category_id, uom, min_quantity) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [name, sku, category_id, uom, min_quantity || 10],
    )
    const product = result.rows[0]

    // If initial stock provided, add to stock table
    if (initial_stock && initial_stock > 0 && warehouse_id) {
      await pool.query("INSERT INTO stock (product_id, warehouse_id, quantity) VALUES ($1, $2, $3)", [
        product.id,
        warehouse_id,
        initial_stock,
      ])

      // Log in move history
      await pool.query(
        "INSERT INTO move_history (product_id, to_warehouse_id, change_qty, type, reason, user_id) VALUES ($1, $2, $3, $4, $5, $6)",
        [product.id, warehouse_id, initial_stock, "initial_stock", "Initial stock added", req.user.id],
      )

      // Emit event
      io.emit("stockUpdated", {
        productId: product.id,
        warehouseId: warehouse_id,
        newQty: initial_stock,
        oldQty: 0,
      })
    }

    await pool.query("COMMIT")
    res.json(product)
  } catch (err) {
    await pool.query("ROLLBACK")
    res.status(400).json({ error: err.message })
  }
})

app.put("/api/products/:id", authenticateToken, async (req, res) => {
  const { name, sku, category_id, uom, min_quantity } = req.body
  try {
    const result = await pool.query(
      "UPDATE products SET name = $1, sku = $2, category_id = $3, uom = $4, min_quantity = $5, updated_at = NOW() WHERE id = $6 RETURNING *",
      [name, sku, category_id, uom, min_quantity, req.params.id],
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" })
    }
    res.json(result.rows[0])
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// ==================== CATEGORY ROUTES ====================

app.get("/api/categories", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM categories ORDER BY name")
    res.json(result.rows)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.post("/api/categories", authenticateToken, async (req, res) => {
  const { name, description } = req.body
  try {
    const result = await pool.query("INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING *", [
      name,
      description,
    ])
    res.json(result.rows[0])
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// ==================== WAREHOUSE ROUTES ====================

app.get("/api/warehouses", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM warehouses ORDER BY name")
    res.json(result.rows)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.post("/api/warehouses", authenticateToken, async (req, res) => {
  const { name, code, address } = req.body
  try {
    const result = await pool.query("INSERT INTO warehouses (name, code, address) VALUES ($1, $2, $3) RETURNING *", [
      name,
      code,
      address,
    ])
    res.json(result.rows[0])
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// ==================== STOCK ROUTES ====================

app.get("/api/stocks", async (req, res) => {
  const { warehouse, product, low } = req.query

  try {
    let query = `
      SELECT s.*, p.name as product_name, p.sku, p.min_quantity,
             w.name as warehouse_name
      FROM stock s
      JOIN products p ON p.id = s.product_id
      JOIN warehouses w ON w.id = s.warehouse_id
      WHERE 1=1
    `
    const params = []
    let paramCount = 1

    if (warehouse) {
      query += ` AND s.warehouse_id = $${paramCount++}`
      params.push(warehouse)
    }

    if (product) {
      query += ` AND s.product_id = $${paramCount++}`
      params.push(product)
    }

    if (low === "true") {
      query += ` AND s.quantity < p.min_quantity`
    }

    query += ` ORDER BY p.name`

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.get("/api/low-stock", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.id, p.name, p.sku, p.min_quantity, s.quantity, s.warehouse_id, w.name as warehouse_name
      FROM products p
      JOIN stock s ON s.product_id = p.id
      JOIN warehouses w ON w.id = s.warehouse_id
      WHERE s.quantity < p.min_quantity
      ORDER BY (p.min_quantity - s.quantity) DESC
    `)
    res.json(result.rows)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.post("/api/stocks/adjust", authenticateToken, async (req, res) => {
  const { product_id, warehouse_id, actual_count, reason } = req.body

  try {
    await pool.query("BEGIN")

    // Get current stock
    const currentStock = await pool.query("SELECT quantity FROM stock WHERE product_id = $1 AND warehouse_id = $2", [
      product_id,
      warehouse_id,
    ])

    let oldQty = 0
    if (currentStock.rows.length > 0) {
      oldQty = currentStock.rows[0].quantity
    } else {
      // Create stock entry if doesn't exist
      await pool.query("INSERT INTO stock (product_id, warehouse_id, quantity) VALUES ($1, $2, $3)", [
        product_id,
        warehouse_id,
        0,
      ])
    }

    const difference = actual_count - oldQty

    // Generate reference
    const countResult = await pool.query("SELECT COUNT(*) FROM adjustments")
    const count = Number.parseInt(countResult.rows[0].count) + 1
    const ref_no = `ADJ/${String(count).padStart(4, "0")}`

    // Create adjustment record
    await pool.query(
      "INSERT INTO adjustments (ref_no, product_id, warehouse_id, actual_count, difference, reason, status, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
      [ref_no, product_id, warehouse_id, actual_count, difference, reason, "Done", req.user.id],
    )

    // Update stock
    await pool.query("UPDATE stock SET quantity = $1, updated_at = NOW() WHERE product_id = $2 AND warehouse_id = $3", [
      actual_count,
      product_id,
      warehouse_id,
    ])

    // Insert move history
    await pool.query(
      "INSERT INTO move_history (product_id, to_warehouse_id, change_qty, type, ref_no, reason, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [product_id, warehouse_id, difference, "adjustment", ref_no, reason, req.user.id],
    )

    await pool.query("COMMIT")

    // Emit events
    emitStockUpdate(product_id, warehouse_id, actual_count, oldQty)
    io.emit("adjustmentCreated", { product_id, warehouse_id, difference, ref_no })
    await checkLowStock(product_id, warehouse_id)

    res.json({ success: true, difference, ref_no })
  } catch (err) {
    await pool.query("ROLLBACK")
    res.status(400).json({ error: err.message })
  }
})

app.post("/api/stocks/transfer", authenticateToken, async (req, res) => {
  const { from_warehouse_id, to_warehouse_id, lines } = req.body

  if (from_warehouse_id === to_warehouse_id) {
    return res.status(400).json({ error: "Source and destination warehouses must be different" })
  }

  try {
    await pool.query("BEGIN")

    // Generate reference
    const countResult = await pool.query("SELECT COUNT(*) FROM transfers")
    const count = Number.parseInt(countResult.rows[0].count) + 1
    const ref_no = `TRF/${String(count).padStart(4, "0")}`

    // Create transfer
    const transferResult = await pool.query(
      "INSERT INTO transfers (ref_no, from_warehouse_id, to_warehouse_id, created_by, status) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [ref_no, from_warehouse_id, to_warehouse_id, req.user.id, "Done"],
    )
    const transfer = transferResult.rows[0]

    // Process each line
    for (const line of lines) {
      const { product_id, qty } = line

      // Check availability in source warehouse
      const sourceStock = await pool.query("SELECT quantity FROM stock WHERE product_id = $1 AND warehouse_id = $2", [
        product_id,
        from_warehouse_id,
      ])

      if (sourceStock.rows.length === 0 || sourceStock.rows[0].quantity < qty) {
        await pool.query("ROLLBACK")
        return res.status(400).json({ error: "Insufficient stock in source warehouse", product_id })
      }

      const oldSourceQty = sourceStock.rows[0].quantity

      // Decrease from source
      await pool.query(
        "UPDATE stock SET quantity = quantity - $1, updated_at = NOW() WHERE product_id = $2 AND warehouse_id = $3",
        [qty, product_id, from_warehouse_id],
      )

      // Increase in destination (create if not exists)
      const destStock = await pool.query("SELECT quantity FROM stock WHERE product_id = $1 AND warehouse_id = $2", [
        product_id,
        to_warehouse_id,
      ])

      let oldDestQty = 0
      if (destStock.rows.length === 0) {
        await pool.query("INSERT INTO stock (product_id, warehouse_id, quantity) VALUES ($1, $2, $3)", [
          product_id,
          to_warehouse_id,
          qty,
        ])
      } else {
        oldDestQty = destStock.rows[0].quantity
        await pool.query(
          "UPDATE stock SET quantity = quantity + $1, updated_at = NOW() WHERE product_id = $2 AND warehouse_id = $3",
          [qty, product_id, to_warehouse_id],
        )
      }

      // Insert transfer line
      await pool.query("INSERT INTO transfer_lines (transfer_id, product_id, qty) VALUES ($1, $2, $3)", [
        transfer.id,
        product_id,
        qty,
      ])

      // Insert move history
      await pool.query(
        "INSERT INTO move_history (product_id, from_warehouse_id, to_warehouse_id, change_qty, type, ref_no, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [product_id, from_warehouse_id, to_warehouse_id, qty, "transfer", ref_no, req.user.id],
      )

      // Emit events
      emitStockUpdate(product_id, from_warehouse_id, oldSourceQty - qty, oldSourceQty)
      emitStockUpdate(product_id, to_warehouse_id, oldDestQty + qty, oldDestQty)
      await checkLowStock(product_id, from_warehouse_id)
    }

    await pool.query("COMMIT")

    io.emit("transferCreated", { transfer, ref_no })
    res.json({ success: true, transfer })
  } catch (err) {
    await pool.query("ROLLBACK")
    console.error("[v0] Transfer error:", err)
    res.status(400).json({ error: err.message })
  }
})

// ==================== BARCODE SCAN ROUTE ====================

app.post("/api/scan", authenticateToken, async (req, res) => {
  const { barcode, mode, warehouse_id, qty = 1 } = req.body

  try {
    await pool.query("BEGIN")

    // Find product by SKU
    const productResult = await pool.query("SELECT * FROM products WHERE sku = $1", [barcode])
    if (productResult.rows.length === 0) {
      await pool.query("ROLLBACK")
      return res.status(404).json({ error: "Product not found" })
    }

    const product = productResult.rows[0]

    // Get or create stock entry
    const stockResult = await pool.query("SELECT quantity FROM stock WHERE product_id = $1 AND warehouse_id = $2", [
      product.id,
      warehouse_id,
    ])

    let oldQty = 0
    if (stockResult.rows.length === 0) {
      await pool.query("INSERT INTO stock (product_id, warehouse_id, quantity) VALUES ($1, $2, $3)", [
        product.id,
        warehouse_id,
        0,
      ])
    } else {
      oldQty = stockResult.rows[0].quantity
    }

    let newQty
    let changeQty
    if (mode === "ADD") {
      newQty = oldQty + qty
      changeQty = qty
    } else if (mode === "REMOVE") {
      if (oldQty < qty) {
        await pool.query("ROLLBACK")
        return res.status(400).json({ error: "Insufficient stock", available: oldQty })
      }
      newQty = oldQty - qty
      changeQty = -qty
    } else {
      await pool.query("ROLLBACK")
      return res.status(400).json({ error: "Invalid mode. Use ADD or REMOVE" })
    }

    // Update stock
    await pool.query("UPDATE stock SET quantity = $1, updated_at = NOW() WHERE product_id = $2 AND warehouse_id = $3", [
      newQty,
      product.id,
      warehouse_id,
    ])

    // Insert move history
    await pool.query(
      "INSERT INTO move_history (product_id, to_warehouse_id, change_qty, type, reason, user_id) VALUES ($1, $2, $3, $4, $5, $6)",
      [product.id, warehouse_id, changeQty, mode === "ADD" ? "scan_add" : "scan_remove", "Barcode scan", req.user.id],
    )

    await pool.query("COMMIT")

    // Emit socket events
    emitStockUpdate(product.id, warehouse_id, newQty, oldQty)
    await checkLowStock(product.id, warehouse_id)

    res.json({
      success: true,
      message: `${mode === "ADD" ? "Added" : "Removed"} ${qty} × ${product.sku}`,
      product,
      oldQty,
      newQty,
    })
  } catch (err) {
    await pool.query("ROLLBACK")
    console.error("[v0] Scan error:", err)
    res.status(400).json({ error: err.message })
  }
})

// ==================== RECEIPT ROUTES ====================

app.get("/api/receipts", async (req, res) => {
  const { status, warehouse, type } = req.query

  try {
    let query = `
      SELECT r.*, w.name as warehouse_name,
             COUNT(rl.id) as line_count
      FROM receipts r
      LEFT JOIN warehouses w ON w.id = r.warehouse_id
      LEFT JOIN receipt_lines rl ON rl.receipt_id = r.id
      WHERE 1=1
    `
    const params = []
    let paramCount = 1

    if (status) {
      query += ` AND r.status = $${paramCount++}`
      params.push(status)
    }

    if (warehouse) {
      query += ` AND r.warehouse_id = $${paramCount++}`
      params.push(warehouse)
    }

    query += ` GROUP BY r.id, w.name ORDER BY r.created_at DESC`

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.get("/api/receipts/generate-reference", async (req, res) => {
  try {
    const result = await pool.query("SELECT COUNT(*) FROM receipts")
    const count = Number.parseInt(result.rows[0].count) + 1
    const reference = `WH/IN/${String(count).padStart(4, "0")}`
    res.json({ reference })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.get("/api/receipts/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT r.*, w.name as warehouse_name FROM receipts r LEFT JOIN warehouses w ON w.id = r.warehouse_id WHERE r.id = $1",
      [req.params.id],
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Receipt not found" })
    }

    // Get receipt lines
    const linesResult = await pool.query(
      `SELECT rl.*, p.name as product_name, p.sku 
       FROM receipt_lines rl 
       JOIN products p ON rl.product_id = p.id 
       WHERE rl.receipt_id = $1`,
      [req.params.id],
    )

    const receipt = result.rows[0]
    receipt.lines = linesResult.rows
    res.json(receipt)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.post("/api/receipts", authenticateToken, async (req, res) => {
  const { ref_no, warehouse_id, contact, status, lines } = req.body

  try {
    await pool.query("BEGIN")

    const result = await pool.query(
      "INSERT INTO receipts (ref_no, warehouse_id, contact, status, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [ref_no, warehouse_id, contact, status || "Draft", req.user.id],
    )
    const receipt = result.rows[0]

    // Insert lines
    if (lines && lines.length > 0) {
      for (const line of lines) {
        await pool.query("INSERT INTO receipt_lines (receipt_id, product_id, qty_expected) VALUES ($1, $2, $3)", [
          receipt.id,
          line.product_id,
          line.qty,
        ])
      }
    }

    await pool.query("COMMIT")
    io.emit("receiptCreated", receipt)
    res.json(receipt)
  } catch (err) {
    await pool.query("ROLLBACK")
    res.status(400).json({ error: err.message })
  }
})

app.put("/api/receipts/:id/validate", authenticateToken, async (req, res) => {
  const { id } = req.params

  try {
    await pool.query("BEGIN")

    // Get receipt and lines
    const receiptResult = await pool.query("SELECT * FROM receipts WHERE id = $1", [id])
    if (receiptResult.rows.length === 0) {
      await pool.query("ROLLBACK")
      return res.status(404).json({ error: "Receipt not found" })
    }
    const receipt = receiptResult.rows[0]

    const linesResult = await pool.query("SELECT * FROM receipt_lines WHERE receipt_id = $1", [id])

    // Update stock for each line
    for (const line of linesResult.rows) {
      const qty = line.qty_expected

      // Get current stock or create
      const stockResult = await pool.query("SELECT quantity FROM stock WHERE product_id = $1 AND warehouse_id = $2", [
        line.product_id,
        receipt.warehouse_id,
      ])

      let oldQty = 0
      if (stockResult.rows.length === 0) {
        await pool.query("INSERT INTO stock (product_id, warehouse_id, quantity) VALUES ($1, $2, $3)", [
          line.product_id,
          receipt.warehouse_id,
          qty,
        ])
      } else {
        oldQty = stockResult.rows[0].quantity
        await pool.query(
          "UPDATE stock SET quantity = quantity + $1, updated_at = NOW() WHERE product_id = $2 AND warehouse_id = $3",
          [qty, line.product_id, receipt.warehouse_id],
        )
      }

      // Insert move history
      await pool.query(
        "INSERT INTO move_history (product_id, to_warehouse_id, change_qty, type, ref_no, user_id) VALUES ($1, $2, $3, $4, $5, $6)",
        [line.product_id, receipt.warehouse_id, qty, "receipt", receipt.ref_no, req.user.id],
      )

      // Update line
      await pool.query("UPDATE receipt_lines SET qty_received = $1 WHERE id = $2", [qty, line.id])

      // Emit events
      emitStockUpdate(line.product_id, receipt.warehouse_id, oldQty + qty, oldQty)
    }

    // Update receipt status
    await pool.query(
      "UPDATE receipts SET status = $1, validated_by = $2, validated_at = NOW(), updated_at = NOW() WHERE id = $3",
      ["Done", req.user.id, id],
    )

    await pool.query("COMMIT")
    io.emit("receiptValidated", { id, ref_no: receipt.ref_no })
    res.json({ success: true, message: "Receipt validated successfully" })
  } catch (err) {
    await pool.query("ROLLBACK")
    console.error("[v0] Receipt validation error:", err)
    res.status(400).json({ error: err.message })
  }
})

// ==================== DELIVERY ROUTES ====================

app.get("/api/deliveries", async (req, res) => {
  const { status, warehouse } = req.query

  try {
    let query = `
      SELECT d.*, w.name as warehouse_name,
             COUNT(dl.id) as line_count
      FROM deliveries d
      LEFT JOIN warehouses w ON w.id = d.warehouse_id
      LEFT JOIN delivery_lines dl ON dl.delivery_id = d.id
      WHERE 1=1
    `
    const params = []
    let paramCount = 1

    if (status) {
      query += ` AND d.status = $${paramCount++}`
      params.push(status)
    }
    if (warehouse) {
      query += ` AND d.warehouse_id = $${paramCount++}`
      params.push(warehouse)
    }

    query += ` GROUP BY d.id, w.name ORDER BY d.created_at DESC`

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.get("/api/deliveries/generate-reference", async (req, res) => {
  try {
    const result = await pool.query("SELECT COUNT(*) FROM deliveries")
    const count = Number.parseInt(result.rows[0].count) + 1
    const reference = `WH/OUT/${String(count).padStart(4, "0")}`
    res.json({ reference })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.get("/api/deliveries/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT d.*, w.name as warehouse_name FROM deliveries d LEFT JOIN warehouses w ON w.id = d.warehouse_id WHERE d.id = $1",
      [req.params.id],
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Delivery not found" })
    }

    // Get delivery lines
    const linesResult = await pool.query(
      `SELECT dl.*, p.name as product_name, p.sku 
       FROM delivery_lines dl 
       JOIN products p ON dl.product_id = p.id 
       WHERE dl.delivery_id = $1`,
      [req.params.id],
    )

    const delivery = result.rows[0]
    delivery.lines = linesResult.rows
    res.json(delivery)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.post("/api/deliveries", authenticateToken, async (req, res) => {
  const { ref_no, warehouse_id, contact, status, lines } = req.body

  try {
    await pool.query("BEGIN")

    const result = await pool.query(
      "INSERT INTO deliveries (ref_no, warehouse_id, contact, status, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [ref_no, warehouse_id, contact, status || "Draft", req.user.id],
    )
    const delivery = result.rows[0]

    // Insert lines
    if (lines && lines.length > 0) {
      for (const line of lines) {
        await pool.query("INSERT INTO delivery_lines (delivery_id, product_id, qty_expected) VALUES ($1, $2, $3)", [
          delivery.id,
          line.product_id,
          line.qty,
        ])
      }
    }

    await pool.query("COMMIT")
    io.emit("deliveryCreated", delivery)
    res.json(delivery)
  } catch (err) {
    await pool.query("ROLLBACK")
    res.status(400).json({ error: err.message })
  }
})

app.put("/api/deliveries/:id/validate", authenticateToken, async (req, res) => {
  const { id } = req.params

  try {
    await pool.query("BEGIN")

    // Get delivery and lines
    const deliveryResult = await pool.query("SELECT * FROM deliveries WHERE id = $1", [id])
    if (deliveryResult.rows.length === 0) {
      await pool.query("ROLLBACK")
      return res.status(404).json({ error: "Delivery not found" })
    }
    const delivery = deliveryResult.rows[0]

    const linesResult = await pool.query("SELECT * FROM delivery_lines WHERE delivery_id = $1", [id])

    // Update stock for each line
    for (const line of linesResult.rows) {
      const qty = line.qty_expected

      // Check stock availability
      const stockResult = await pool.query("SELECT quantity FROM stock WHERE product_id = $1 AND warehouse_id = $2", [
        line.product_id,
        delivery.warehouse_id,
      ])

      if (stockResult.rows.length === 0 || stockResult.rows[0].quantity < qty) {
        await pool.query("ROLLBACK")
        return res.status(400).json({ error: "Insufficient stock", product_id: line.product_id })
      }

      const oldQty = stockResult.rows[0].quantity

      // Decrease stock
      await pool.query(
        "UPDATE stock SET quantity = quantity - $1, updated_at = NOW() WHERE product_id = $2 AND warehouse_id = $3",
        [qty, line.product_id, delivery.warehouse_id],
      )

      // Insert move history
      await pool.query(
        "INSERT INTO move_history (product_id, from_warehouse_id, change_qty, type, ref_no, user_id) VALUES ($1, $2, $3, $4, $5, $6)",
        [line.product_id, delivery.warehouse_id, -qty, "delivery", delivery.ref_no, req.user.id],
      )

      // Update line
      await pool.query("UPDATE delivery_lines SET qty_delivered = $1, line_status = $2 WHERE id = $3", [
        qty,
        "Done",
        line.id,
      ])

      // Emit events
      emitStockUpdate(line.product_id, delivery.warehouse_id, oldQty - qty, oldQty)
      await checkLowStock(line.product_id, delivery.warehouse_id)
    }

    // Update delivery status
    await pool.query(
      "UPDATE deliveries SET status = $1, validated_by = $2, validated_at = NOW(), updated_at = NOW() WHERE id = $3",
      ["Done", req.user.id, id],
    )

    await pool.query("COMMIT")
    io.emit("deliveryValidated", { id, ref_no: delivery.ref_no })
    res.json({ success: true, message: "Delivery validated successfully" })
  } catch (err) {
    await pool.query("ROLLBACK")
    console.error("[v0] Delivery validation error:", err)
    res.status(400).json({ error: err.message })
  }
})

app.put("/api/deliveries/:deliveryId/lines/:lineId/status", authenticateToken, async (req, res) => {
  const { deliveryId, lineId } = req.params
  const { line_status } = req.body

  const validStatuses = ["Pending", "Picked", "Packed", "Done"]
  if (!validStatuses.includes(line_status)) {
    return res.status(400).json({ error: "Invalid line status" })
  }

  try {
    await pool.query("UPDATE delivery_lines SET line_status = $1 WHERE id = $2 AND delivery_id = $3", [
      line_status,
      lineId,
      deliveryId,
    ])

    io.emit("deliveryLineUpdated", { deliveryId, lineId, line_status })
    res.json({ success: true, message: "Line status updated" })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// ==================== TRANSFER ROUTES ====================

app.get("/api/transfers", async (req, res) => {
  const { status } = req.query

  try {
    let query = `
      SELECT t.*, 
             wf.name as from_warehouse_name,
             wt.name as to_warehouse_name,
             COUNT(tl.id) as line_count
      FROM transfers t
      LEFT JOIN warehouses wf ON wf.id = t.from_warehouse_id
      LEFT JOIN warehouses wt ON wt.id = t.to_warehouse_id
      LEFT JOIN transfer_lines tl ON tl.transfer_id = t.id
      WHERE 1=1
    `
    const params = []

    if (status) {
      query += ` AND t.status = $1`
      params.push(status)
    }

    query += ` GROUP BY t.id, wf.name, wt.name ORDER BY t.created_at DESC`

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.get("/api/transfers/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, 
              wf.name as from_warehouse_name,
              wt.name as to_warehouse_name
       FROM transfers t
       LEFT JOIN warehouses wf ON wf.id = t.from_warehouse_id
       LEFT JOIN warehouses wt ON wt.id = t.to_warehouse_id
       WHERE t.id = $1`,
      [req.params.id],
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Transfer not found" })
    }

    // Get transfer lines
    const linesResult = await pool.query(
      `SELECT tl.*, p.name as product_name, p.sku 
       FROM transfer_lines tl 
       JOIN products p ON tl.product_id = p.id 
       WHERE tl.transfer_id = $1`,
      [req.params.id],
    )

    const transfer = result.rows[0]
    transfer.lines = linesResult.rows
    res.json(transfer)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// ==================== MOVE HISTORY ROUTES ====================

app.get("/api/move-history", async (req, res) => {
  const { product_id, warehouse_id, type, from, to, page = 1, limit = 100 } = req.query

  let query = `
    SELECT mh.*, 
           p.name as product_name, p.sku,
           wf.name as from_warehouse_name, 
           wt.name as to_warehouse_name,
           u.name as user_name
    FROM move_history mh
    LEFT JOIN products p ON p.id = mh.product_id
    LEFT JOIN warehouses wf ON wf.id = mh.from_warehouse_id
    LEFT JOIN warehouses wt ON wt.id = mh.to_warehouse_id
    LEFT JOIN users u ON u.id = mh.user_id
    WHERE 1=1
  `
  const params = []
  let paramCount = 1

  if (product_id) {
    query += ` AND mh.product_id = $${paramCount++}`
    params.push(product_id)
  }

  if (warehouse_id) {
    query += ` AND (mh.from_warehouse_id = $${paramCount} OR mh.to_warehouse_id = $${paramCount})`
    params.push(warehouse_id)
    paramCount++
  }

  if (type) {
    query += ` AND mh.type = $${paramCount++}`
    params.push(type)
  }

  if (from) {
    query += ` AND mh.created_at >= $${paramCount++}`
    params.push(from)
  }

  if (to) {
    query += ` AND mh.created_at <= $${paramCount++}`
    params.push(to)
  }

  query += ` ORDER BY mh.created_at DESC`

  const offset = (Number.parseInt(page) - 1) * Number.parseInt(limit)
  query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`
  params.push(Number.parseInt(limit), offset)

  try {
    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (err) {
    console.error("[v0] Move history error:", err)
    res.status(400).json({ error: err.message })
  }
})

// ==================== NOTIFICATIONS ROUTES ====================

app.get("/api/notifications", async (req, res) => {
  const { is_read, limit = 50 } = req.query

  try {
    let query = "SELECT * FROM notifications WHERE 1=1"
    const params = []

    if (is_read !== undefined) {
      query += " AND is_read = $1"
      params.push(is_read === "true")
    }

    query += " ORDER BY created_at DESC LIMIT $" + (params.length + 1)
    params.push(Number.parseInt(limit))

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.put("/api/notifications/:id/read", async (req, res) => {
  try {
    await pool.query("UPDATE notifications SET is_read = TRUE WHERE id = $1", [req.params.id])
    res.json({ success: true })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.put("/api/notifications/mark-all-read", async (req, res) => {
  try {
    await pool.query("UPDATE notifications SET is_read = TRUE WHERE is_read = FALSE")
    res.json({ success: true })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// ==================== OPERATIONS FILTER ENDPOINT ====================

app.get("/api/operations", async (req, res) => {
  const { type, status, warehouse, category, sku } = req.query

  try {
    const results = {
      receipts: [],
      deliveries: [],
      transfers: [],
      adjustments: [],
    }

    if (!type || type === "receipt") {
      let query = `
        SELECT r.*, w.name as warehouse_name, 'receipt' as operation_type
        FROM receipts r
        LEFT JOIN warehouses w ON w.id = r.warehouse_id
        WHERE 1=1
      `
      const params = []
      let paramCount = 1

      if (status) {
        query += ` AND r.status = $${paramCount++}`
        params.push(status)
      }
      if (warehouse) {
        query += ` AND r.warehouse_id = $${paramCount++}`
        params.push(warehouse)
      }

      query += ` ORDER BY r.created_at DESC`
      const result = await pool.query(query, params)
      results.receipts = result.rows
    }

    if (!type || type === "delivery") {
      let query = `
        SELECT d.*, w.name as warehouse_name, 'delivery' as operation_type
        FROM deliveries d
        LEFT JOIN warehouses w ON w.id = d.warehouse_id
        WHERE 1=1
      `
      const params = []
      let paramCount = 1

      if (status) {
        query += ` AND d.status = $${paramCount++}`
        params.push(status)
      }
      if (warehouse) {
        query += ` AND d.warehouse_id = $${paramCount++}`
        params.push(warehouse)
      }

      query += ` ORDER BY d.created_at DESC`
      const result = await pool.query(query, params)
      results.deliveries = result.rows
    }

    if (!type || type === "transfer") {
      let query = `
        SELECT t.*, 
               wf.name as from_warehouse_name,
               wt.name as to_warehouse_name,
               'transfer' as operation_type
        FROM transfers t
        LEFT JOIN warehouses wf ON wf.id = t.from_warehouse_id
        LEFT JOIN warehouses wt ON wt.id = t.to_warehouse_id
        WHERE 1=1
      `
      const params = []
      let paramCount = 1

      if (status) {
        query += ` AND t.status = $${paramCount++}`
        params.push(status)
      }

      query += ` ORDER BY t.created_at DESC`
      const result = await pool.query(query, params)
      results.transfers = result.rows
    }

    if (!type || type === "adjustment") {
      let query = `
        SELECT a.*, w.name as warehouse_name, p.name as product_name, p.sku, 'adjustment' as operation_type
        FROM adjustments a
        LEFT JOIN warehouses w ON w.id = a.warehouse_id
        LEFT JOIN products p ON p.id = a.product_id
        WHERE 1=1
      `
      const params = []
      let paramCount = 1

      if (status) {
        query += ` AND a.status = $${paramCount++}`
        params.push(status)
      }
      if (warehouse) {
        query += ` AND a.warehouse_id = $${paramCount++}`
        params.push(warehouse)
      }

      query += ` ORDER BY a.created_at DESC`
      const result = await pool.query(query, params)
      results.adjustments = result.rows
    }

    res.json(results)
  } catch (err) {
    console.error("[v0] Operations filter error:", err)
    res.status(400).json({ error: err.message })
  }
})

// ==================== DASHBOARD STATS ====================

app.get("/api/dashboard/stats", async (req, res) => {
  try {
    // Total products in stock
    const productsResult = await pool.query("SELECT COUNT(*) FROM products")
    const totalProducts = Number.parseInt(productsResult.rows[0].count)

    // Low stock count
    const lowStockResult = await pool.query(`
      SELECT COUNT(DISTINCT p.id) 
      FROM products p
      JOIN stock s ON s.product_id = p.id
      WHERE s.quantity < p.min_quantity
    `)
    const lowStockCount = Number.parseInt(lowStockResult.rows[0].count)

    // Pending receipts
    const pendingReceiptsResult = await pool.query(
      "SELECT COUNT(*) FROM receipts WHERE status IN ('Draft', 'Waiting', 'Ready')",
    )
    const pendingReceipts = Number.parseInt(pendingReceiptsResult.rows[0].count)

    // Pending deliveries
    const pendingDeliveriesResult = await pool.query(
      "SELECT COUNT(*) FROM deliveries WHERE status IN ('Draft', 'Waiting', 'Ready')",
    )
    const pendingDeliveries = Number.parseInt(pendingDeliveriesResult.rows[0].count)

    // Scheduled transfers
    const scheduledTransfersResult = await pool.query(
      "SELECT COUNT(*) FROM transfers WHERE status IN ('Draft', 'Waiting', 'Ready')",
    )
    const scheduledTransfers = Number.parseInt(scheduledTransfersResult.rows[0].count)

    res.json({
      totalProducts,
      lowStockCount,
      pendingReceipts,
      pendingDeliveries,
      scheduledTransfers,
    })
  } catch (err) {
    console.error("[v0] Dashboard stats error:", err)
    res.status(400).json({ error: err.message })
  }
})

// Start server
const PORT = process.env.PORT || 5000
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📡 Socket.IO ready for real-time updates`)
})

// Export io for use in other modules
export { io, pool, authenticateToken }
