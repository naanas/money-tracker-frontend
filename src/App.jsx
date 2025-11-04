import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AuthCallback from './pages/AuthCallback';
import PrivateRoute from './components/PrivateRoute';
import AuthLayout from './components/AuthLayout';

// [BARU] Impor halaman baru
import Accounts from './pages/Accounts';
import Reports from './pages/Reports';
import MainLayout from './components/MainLayout';
// [BARU] Impor halaman ResetPassword
import ResetPassword from './pages/ResetPassword';

function App() {
  return (
    <Routes>
      {/* Rute Publik (Login, Register, Reset Password) */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        {/* [BARU] Tambahkan rute untuk reset password di sini */}
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
      </Route>
      
    </Routes>
  );
}

export default App;