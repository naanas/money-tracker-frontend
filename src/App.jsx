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
import MainLayout from './components/MainLayout'; // [BARU] Layout baru

function App() {
  return (
    <Routes>
      {/* Rute Publik (Login & Register) */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* [MODIFIKASI] Rute Privat sekarang menggunakan MainLayout */}
      <Route
        path="/"
        element={
          <PrivateRoute>
            <MainLayout />
          </PrivateRoute>
        }
      >
        {/* Rute default (Dashboard) */}
        <Route index element={<Dashboard />} /> 
        <Route path="dashboard" element={<Dashboard />} />
        
        {/* [BARU] Rute untuk fitur baru */}
        <Route path="accounts" element={<Accounts />} />
        <Route path="reports" element={<Reports />} />
      </Route>
      
    </Routes>
  );
}

export default App;