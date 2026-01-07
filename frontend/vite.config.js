// vite.config.js (สำหรับ Localhost Development)
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // สำหรับ development localhost ใช้ base เป็น '/'
  // สำหรับ production เปลี่ยนเป็น '/requestonline/'
  const base = mode === 'production' ? '/requestonline/' : '/';
  
  return {
    base,
    plugins: [react()],
    server: {
      proxy: {
        '/api': { 
          target: 'http://localhost:5000/requestonlineapi', 
          // target: 'http://192.168.30.188/requestonlineapi',
          changeOrigin: true,
          // ไม่ต้อง rewrite เพราะ backend ต้องการ /api อยู่แล้ว
          // rewrite: (path) => path.replace(/^\/api/, ''),
        },
        // ✅ เพิ่ม proxy สำหรับ Socket.IO
        '/requestonlineapi': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          ws: true, // ✅ สำคัญ: ต้องเปิด WebSocket support
        }
      }
    }
  };
});
