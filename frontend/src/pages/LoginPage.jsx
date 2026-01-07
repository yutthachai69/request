// src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { Container, Paper, TextField, Button, Typography, Box, Alert, CircularProgress, IconButton, InputAdornment, Fade } from '@mui/material';
import { Login as LoginIcon, Visibility, VisibilityOff, Lock, Person } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [shake, setShake] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    setError('');

    // ✅ ถ้ากรอกไม่ครบ ให้สั่น
    if (!username || !password) {
      setShake(true);
      setTimeout(() => setShake(false), 500); // หยุดสั่นหลังจาก 0.5 วินาที
      return;
    }

    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err.response?.data?.message || 'การเข้าสู่ระบบล้มเหลว กรุณาตรวจสอบข้อมูล');
      setShake(true); // ✅ สั่นเมื่อล็อกอินไม่สำเร็จด้วย (Optional)
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
        py: 4,
        // ✅ Shake animation (เก็บไว้สำหรับ error)
        '@keyframes shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-10px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(10px)' },
        },
        '@keyframes slideIn': {
          from: { opacity: 0, transform: 'translateY(-20px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
      }}
    >
      <Container component="main" maxWidth="xs">
          <Paper
            elevation={0}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: { xs: 4, sm: 5 },
              borderRadius: 3,
              background: '#ffffff',
              border: '1px solid #eeeeee',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
              animation: shake ? 'shake 0.5s ease-in-out' : 'none',
              transition: 'all 0.3s ease',
            }}
          >
            {/* ✅ Icon */}
            <Box
              sx={{
                width: 70,
                height: 70,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2,
                boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)',
              }}
            >
              <LoginIcon sx={{ fontSize: 35, color: 'white' }} />
            </Box>

            <Typography
              component="h1"
              variant="h5"
              sx={{
                fontWeight: 600,
                color: '#333',
                mb: 1,
                textAlign: 'center',
                width: '100%'
              }}
            >
              ระบบแจ้งขอแก้ไขข้อมูลออนไลน์
            </Typography>

            <Box component="form" onSubmit={handleLogin} noValidate sx={{ width: '100%' }}>
              <Fade in={!!error} timeout={300}>
                <Box>
                  {error && (
                    <Alert 
                      severity="error" 
                      sx={{ 
                        width: '100%', 
                        mb: 2, 
                        borderRadius: 2,
                        animation: 'slideIn 0.3s ease',
                      }}
                    >
                      {error}
                    </Alert>
                  )}
                </Box>
              </Fade>

              <TextField
                  margin="normal"
                  fullWidth
                  id="username"
                  label="ชื่อผู้ใช้"
                  name="username"
                  autoComplete="username"
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={() => setFocusedField('username')}
                  onBlur={() => setFocusedField(null)}
                  error={submitted && !username}
                  helperText={submitted && !username ? "กรุณากรอกชื่อผู้ใช้" : ""}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person 
                          sx={{ 
                            color: focusedField === 'username' ? '#667eea' : 'action.disabled',
                            transition: 'color 0.3s ease',
                          }} 
                        />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ 
                    '& .MuiOutlinedInput-root': { 
                      borderRadius: 2,
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.15)',
                      },
                      '&.Mui-focused': {
                        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.25)',
                      },
                    },
                  }}
                />

              <TextField
                  margin="normal"
                  fullWidth
                  name="password"
                  label="รหัสผ่าน"
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  error={submitted && !password}
                  helperText={submitted && !password ? "กรุณากรอกรหัสผ่าน" : ""}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock 
                          sx={{ 
                            color: focusedField === 'password' ? '#667eea' : 'action.disabled',
                            transition: 'color 0.3s ease',
                          }} 
                        />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          sx={{ color: 'action.active' }}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{ 
                    '& .MuiOutlinedInput-root': { 
                      borderRadius: 2,
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.15)',
                      },
                      '&.Mui-focused': {
                        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.25)',
                      },
                    },
                  }}
                />

              {/* ✅ Enhanced Login Button */}
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                sx={{
                  mt: 3,
                  mb: 2,
                  py: 1.5,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  fontWeight: 600,
                  textTransform: 'none',
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                  },
                }}
              >
                {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'เข้าสู่ระบบ'}
              </Button>
            </Box>
          </Paper>
      </Container>
    </Box>
  );
};

export default LoginPage;