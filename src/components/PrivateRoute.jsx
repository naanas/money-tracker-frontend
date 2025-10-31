import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>; // Atau tampilkan spinner
  }

  if (!user) {
    // Jika tidak ada user, redirect ke halaman login
    return <Navigate to="/login" replace />;
  }

  // Jika ada user, tampilkan halaman yang diminta
  return children;
};

export default PrivateRoute;