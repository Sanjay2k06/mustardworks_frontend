"use client"

import { useEffect, useMemo, useState } from "react"
import { authService } from "../services/auth"
import { projectsService } from "../services/projects"
import { useNavigate } from "react-router-dom"

const Profile = () => {
  const [user, setUser] = useState(null)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [passwordSuccess, setPasswordSuccess] = useState("")
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        setLoading(true)
        const [u, mine] = await Promise.all([authService.getCurrentUser(), projectsService.getMine().catch(() => ({ data: { projects: [] } }))])
        if (!mounted) return
        
        console.log('[PROFILE] User data received:', u)
        console.log('[PROFILE] Projects data received:', mine)
        
        const normalizedUser = u?.user || u?.data?.user || u
        setUser(normalizedUser || null)
        
        // Handle different response formats from backend
        let projectsList = []
        if (Array.isArray(mine)) {
          projectsList = mine
        } else if (mine?.data?.projects) {
          projectsList = mine.data.projects
        } else if (mine?.projects) {
          projectsList = mine.projects
        } else if (mine?.data && Array.isArray(mine.data)) {
          projectsList = mine.data
        }
        
        console.log('[PROFILE] Normalized projects list:', projectsList)
        
        // Ensure projectsList is always an array
        setProjects(Array.isArray(projectsList) ? projectsList : [])
      } catch (e) {
        console.error('[PROFILE] Error loading data:', e)
        setError(e?.response?.data?.message || "Failed to load profile.")
        setProjects([]) // Set empty array on error
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  const initials = useMemo(() => {
    const name = user?.name || `${user?.firstName || ""} ${user?.lastName || ""}`.trim()
    return name
      ? name
          .split(" ")
          .map((n) => n[0])
          .slice(0, 2)
          .join("")
          .toUpperCase()
      : "U"
  }, [user])

  const [avatarFile, setAvatarFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  const API_BASE = import.meta.env.VITE_API_BASE_URL
    ? import.meta.env.VITE_API_BASE_URL.replace(/\/api$/, "")
    : "https://mustardworks-backend.onrender.com"

  const avatarUrl = user?.avatar
    ? user.avatar.startsWith("http")
      ? user.avatar
      : `${API_BASE}${user.avatar}`
    : null

  const handleAvatarChange = (e) => {
    const f = e.target.files && e.target.files[0]
    if (f) setAvatarFile(f)
  }

  const handleAvatarUpload = async () => {
    if (!avatarFile) return
    try {
      setUploading(true)
      await authService.uploadProfileImage(avatarFile)
      // reload user data
      const fresh = await authService.getCurrentUser()
      const normalizedUser = fresh?.user || fresh?.data?.user || fresh
      setUser(normalizedUser || null)
      setAvatarFile(null)
    } catch (e) {
      console.error("Avatar upload failed", e)
      alert(e?.response?.data?.message || "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await authService.logout()
    } finally {
      navigate("/", { replace: true })
      window.location.href = "/"
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setPasswordError("")
    setPasswordSuccess("")

    // Validation
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError("All fields are required")
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("New passwords do not match")
      return
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters")
      return
    }

    try {
      setPasswordLoading(true)
      await authService.updatePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      })
      setPasswordSuccess("Password updated successfully!")
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })
      setTimeout(() => {
        setShowPasswordForm(false)
        setPasswordSuccess("")
      }, 2000)
    } catch (e) {
      setPasswordError(e?.response?.data?.message || "Failed to update password")
    } finally {
      setPasswordLoading(false)
    }
  }

  const getStatusColor = (status) => {
    const s = String(status).toLowerCase()
    if (s === "approved" || s === "completed") return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
    if (s === "pending" || s === "submitted") return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
    if (s === "rejected") return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
    if (s === "in-progress") return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
    return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
  }

  const getStatusIcon = (status) => {
    const s = String(status).toLowerCase()
    if (s === "approved" || s === "completed")
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      )
    if (s === "pending" || s === "submitted")
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
            clipRule="evenodd"
          />
        </svg>
      )
    if (s === "rejected")
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
      )
    return (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
          clipRule="evenodd"
        />
      </svg>
    )
  }

  if (loading) {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[color:var(--primary)]"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center">
        <p className="text-[color:var(--danger)]">{error}</p>
      </div>
    )
  }

  // Ensure projects is always an array before calculating stats
  const safeProjects = Array.isArray(projects) ? projects : []
  
  const projectStats = {
    total: safeProjects.length,
    pending: safeProjects.filter((p) => String(p.status).toLowerCase() === "pending" || String(p.status).toLowerCase() === "submitted").length,
    approved: safeProjects.filter((p) => String(p.status).toLowerCase() === "approved" || String(p.status).toLowerCase() === "completed").length,
    rejected: safeProjects.filter((p) => String(p.status).toLowerCase() === "rejected").length,
  }

  return (
    <main className="pt-24 pb-16 min-h-screen bg-app relative">
      {/* animated background */}
      <div className="animated-bg pointer-events-none" aria-hidden="true"></div>

      <div className="container mx-auto px-4 max-w-6xl relative z-10">
        {/* Header Card */}
        <section className="bg-surface rounded-2xl shadow-soft p-6 md:p-8 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="h-20 w-20 md:h-24 md:w-24 rounded-full overflow-hidden flex items-center justify-center shadow-lg">
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-[color:var(--primary)] to-[color:var(--accent)] flex items-center justify-center text-white font-bold text-2xl md:text-3xl">
                  {initials}
                </div>
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold text-app mb-2">
                {user?.name || `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "User"}
              </h1>
              <p className="text-secondary text-lg flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                {user?.email}
              </p>
              <div className="flex gap-3 mt-3">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[color:var(--primary-ghost)] text-[color:var(--primary)]">
                  {user?.role === "admin" ? "Administrator" : "User"}
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[color:var(--accent-ghost)] text-[color:var(--accent)]">
                  Active
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-3 items-end">
              {user?.role === "admin" && (
                <div className="flex items-center gap-2">
                  <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" id="avatarFileInput" />
                  <label htmlFor="avatarFileInput" className="px-3 py-2 rounded-lg border border-token text-sm cursor-pointer hover:bg-surface">
                    Choose Image
                  </label>
                  <button onClick={handleAvatarUpload} disabled={uploading || !avatarFile} className="px-3 py-2 rounded-lg bg-[color:var(--primary)] text-white text-sm disabled:opacity-50">
                    {uploading ? "Uploading..." : avatarFile ? "Upload" : "Upload"}
                  </button>
                </div>
              )}
              <button
                onClick={() => setShowPasswordForm(!showPasswordForm)}
                className="px-4 py-2 rounded-lg border-2 border-[color:var(--primary)] text-[color:var(--primary)] font-semibold hover:bg-[color:var(--primary)] hover:text-white transition-all duration-200"
              >
                {showPasswordForm ? "Cancel" : "Change Password"}
              </button>
              <button onClick={handleLogout} className="btn-primary">
                Logout
              </button>
            </div>
          </div>
        </section>

        {/* Password Change Form */}
        {showPasswordForm && (
          <section className="bg-surface rounded-2xl shadow-soft p-6 md:p-8 mb-8">
            <h2 className="text-2xl font-bold text-app mb-6 flex items-center gap-2">
              <svg className="w-6 h-6 text-[color:var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Change Password
            </h2>
            <form onSubmit={handlePasswordChange} className="max-w-lg">
              <div className="space-y-4">
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-app mb-2">
                    Current Password
                  </label>
                  <input
                    type="password"
                    id="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg bg-surface-2 border border-token text-app focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)] transition-all"
                    placeholder="Enter current password"
                  />
                </div>
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-app mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg bg-surface-2 border border-token text-app focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)] transition-all"
                    placeholder="Enter new password (min 6 characters)"
                  />
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-app mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg bg-surface-2 border border-token text-app focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)] transition-all"
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
              {passwordError && (
                <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="mt-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm">
                  {passwordSuccess}
                </div>
              )}
              <button
                type="submit"
                disabled={passwordLoading}
                className="mt-6 btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {passwordLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </button>
            </form>
          </section>
        )}

        {/* Stats Overview */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
          <div className="bg-surface rounded-xl p-5 shadow-subtle border-l-4 border-[color:var(--primary)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-secondary text-sm font-medium mb-1">Total Projects</p>
                <p className="text-3xl font-bold text-app">{projectStats.total}</p>
              </div>
              <div className="bg-[color:var(--primary-ghost)] p-3 rounded-lg">
                <svg className="w-6 h-6 text-[color:var(--primary)]" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                  <path
                    fillRule="evenodd"
                    d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-surface rounded-xl p-5 shadow-subtle border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-secondary text-sm font-medium mb-1">Pending</p>
                <p className="text-3xl font-bold text-app">{projectStats.pending}</p>
              </div>
              <div className="bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-surface rounded-xl p-5 shadow-subtle border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-secondary text-sm font-medium mb-1">Approved</p>
                <p className="text-3xl font-bold text-app">{projectStats.approved}</p>
              </div>
              <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg">
                <svg className="w-6 h-6 text-green-600 dark:text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-surface rounded-xl p-5 shadow-subtle border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-secondary text-sm font-medium mb-1">Rejected</p>
                <p className="text-3xl font-bold text-app">{projectStats.rejected}</p>
              </div>
              <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-lg">
                <svg className="w-6 h-6 text-red-600 dark:text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
          </div>
        </section>

        {/* Personal Details Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-surface rounded-xl p-6 shadow-soft">
            <h2 className="text-xl font-bold text-app mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-[color:var(--primary)]" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                  clipRule="evenodd"
                />
              </svg>
              Personal Information
            </h2>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="bg-[color:var(--primary-ghost)] p-2 rounded-lg mr-3">
                  <svg className="w-5 h-5 text-[color:var(--primary)]" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-secondary text-sm">Full Name</p>
                  <p className="text-app font-medium">
                    {user?.firstName} {user?.lastName}
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-[color:var(--primary-ghost)] p-2 rounded-lg mr-3">
                  <svg className="w-5 h-5 text-[color:var(--primary)]" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                </div>
                <div>
                  <p className="text-secondary text-sm">Email Address</p>
                  <p className="text-app font-medium break-all">{user?.email}</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-[color:var(--primary-ghost)] p-2 rounded-lg mr-3">
                  <svg className="w-5 h-5 text-[color:var(--primary)]" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-secondary text-sm">Role</p>
                  <p className="text-app font-medium capitalize">{user?.role || "User"}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface rounded-xl p-6 shadow-soft">
            <h2 className="text-xl font-bold text-app mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-[color:var(--accent)]" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                  clipRule="evenodd"
                />
              </svg>
              Account Details
            </h2>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="bg-[color:var(--accent-ghost)] p-2 rounded-lg mr-3">
                  <svg className="w-5 h-5 text-[color:var(--accent)]" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-secondary text-sm">Member Since</p>
                  <p className="text-app font-medium">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' }) : "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-[color:var(--accent-ghost)] p-2 rounded-lg mr-3">
                  <svg className="w-5 h-5 text-[color:var(--accent)]" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-secondary text-sm">Account Status</p>
                  <p className="text-app font-medium">Active</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-[color:var(--accent-ghost)] p-2 rounded-lg mr-3">
                  <svg className="w-5 h-5 text-[color:var(--accent)]" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                    <path
                      fillRule="evenodd"
                      d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-secondary text-sm">Total Submissions</p>
                  <p className="text-app font-medium">{projectStats.total} {projectStats.total === 1 ? 'project' : 'projects'}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Projects Section */}
        <section className="mt-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-app flex items-center gap-3">
              <svg className="w-8 h-8 text-[color:var(--primary)]" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path
                  fillRule="evenodd"
                  d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                  clipRule="evenodd"
                />
              </svg>
              Your Submitted Projects
            </h2>
            {projects.length > 0 && (
              <button
                onClick={() => navigate("/project-submission")}
                className="px-4 py-2 bg-[color:var(--accent)] text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
              >
                Submit New Project
              </button>
            )}
          </div>
          
          {projects.length === 0 ? (
            <div className="bg-surface rounded-xl p-12 shadow-subtle text-center">
              <svg className="w-20 h-20 mx-auto text-secondary opacity-50 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-secondary text-lg mb-6">No projects submitted yet.</p>
              <button
                onClick={() => navigate("/project-submission")}
                className="btn-primary inline-flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Submit Your First Project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {safeProjects.map((p) => {
                const id = p._id || p.id || Math.random().toString(36).slice(2)
                const title = p.name || p.title || p.userName || "Untitled Project"
                const description = p.description || ""
                const status = p.status || "pending"
                const category = p.projectType || p.category || "other"
                const createdAt = p.submittedAt || p.createdAt
                return (
                  <article
                    key={id}
                    className="bg-surface rounded-xl p-6 shadow-soft hover:shadow-lift transition-all duration-300 border border-token"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-bold text-app flex-1 pr-2">{title}</h3>
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold rounded-full px-3 py-1 ${getStatusColor(status)}`}>
                        {getStatusIcon(status)}
                        {String(status).toUpperCase()}
                      </span>
                    </div>
                    
                    {description && (
                      <p className="text-secondary text-sm mb-4 line-clamp-2">{description}</p>
                    )}
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 text-[color:var(--primary)]" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="text-secondary capitalize">{category}</span>
                      </div>
                      
                      {createdAt && (
                        <div className="flex items-center gap-2 text-sm">
                          <svg className="w-4 h-4 text-[color:var(--accent)]" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span className="text-secondary">{new Date(createdAt).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default Profile
