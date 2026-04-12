import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider, useAuth } from "./context/AuthContext"
import Login from "./pages/Login"
import EvalPage from "./pages/EvalPage"
import ProdPage from "./pages/ProdPage"
import BoardPage from "./pages/BoardPage"
import QuizPage from "./pages/QuizPage"
import RankingPage from "./pages/RankingPage"

function PrivateRoute({ children }) {
  const { token } = useAuth()
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/eval"    element={<PrivateRoute><EvalPage /></PrivateRoute>} />
          <Route path="/prod"    element={<PrivateRoute><ProdPage /></PrivateRoute>} />
          <Route path="/board"   element={<PrivateRoute><BoardPage /></PrivateRoute>} />
          <Route path="/quiz"    element={<PrivateRoute><QuizPage /></PrivateRoute>} />
          <Route path="/ranking" element={<PrivateRoute><RankingPage /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
