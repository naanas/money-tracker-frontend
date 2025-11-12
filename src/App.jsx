import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AuthCallback from './pages/AuthCallback';
import PrivateRoute from './components/PrivateRoute';
import AuthLayout from './components/AuthLayout';
import Accounts from './pages/Accounts';
import Reports from './pages/Reports';
import MainLayout from './components/MainLayout';
import ResetPassword from './pages/ResetPassword';

// [BARU] Impor halaman baru
import Budget from './pages/Budget';
import Savings from './pages/Savings';

function App() {
  return (
    <Routes>
      {/* Rute Publik (Login, Register, Reset Password) */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Route>

      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* Rute Privat (Dashboard, Akun, Laporan) */}
      <Route
        path="/"
        element={
          <PrivateRoute>
            <MainLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} /> 
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="accounts" element={<Accounts />} />
        <Route path="reports" element={<Reports />} />
        {/* [BARU] Tambahkan rute untuk Budget dan Savings */}
        <Route path="budget" element={<Budget />} />
        <Route path="savings" element={<Savings />} />
      </Route>
      
    </Routes>
  );
}

export default App;