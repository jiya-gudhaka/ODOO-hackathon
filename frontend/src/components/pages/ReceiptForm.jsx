"use client"

import { useState, useEffect } from "react"
import { FiArrowLeft, FiCheck, FiPrinter, FiX, FiPlus, FiTrash2 } from "react-icons/fi"
import { API_URL } from "../../config"

export default function ReceiptForm({ setCurrentPage, receiptId = null }) {
  const [receipt, setReceipt] = useState({
    reference: "",
    receiveFrom: "",
    responsible: "",
    scheduleDate: "",
    status: "Draft",
    products: [],
  })

  const [warehouses, setWarehouses] = useState([])
  const [products, setProducts] = useState([])
  const [selectedProduct, setSelectedProduct] = useState("")
  const [quantity, setQuantity] = useState("")

  useEffect(() => {
    fetchWarehouses()
    fetchProducts()
    if (receiptId) {
      fetchReceipt(receiptId)
    } else {
      generateReference()
      autoFillUser()
    }
  }, [receiptId])

  const generateReference = async () => {
    try {
      const response = await fetch(`${API_URL}/api/receipts/generate-reference`)
      const data = await response.json()
      setReceipt((prev) => ({ ...prev, reference: data.reference }))
    } catch (error) {
      console.error("[v0] Error generating reference:", error)
      const timestamp = Date.now()
      setReceipt((prev) => ({ ...prev, reference: `WH/IN/${timestamp}` }))
    }
  }

  const autoFillUser = () => {
    const user = JSON.parse(localStorage.getItem("user") || "{}")
    if (user.name) {
      setReceipt((prev) => ({ ...prev, responsible: user.name }))
    }
  }

  const fetchWarehouses = async () => {
    try {
      const response = await fetch(`${API_URL}/api/warehouses`)
      const data = await response.json()
      setWarehouses(data)
    } catch (error) {
      console.error("[v0] Error fetching warehouses:", error)
    }
  }

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/products`)
      const data = await response.json()
      setProducts(data)
    } catch (error) {
      console.error("[v0] Error fetching products:", error)
    }
  }

  const fetchReceipt = async (id) => {
    try {
      const response = await fetch(`${API_URL}/api/receipts/${id}`)
      const data = await response.json()
      setReceipt(data)
    } catch (error) {
      console.error("[v0] Error fetching receipt:", error)
    }
  }

  const addProduct = () => {
    if (!selectedProduct || !quantity) return

    const product = products.find((p) => p.id === Number.parseInt(selectedProduct))
    if (!product) return

    setReceipt((prev) => ({
      ...prev,
      products: [
        ...prev.products,
        {
          id: product.id,
          name: product.name,
          sku: product.sku,
          quantity: Number.parseInt(quantity),
        },
      ],
    }))

    setSelectedProduct("")
    setQuantity("")
  }

  const removeProduct = (index) => {
    setReceipt((prev) => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index),
    }))
  }

  const handleValidate = async () => {
    if (receipt.status !== "Draft") return

    try {
      const response = await fetch(`${API_URL}/api/receipts/${receiptId || "new"}`, {
        method: receiptId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...receipt, status: "Ready" }),
      })
      const data = await response.json()
      setReceipt((prev) => ({ ...prev, status: "Ready" }))
      alert("Receipt validated successfully!")
    } catch (error) {
      console.error("[v0] Error validating receipt:", error)
      alert("Error validating receipt")
    }
  }

  const handlePrint = () => {
    if (receipt.status !== "Done") {
      alert("You can only print receipts that are DONE")
      return
    }
    window.print()
  }

  const handleCancel = () => {
    if (confirm("Are you sure you want to cancel this receipt?")) {
      setCurrentPage("receipts")
    }
  }

  const handleDone = async () => {
    if (receipt.status !== "Ready") {
      alert("You must validate the receipt before marking it as done")
      return
    }

    try {
      const response = await fetch(`${API_URL}/api/receipts/${receiptId}/complete`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(receipt),
      })
      const data = await response.json()
      setReceipt((prev) => ({ ...prev, status: "Done" }))
      alert("Receipt completed successfully!")
    } catch (error) {
      console.error("[v0] Error completing receipt:", error)
      alert("Error completing receipt")
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "Draft":
        return "bg-grey-200 text-grey-700"
      case "Ready":
        return "bg-blue-100 text-blue-700"
      case "Done":
        return "bg-green-100 text-green-700"
      default:
        return "bg-grey-200 text-grey-700"
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-20">
      {/* Header */}
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2" style={{ color: "#714B67" }}>
            Receipt
          </h1>
          <p className="text-sm sm:text-base" style={{ color: "#8F8F9F" }}>
            When user click on receipt operations - By default land on List View
          </p>
        </div>
        <button
          onClick={() => setCurrentPage("receipts")}
          className="flex items-center gap-2 transition-colors text-sm sm:text-base"
          style={{ color: "#714B67" }}
        >
          <FiArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
          <span>Back to List</span>
        </button>
      </div>

      <div className="flex flex-wrap gap-2 sm:gap-4 mb-6">
        <button
          onClick={() => setCurrentPage("receipts")}
          className="btn-secondary flex items-center gap-2 text-sm sm:text-base"
        >
          <FiPlus className="w-4 h-4 flex-shrink-0" />
          <span>New</span>
        </button>
        <button
          onClick={handleValidate}
          disabled={receipt.status !== "Draft"}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm sm:text-base"
        >
          <FiCheck className="w-4 h-4 flex-shrink-0" />
          <span>Validate</span>
        </button>
        <button
          onClick={handlePrint}
          disabled={receipt.status !== "Done"}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm sm:text-base"
        >
          <FiPrinter className="w-4 h-4 flex-shrink-0" />
          <span>Print</span>
        </button>
        <button onClick={handleCancel} className="btn-secondary flex items-center gap-2 text-sm sm:text-base">
          <FiX className="w-4 h-4 flex-shrink-0" />
          <span>Cancel</span>
        </button>

        {/* Status Indicator */}
        <div className="w-full sm:w-auto sm:ml-auto flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
          <div className="text-xs sm:text-sm" style={{ color: "#8F8F9F" }}>
            <span className="font-semibold">Status Flow:</span> Draft → Ready → Done
          </div>
          <span
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-sm font-semibold ${getStatusColor(receipt.status)}`}
          >
            {receipt.status}
          </span>
        </div>
      </div>

      {/* Receipt Form */}
      <div className="card mb-6">
        {/* Reference */}
        <div className="mb-6 p-4 sm:p-6 rounded-lg" style={{ backgroundColor: "#E4D8F5" }}>
          <h2 className="text-xl sm:text-2xl font-bold font-mono break-all" style={{ color: "#714B67" }}>
            {receipt.reference}
          </h2>
          <p className="text-xs sm:text-sm mt-1" style={{ color: "#8F8F9F" }}>
            Reference auto-generated
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 p-4 sm:p-6">
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: "#4A4A4A" }}>
              Receive From
            </label>
            <input
              type="text"
              className="input-field"
              value={receipt.receiveFrom}
              onChange={(e) => setReceipt({ ...receipt, receiveFrom: e.target.value })}
              placeholder="Vendor/Supplier name"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: "#4A4A4A" }}>
              Responsible
            </label>
            <input
              type="text"
              className="input-field"
              value={receipt.responsible}
              onChange={(e) => setReceipt({ ...receipt, responsible: e.target.value })}
              placeholder="Person responsible"
            />
            <p className="text-xs mt-1" style={{ color: "#8F8F9F" }}>
              Auto-filled with logged-in user
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: "#4A4A4A" }}>
              Schedule Date
            </label>
            <input
              type="date"
              className="input-field"
              value={receipt.scheduleDate}
              onChange={(e) => setReceipt({ ...receipt, scheduleDate: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Products Section */}
      <div className="card">
        <div className="border-b-2 p-4" style={{ borderColor: "#714B67" }}>
          <h3 className="text-lg sm:text-xl font-bold" style={{ color: "#714B67" }}>
            Products
          </h3>
        </div>

        <div
          className="p-4 sm:p-6 flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-end"
          style={{ backgroundColor: "#E5E5E7" }}
        >
          <div className="flex-1">
            <label className="block text-sm font-semibold mb-2" style={{ color: "#4A4A4A" }}>
              Select Product
            </label>
            <select
              className="input-field"
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
            >
              <option value="">-- Select Product --</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  [{product.sku}] {product.name}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full sm:w-32">
            <label className="block text-sm font-semibold mb-2" style={{ color: "#4A4A4A" }}>
              Quantity
            </label>
            <input
              type="number"
              className="input-field"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
              min="1"
            />
          </div>

          <button
            onClick={addProduct}
            className="btn-primary flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            <FiPlus className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
            <span>Add Product</span>
          </button>
        </div>

        {/* Products Table */}
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="min-w-[600px]">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid #E5E5E7" }}>
                  <th className="text-left py-3 px-3 sm:px-4 font-semibold text-sm" style={{ color: "#4A4A4A" }}>
                    Product
                  </th>
                  <th className="text-left py-3 px-3 sm:px-4 font-semibold text-sm" style={{ color: "#4A4A4A" }}>
                    SKU
                  </th>
                  <th className="text-right py-3 px-3 sm:px-4 font-semibold text-sm" style={{ color: "#4A4A4A" }}>
                    Quantity
                  </th>
                  <th className="text-center py-3 px-3 sm:px-4 font-semibold text-sm" style={{ color: "#4A4A4A" }}>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {receipt.products.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-8 text-sm" style={{ color: "#8F8F9F" }}>
                      No products added yet. Add products above.
                    </td>
                  </tr>
                ) : (
                  receipt.products.map((product, index) => (
                    <tr key={index} className="hover:bg-gray-50" style={{ borderBottom: "1px solid #E5E5E7" }}>
                      <td className="py-3 px-3 sm:px-4 text-sm" style={{ color: "#4A4A4A" }}>
                        {product.name}
                      </td>
                      <td className="py-3 px-3 sm:px-4 font-mono text-xs sm:text-sm" style={{ color: "#8F8F9F" }}>
                        [{product.sku}]
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-right font-semibold text-sm" style={{ color: "#4A4A4A" }}>
                        {product.quantity}
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-center">
                        <button
                          onClick={() => removeProduct(index)}
                          className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-red-600 hover:text-red-700 transition-colors"
                        >
                          <FiTrash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span>Remove</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-4 text-xs sm:text-sm" style={{ backgroundColor: "#E5E5E7", color: "#8F8F9F" }}>
          <p>Auto fill with the current logged in users.</p>
          <p className="mt-1">On click, TODO, move to Ready</p>
          <p className="mt-1">on click, Validate move to Done</p>
        </div>
      </div>

      {/* Action Button at Bottom */}
      {receipt.status === "Ready" && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleDone}
            className="btn-primary text-base sm:text-lg px-6 sm:px-8 py-2.5 sm:py-3 flex items-center gap-2"
          >
            <FiCheck className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
            <span>Mark as Done</span>
          </button>
        </div>
      )}

      {/* Status Info Box */}
      <div
        className="mt-6 p-4 rounded-lg"
        style={{ backgroundColor: "#E4D8F5", borderColor: "#714B67", border: "1px solid" }}
      >
        <h4 className="font-semibold mb-2 text-sm sm:text-base" style={{ color: "#714B67" }}>
          Status Workflow Guide:
        </h4>
        <ul className="text-xs sm:text-sm space-y-1" style={{ color: "#4A4A4A" }}>
          <li>
            <strong>Draft:</strong> Initial state - Add products and fill details
          </li>
          <li>
            <strong>Ready:</strong> Click Validate when ready to receive
          </li>
          <li>
            <strong>Done:</strong> Receipt completed and goods received
          </li>
        </ul>
        <p className="text-xs mt-3" style={{ color: "#714B67" }}>
          Print the receipt once it's DONE
        </p>
      </div>
    </div>
  )
}
