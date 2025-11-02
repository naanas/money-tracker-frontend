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
// [BARU] Impor halaman baru
import Profile from './pages/Profile'; 

function App() {
  return (
    <Routes>
      {/* Rute Publik (Login & Register) */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* Rute Privat */}
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
        
        {/* [RUTE BARU] */}
        <Route path="profile" element={<Profile />} />
      </Route>
      
    </Routes>
  );
}

export default App;