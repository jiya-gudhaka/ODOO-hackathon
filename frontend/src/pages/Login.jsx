"use client"

import { useState } from "react"
import { FiMail, FiLock, FiUser, FiPackage } from "react-icons/fi"

export default function Login({ onLogin }) {
  const [isSignup, setIsSignup] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    if (isSignup && password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setLoading(true)

    const result = await onLogin(email, password, isSignup, name)

    if (!result.success) {
      setError(result.error || "Authentication failed")
    }

    setLoading(false)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #714B67 0%, #5A3A52 100%)" }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 sm:p-8">
        {/* Logo/Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full mb-4"
            style={{ backgroundColor: "#E4D8F5" }}
          >
            <FiPackage className="w-7 h-7 sm:w-8 sm:h-8" style={{ color: "#714B67" }} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: "#714B67" }}>
            Stock Master
          </h1>
          <p className="text-sm sm:text-base" style={{ color: "#8F8F9F" }}>
            Inventory Management System
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs sm:text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignup && (
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "#4A4A4A" }}>
                Full Name
              </label>
              <div className="relative">
                <FiUser
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 flex-shrink-0 pointer-events-none"
                  style={{ color: "#8F8F9F" }}
                />
                <input
                  type="text"
                  className="input-field pl-24"
                  placeholder="    John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "#4A4A4A" }}>
              Email Address
            </label>
            <div className="relative">
              <FiMail
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 flex-shrink-0 pointer-events-none"
                style={{ color: "#8F8F9F" }}
              />
              <input
                type="email"
                className="input-field pl-24"
                placeholder="     you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "#4A4A4A" }}>
              Password
            </label>
            <div className="relative">
              <FiLock
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 flex-shrink-0 pointer-events-none"
                style={{ color: "#8F8F9F" }}
              />
              <input
                type="password"
                className="input-field pl-24"
                placeholder="    ••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {isSignup && (
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "#4A4A4A" }}>
                Confirm Password
              </label>
              <div className="relative">
                <FiLock
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 flex-shrink-0 pointer-events-none"
                  style={{ color: "#8F8F9F" }}
                />
                <input
                  type="password"
                  className="input-field pl-24"
                  placeholder="    ••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full btn-primary py-2.5 sm:py-3 text-sm sm:text-base">
            {loading ? "Loading..." : isSignup ? "Create Account" : "Sign In"}
          </button>
        </form>

        {/* Toggle Sign Up */}
        <div className="mt-6 text-center">
          <p className="text-xs sm:text-sm" style={{ color: "#8F8F9F" }}>
            {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              type="button"
              onClick={() => setIsSignup(!isSignup)}
              className="font-semibold hover:underline"
              style={{ color: "#714B67" }}
            >
              {isSignup ? "Sign In" : "Sign Up"}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
