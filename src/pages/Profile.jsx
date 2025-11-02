import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axiosClient from '../api/axiosClient';

const Profile = () => {
  const { profile, refetchProfile, triggerSuccessAnimation } = useAuth();
  
  // State untuk Form Profil
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileMessage, setProfileMessage] = useState('');

  // State untuk Form Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordMessage, setPasswordMessage] = useState(''); // [BARU]

  // Isi form saat profil dimuat
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setEmail(profile.email || '');
    }
  }, [profile]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileError('');
    setProfileMessage('');

    try {
      const res = await axiosClient.put('/api/auth/profile', {
        email: email,
        full_name: fullName
      });
      await refetchProfile(); // Ambil ulang data profil yang baru
      triggerSuccessAnimation();
      setProfileMessage(res.data.message || 'Profil berhasil diperbarui!');
    } catch (err) {
      setProfileError(err.response?.data?.error || 'Gagal memperbarui profil');
    }
    setProfileLoading(false);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordError('');
    setPasswordMessage(''); // [BARU]

    if (newPassword.length < 8) {
      setPasswordError("Password minimal 8 karakter.");
      setPasswordLoading(false);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Password baru dan konfirmasi tidak cocok.");
      setPasswordLoading(false);
      return;
    }

    try {
      const res = await axiosClient.put('/api/auth/password', {
        password: newPassword
      });
      triggerSuccessAnimation();
      setPasswordMessage(res.data.message || 'Password berhasil diperbarui!'); // [BARU]
      setNewPassword(''); // Kosongkan form
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err.response?.data?.error || 'Gagal memperbarui password');
    }
    setPasswordLoading(false);
  };

  if (!profile) {
    return <div className="page-spinner-container"><div className="page-spinner"></div></div>;
  }

  return (
    <div className="profile-page">
      <h2>Profil Saya</h2>
      <p>Kelola informasi akun dan keamanan Anda.</p>

      {/* Form 1: Edit Profil */}
      <form onSubmit={handleProfileSubmit} className="card profile-form">
        <h3>Informasi Profil</h3>
        
        {profileMessage && <p className="success">{profileMessage}</p>}
        {profileError && <p className="error">{profileError}</p>}

        <div className="form-group">
          <label>Nama Lengkap</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nama lengkap Anda"
          />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@anda.com"
            required
          />
        </div>
        <button type="submit" disabled={profileLoading} style={{width: 'auto', padding: '0.75rem 2rem'}}>
          {profileLoading ? <div className="btn-spinner"></div> : 'Simpan Profil'}
        </button>
      </form>

      {/* Form 2: Ganti Password */}
      <form onSubmit={handlePasswordSubmit} className="card profile-form">
        <h3>Ganti Password</h3>

        {passwordMessage && <p className="success">{passwordMessage}</p>} {/* [BARU] */}
        {passwordError && <p className="error">{passwordError}</p>}
        
        <div className="form-group">
          <label>Password Baru</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Minimal 8 karakter"
          />
        </div>
        <div className="form-group">
          <label>Konfirmasi Password Baru</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Ketik ulang password baru"
          />
        </div>
        <button type="submit" disabled={passwordLoading} style={{width: 'auto', padding: '0.75rem 2rem'}}>
          {passwordLoading ? <div className="btn-spinner"></div> : 'Ganti Password'}
        </button>
      </form>
    </div>
  );
};

export default Profile;