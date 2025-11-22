import express from "express"
import cors from "cors"
import pg from "pg"
import dotenv from "dotenv"
import multer from "multer"
import path from "path"
import fs from "fs"
import { spawn } from "child_process"

dotenv.config()

const app = express()

// Middleware
app.use(cors())
app.use(express.json())

const storageRoot = path.join(process.cwd(), "backend", "storage")
const invoicesDir = path.join(storageRoot, "invoices")
fs.mkdirSync(invoicesDir, { recursive: true })
app.use("/storage", express.static(storageRoot))

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, invoicesDir),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_")
    const stamp = Date.now()
    cb(null, `${stamp}_${safeName}`)
  },
})
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png"]
    cb(null, allowed.includes(file.mimetype))
  },
})

// Database connection
const { Pool } = pg
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false,
  },
})

// Test DB connection
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("Database connection failed:", err)
  } else {
    console.log("Database connected successfully:", res.rows[0].now)
  }
})

// Initialize schema (idempotent)
async function initSchema() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name TEXT,
        sku TEXT UNIQUE,
        category TEXT,
        unitofmeasure TEXT,
        initialstock INTEGER DEFAULT 0,
        unitprice NUMERIC DEFAULT 0,
        createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        status TEXT,
        fileurl TEXT,
        invoicenumber TEXT,
        supplier TEXT,
        date DATE,
        totalamount NUMERIC,
        createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS invoiceitems (
        id SERIAL PRIMARY KEY,
        invoiceid INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
        productid INTEGER,
        productname TEXT,
        sku TEXT,
        quantity INTEGER DEFAULT 0,
        unitprice NUMERIC,
        total NUMERIC
      );
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS receipts (
        id SERIAL PRIMARY KEY,
        reference TEXT,
        supplierid INTEGER,
        warehouseid INTEGER,
        status TEXT,
        createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS receiptitems (
        id SERIAL PRIMARY KEY,
        receiptid INTEGER REFERENCES receipts(id) ON DELETE CASCADE,
        productid INTEGER,
        quantityreceived INTEGER DEFAULT 0
      );
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS deliveries (
        id SERIAL PRIMARY KEY,
        reference TEXT,
        fromwarehouse INTEGER,
        towarehouse INTEGER,
        status TEXT,
        createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS stockledger (
        id SERIAL PRIMARY KEY,
        productid INTEGER,
        locationid INTEGER,
        quantitychange INTEGER,
        type TEXT,
        referenceid INTEGER,
        notes TEXT,
        createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS stockadjustments (
        id SERIAL PRIMARY KEY,
        productid INTEGER,
        locationid INTEGER,
        countedquantity INTEGER,
        reason TEXT,
        createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)
    console.log("Schema initialized")
  } catch (schemaErr) {
    console.error("Schema initialization error:", schemaErr)
  }
}

initSchema()

// Routes

// Auth Routes
app.post("/api/auth/signup", async (req, res) => {
  const { email, password, name } = req.body
  try {
    const result = await pool.query(
      "INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name",
      [email, password, name],
    )
    res.json({ success: true, user: result.rows[0] })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body
  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1 AND password = $2", [email, password])
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" })
    }
    res.json({ success: true, user: result.rows[0] })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Product Routes
app.get("/api/products", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM products ORDER BY createdat DESC")
    res.json(result.rows)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.post("/api/products", async (req, res) => {
  const { name, sku, category, unitOfMeasure, initialStock } = req.body
  try {
    const result = await pool.query(
      "INSERT INTO products (name, sku, category, unitOfMeasure, initialStock) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [name, sku, category, unitOfMeasure, initialStock],
    )
    res.json(result.rows[0])
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Warehouse Routes
app.get("/api/warehouses", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM warehouses")
    res.json(result.rows)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.post("/api/warehouses", async (req, res) => {
  const { name, shortCode, address } = req.body
  try {
    const result = await pool.query(
      "INSERT INTO warehouses (name, shortCode, address) VALUES ($1, $2, $3) RETURNING *",
      [name, shortCode, address],
    )
    res.json(result.rows[0])
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Receipt Routes
app.get("/api/receipts", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM receipts ORDER BY createdat DESC")
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
    const { id } = req.params
    const result = await pool.query("SELECT * FROM receipts WHERE id = $1", [id])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Receipt not found" })
    }

    // Get receipt items
    const itemsResult = await pool.query(
      `SELECT ri.*, p.name, p.sku 
       FROM receiptItems ri 
       JOIN products p ON ri.productId = p.id 
       WHERE ri.receiptId = $1`,
      [id],
    )

    const receipt = result.rows[0]
    receipt.products = itemsResult.rows
    res.json(receipt)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.post("/api/receipts", async (req, res) => {
  const { reference, supplierId, warehouseId, status } = req.body
  try {
    const result = await pool.query(
      "INSERT INTO receipts (reference, supplierId, warehouseId, status) VALUES ($1, $2, $3, $4) RETURNING *",
      [reference, supplierId, warehouseId, status],
    )
    res.json(result.rows[0])
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.put("/api/receipts/:id", async (req, res) => {
  const { id } = req.params
  const { reference, receiveFrom, responsible, scheduleDate, status, products } = req.body

  try {
    // Start transaction
    await pool.query("BEGIN")

    // Update receipt
    const result = await pool.query(
      `UPDATE receipts 
       SET status = $1, updatedAt = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING *`,
      [status, id],
    )

    if (result.rows.length === 0) {
      await pool.query("ROLLBACK")
      return res.status(404).json({ error: "Receipt not found" })
    }

    // Delete existing items
    await pool.query("DELETE FROM receiptItems WHERE receiptId = $1", [id])

    // Insert new items
    if (products && products.length > 0) {
      for (const product of products) {
        await pool.query("INSERT INTO receiptItems (receiptId, productId, quantityReceived) VALUES ($1, $2, $3)", [
          id,
          product.id,
          product.quantity,
        ])
      }
    }

    await pool.query("COMMIT")
    res.json(result.rows[0])
  } catch (err) {
    await pool.query("ROLLBACK")
    res.status(400).json({ error: err.message })
  }
})

app.put("/api/receipts/:id/complete", async (req, res) => {
  const { id } = req.params
  const { products } = req.body

  try {
    await pool.query("BEGIN")

    // Update receipt status to Done
    await pool.query("UPDATE receipts SET status = $1, updatedAt = CURRENT_TIMESTAMP WHERE id = $2", ["Done", id])

    // Update stock ledger for each product
    if (products && products.length > 0) {
      for (const product of products) {
        await pool.query(
          `INSERT INTO stockLedger (productId, locationId, quantityChange, type, referenceId, notes) 
           VALUES ($1, 1, $2, 'receipt', $3, 'Receipt completed')`,
          [product.id, product.quantity, id],
        )
      }
    }

    await pool.query("COMMIT")
    res.json({ success: true, message: "Receipt completed successfully" })
  } catch (err) {
    await pool.query("ROLLBACK")
    res.status(400).json({ error: err.message })
  }
})

// Invoice Routes
app.get("/api/invoices", async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM invoices ORDER BY createdat DESC")
    res.json(r.rows)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.get("/api/invoices/:id", async (req, res) => {
  try {
    const { id } = req.params
    const inv = await pool.query("SELECT * FROM invoices WHERE id = $1", [id])
    if (inv.rows.length === 0) return res.status(404).json({ error: "Invoice not found" })
    const items = await pool.query(
      `SELECT ii.*, p.name AS productNameCanonical, p.sku AS skuCanonical
       FROM invoiceItems ii
       LEFT JOIN products p ON ii.productId = p.id
       WHERE ii.invoiceId = $1`,
      [id],
    )
    const invoice = inv.rows[0]
    invoice.items = items.rows
    res.json(invoice)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.post("/api/invoices/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file provided" })
    const fileUrl = `/storage/invoices/${req.file.filename}`
    const r = await pool.query(
      `INSERT INTO invoices (status, fileUrl) VALUES ($1, $2) RETURNING *`,
      ["Uploaded", fileUrl],
    )
    res.json(r.rows[0])
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.post("/api/invoices/:id/extract", async (req, res) => {
  const { id } = req.params
  try {
    const invRes = await pool.query("SELECT * FROM invoices WHERE id = $1", [id])
    if (invRes.rows.length === 0) return res.status(404).json({ error: "Invoice not found" })
    const inv = invRes.rows[0]

    const normalizeDate = (s) => {
      if (!s) return null
      const m = s.match(/^([0-9]{1,2})[\/\-]([0-9]{1,2})[\/\-]([0-9]{2,4})$/)
      if (m) {
        const y = m[3].length === 2 ? `20${m[3]}` : m[3]
        return `${y}-${String(m[2]).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}`
      }
      const d = new Date(s)
      return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
    }

    const mapFromOcr = (ocr) => ({
      invoiceNumber: ocr["Invoice Number"] || null,
      supplier: ocr["Vendor Name"] || null,
      date: normalizeDate(ocr["Invoice Date"]) || null,
      totalAmount: ocr["Total Amount"] ? Number(ocr["Total Amount"]) : null,
      items: Array.isArray(ocr["Items"]) ? ocr["Items"].map((x) => ({
        productName: x["Item Name"] || null,
        sku: x["HSN/SAC Code"] || null,
        quantity: x["Quantity"] ? Number(String(x["Quantity"]).replace(/,/g, "")) : 0,
        unitPrice: x["Unit Price"] ? Number(String(x["Unit Price"]).replace(/,/g, "")) : null,
        total: x["Line Total"] ? Number(String(x["Line Total"]).replace(/,/g, "")) : null,
      })) : [],
    })

    let payload = req.body?.data
    if (!payload) {
      if (!inv.fileurl) return res.status(400).json({ error: "No fileUrl stored for invoice" })
      const filename = path.basename(inv.fileurl)
      const filePath = path.join(path.join(process.cwd(), "backend", "storage"), "invoices", filename)
      const pythonBin = process.env.PYTHON_BIN || "python"
      const scriptPath = process.env.OCR_SCRIPT_PATH || path.join(process.cwd(), "ocr", "extract_invoice.py")
      const proc = spawn(pythonBin, [scriptPath, filePath])
      let out = ""
      let errStr = ""
      await new Promise((resolve, reject) => {
        proc.stdout.on("data", (d) => (out += d.toString()))
        proc.stderr.on("data", (d) => (errStr += d.toString()))
        proc.on("close", (code) => (code === 0 ? resolve() : reject(new Error(errStr || `Python exit ${code}`))))
      })
      const ocr = JSON.parse(out)
      payload = mapFromOcr(ocr)
    }

    await pool.query("BEGIN")
    await pool.query(
      `UPDATE invoices SET invoiceNumber = $1, supplier = $2, date = $3, totalAmount = $4, status = $5 WHERE id = $6`,
      [payload.invoiceNumber || null, payload.supplier || null, payload.date || null, payload.totalAmount || null, "Extracted", id],
    )

    await pool.query("DELETE FROM invoiceItems WHERE invoiceId = $1", [id])
    for (const it of payload.items || []) {
      let productId = null
      if (it.sku) {
        const p = await pool.query("SELECT id FROM products WHERE sku = $1", [it.sku])
        if (p.rows[0]) productId = p.rows[0].id
      }
      if (!productId && it.productName) {
        const p = await pool.query("SELECT id FROM products WHERE LOWER(name) = LOWER($1) LIMIT 1", [it.productName])
        if (p.rows[0]) productId = p.rows[0].id
      }
      await pool.query(
        `INSERT INTO invoiceItems (invoiceId, productId, productName, sku, quantity, unitPrice, total)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, productId, it.productName || null, it.sku || null, it.quantity || 0, it.unitPrice || null, it.total || null],
      )
    }
    await pool.query("COMMIT")

    const refreshed = await pool.query("SELECT * FROM invoices WHERE id = $1", [id])
    res.json(refreshed.rows[0])
  } catch (err) {
    await pool.query("ROLLBACK")
    res.status(400).json({ error: err.message })
  }
})

app.put("/api/invoices/:id", async (req, res) => {
  const { id } = req.params
  const { invoiceNumber, supplier, date, totalAmount, status, items } = req.body
  try {
    await pool.query("BEGIN")
    const up = await pool.query(
      `UPDATE invoices SET invoiceNumber = $1, supplier = $2, date = $3, totalAmount = $4, status = $5 WHERE id = $6 RETURNING *`,
      [invoiceNumber || null, supplier || null, date || null, totalAmount || null, status || "Extracted", id],
    )
    await pool.query("DELETE FROM invoiceItems WHERE invoiceId = $1", [id])
    if (Array.isArray(items)) {
      for (const it of items) {
        await pool.query(
          `INSERT INTO invoiceItems (invoiceId, productId, productName, sku, quantity, unitPrice, total)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [id, it.productId || null, it.productName || null, it.sku || null, it.quantity || 0, it.unitPrice || null, it.total || null],
        )
      }
    }
    await pool.query("COMMIT")
    res.json(up.rows[0])
  } catch (err) {
    await pool.query("ROLLBACK")
    res.status(400).json({ error: err.message })
  }
})

app.post("/api/invoices/:id/create-receipt", async (req, res) => {
  const { id } = req.params
  const { warehouseId, status } = req.body
  if (!warehouseId) return res.status(400).json({ error: "warehouseId is required" })
  try {
    const items = await pool.query("SELECT * FROM invoiceItems WHERE invoiceId = $1", [id])
    const unmapped = items.rows.filter((r) => !r.productid)
    if (unmapped.length > 0) {
      return res.status(422).json({ error: "Unmapped items exist", unmapped })
    }
    const countR = await pool.query("SELECT COUNT(*) FROM receipts")
    const count = Number.parseInt(countR.rows[0].count) + 1
    const reference = `WH/IN/${String(count).padStart(4, "0")}`

    const rec = await pool.query(
      `INSERT INTO receipts (reference, warehouseId, status) VALUES ($1, $2, $3) RETURNING *`,
      [reference, warehouseId, status || "Draft"],
    )
    const receiptId = rec.rows[0].id

    for (const it of items.rows) {
      await pool.query(
        `INSERT INTO receiptItems (receiptId, productId, quantityReceived) VALUES ($1, $2, $3)`,
        [receiptId, it.productid, it.quantity],
      )
    }
    res.json({ success: true, receipt: rec.rows[0] })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Delivery Routes
app.get("/api/deliveries", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM deliveries ORDER BY createdat DESC")
    res.json(result.rows)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.post("/api/deliveries", async (req, res) => {
  const { reference, fromWarehouse, toWarehouse, status } = req.body
  try {
    const result = await pool.query(
      "INSERT INTO deliveries (reference, fromWarehouse, toWarehouse, status) VALUES ($1, $2, $3, $4) RETURNING *",
      [reference, fromWarehouse, toWarehouse, status],
    )
    res.json(result.rows[0])
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Stock Adjustment Routes
app.post("/api/stock-adjustments", async (req, res) => {
  const { productId, locationId, countedQuantity, reason } = req.body
  try {
    const result = await pool.query(
      "INSERT INTO stockAdjustments (productId, locationId, countedQuantity, reason) VALUES ($1, $2, $3, $4) RETURNING *",
      [productId, locationId, countedQuantity, reason],
    )
    res.json(result.rows[0])
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Start Server
const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
