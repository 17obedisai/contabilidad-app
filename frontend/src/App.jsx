import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { Toaster } from "sonner"
import { AuthProvider, useAuth } from "./context/AuthContext"
import Login from "./pages/Login"
import EvalPage from "./pages/EvalPage"
import ProdPage from "./pages/ProdPage"
import BoardPage from "./pages/BoardPage"
import QuizPage from "./pages/QuizPage"
import RankingPage from "./pages/RankingPage"
import TeamPage from "./pages/TeamPage"

function PrivateRoute({ children }) {
  const { token } = useAuth()
  return token ? children : <Navigate to="/login" replace />
}

function AdminRoute({ children }) {
  const { token, user } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  if (!user?.isCont) return <Navigate to="/eval" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              fontFamily: "'Segoe UI', system-ui, sans-serif",
              fontSize: 14,
              borderRadius: 12,
            },
          }}
          richColors
        />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/eval"    element={<PrivateRoute><EvalPage /></PrivateRoute>} />
          <Route path="/prod"    element={<PrivateRoute><ProdPage /></PrivateRoute>} />
          <Route path="/board"   element={<PrivateRoute><BoardPage /></PrivateRoute>} />
          <Route path="/quiz"    element={<PrivateRoute><QuizPage /></PrivateRoute>} />
          <Route path="/ranking" element={<PrivateRoute><RankingPage /></PrivateRoute>} />
          <Route path="/team"    element={<AdminRoute><TeamPage /></AdminRoute>} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
