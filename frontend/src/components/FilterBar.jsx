"use client"

import { useState, useEffect } from "react"
import { FiSearch } from "react-icons/fi"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000"

export default function FilterBar({
  onFilterChange,
  showCategoryFilter = true,
  showWarehouseFilter = true,
  showLowStockToggle = true,
}) {
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("")
  const [warehouse, setWarehouse] = useState("")
  const [lowStock, setLowStock] = useState(false)
  const [categories, setCategories] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  useEffect(() => {
    if (showCategoryFilter) fetchCategories()
    if (showWarehouseFilter) fetchWarehouses()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      onFilterChange({ search, category, warehouse, lowStock })
    }, 300)

    return () => clearTimeout(timer)
  }, [search, category, warehouse, lowStock])

  useEffect(() => {
    if (search.length > 1) {
      fetchSuggestions(search)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }, [search])

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/api/categories`)
      const data = await response.json()
      setCategories(data)
    } catch (err) {
      console.error("Failed to fetch categories:", err)
    }
  }

  const fetchWarehouses = async () => {
    try {
      const response = await fetch(`${API_URL}/api/warehouses`)
      const data = await response.json()
      setWarehouses(data)
    } catch (err) {
      console.error("Failed to fetch warehouses:", err)
    }
  }

  const fetchSuggestions = async (q) => {
    try {
      const response = await fetch(`${API_URL}/api/products/autocomplete?q=${encodeURIComponent(q)}`)
      const data = await response.json()
      setSuggestions(data)
      setShowSuggestions(true)
    } catch (err) {
      console.error("Failed to fetch suggestions:", err)
    }
  }

  const selectSuggestion = (product) => {
    setSearch(product.sku)
    setShowSuggestions(false)
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-odoo-medium w-5 h-5 pointer-events-none flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or SKU..."
            className="input-field pl-12 w-full"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
              {suggestions.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => selectSuggestion(product)}
                  className="w-full text-left px-4 py-3 hover:bg-odoo-lavender transition-colors border-b border-gray-100 last:border-b-0"
                >
                  <div className="font-medium text-odoo-dark">{product.name}</div>
                  <div className="text-sm text-odoo-medium">{product.sku}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {showCategoryFilter && (
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-field w-full sm:w-48">
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        )}

        {showWarehouseFilter && (
          <select
            value={warehouse}
            onChange={(e) => setWarehouse(e.target.value)}
            className="input-field w-full sm:w-48"
          >
            <option value="">All Warehouses</option>
            {warehouses.map((wh) => (
              <option key={wh.id} value={wh.id}>
                {wh.name}
              </option>
            ))}
          </select>
        )}

        {showLowStockToggle && (
          <label className="flex items-center gap-2 cursor-pointer px-4 py-2 bg-odoo-lavender rounded-lg hover:bg-opacity-80 transition-colors">
            <input
              type="checkbox"
              checked={lowStock}
              onChange={(e) => setLowStock(e.target.checked)}
              className="w-5 h-5 text-odoo-purple rounded"
            />
            <span className="text-sm font-medium text-odoo-dark whitespace-nowrap">Low Stock Only</span>
          </label>
        )}
      </div>
    </div>
  )
}
