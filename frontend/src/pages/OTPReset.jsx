"use client"

import { useState } from "react"
import { FiMail, FiLock, FiCheck } from "react-icons/fi"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000"

export default function OTPReset() {
  const [step, setStep] = useState(1) // 1: email, 2: otp, 3: success
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [devOtp, setDevOtp] = useState("")

  const handleRequestOTP = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/api/auth/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()
      if (response.ok) {
        setDevOtp(data.otp) // For dev mode
        setStep(2)
      } else {
        setError(data.error || "Failed to send OTP")
      }
    } catch (err) {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    setError("")

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword }),
      })

      const data = await response.json()
      if (response.ok) {
        setStep(3)
      } else {
        setError(data.error || "Invalid OTP")
      }
    } catch (err) {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-odoo-purple to-odoo-plum flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-odoo-lavender rounded-full flex items-center justify-center mx-auto mb-4">
            <FiLock className="w-10 h-10 text-odoo-purple" />
          </div>
          <h1 className="text-3xl font-bold text-odoo-dark mb-2">Reset Password</h1>
          <p className="text-odoo-medium">
            {step === 1 && "Enter your email to receive OTP"}
            {step === 2 && "Enter OTP and new password"}
            {step === 3 && "Password reset successful!"}
          </p>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">{error}</div>}

        {step === 1 && (
          <form onSubmit={handleRequestOTP} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-odoo-dark mb-2">Email Address</label>
              <div className="relative">
                <FiMail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-odoo-medium w-5 h-5 pointer-events-none flex-shrink-0" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="input-field pl-12 w-full"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Sending OTP..." : "Send OTP"}
            </button>

            <div className="text-center">
              <a href="/login" className="text-odoo-purple hover:text-odoo-plum">
                Back to Login
              </a>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyOTP} className="space-y-6">
            {devOtp && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm">
                <strong>Dev Mode:</strong> Your OTP is <strong>{devOtp}</strong>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-odoo-dark mb-2">Enter OTP</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                maxLength={6}
                className="input-field w-full text-center text-2xl tracking-widest"
                placeholder="000000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-odoo-dark mb-2">New Password</label>
              <div className="relative">
                <FiLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-odoo-medium w-5 h-5 pointer-events-none flex-shrink-0" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="input-field pl-12 w-full"
                  placeholder="New password"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-odoo-dark mb-2">Confirm Password</label>
              <div className="relative">
                <FiLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-odoo-medium w-5 h-5 pointer-events-none flex-shrink-0" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="input-field pl-12 w-full"
                  placeholder="Confirm password"
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Resetting..." : "Reset Password"}
            </button>

            <button type="button" onClick={() => setStep(1)} className="btn-secondary w-full">
              Resend OTP
            </button>
          </form>
        )}

        {step === 3 && (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <FiCheck className="w-10 h-10 text-green-600" />
            </div>
            <p className="text-lg text-odoo-dark">Your password has been reset successfully!</p>
            <a href="/login" className="btn-primary w-full inline-block">
              Go to Login
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
