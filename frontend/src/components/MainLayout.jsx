// frontend/src/components/MainLayout.jsx
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    AppBar, Toolbar, Typography, Box, Drawer, List, ListItem, ListItemButton,
    ListItemText, Divider, Menu, MenuItem, IconButton, Avatar, Tooltip,
    ListItemIcon, Chip, useMediaQuery, useTheme, Collapse, alpha
} from '@mui/material';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useCategories } from '../context/CategoryContext';
import NotificationBell from './NotificationBell';

import TsmLogo from '../assets/images/tsmlogo.png';

// Icons
import MenuIcon from '@mui/icons-material/Menu';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HomeIcon from '@mui/icons-material/Home';
import CategoryIcon from '@mui/icons-material/Category';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import ArticleIcon from '@mui/icons-material/Article';
import AccountBoxIcon from '@mui/icons-material/AccountBox';
import BarChartIcon from '@mui/icons-material/BarChart';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import EditNoteIcon from '@mui/icons-material/EditNote';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import BusinessIcon from '@mui/icons-material/Business';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import FindInPageIcon from '@mui/icons-material/FindInPage';

const drawerWidth = 250;

const adminMenuItems = [
    { text: 'จัดการผู้ใช้งาน', path: '/admin/users', icon: <PeopleIcon fontSize="small" /> },
    { text: 'จัดการสิทธิ์ (Role)', path: '/admin/roles', icon: <ManageAccountsIcon fontSize="small" /> },
    { text: 'ตั้งค่า Workflow', path: '/admin/workflows', icon: <AccountTreeIcon fontSize="small" /> },
    { text: 'จัดการ Email Templates', path: '/admin/email-templates', icon: <MailOutlineIcon fontSize="small" /> },
    { text: 'จัดการประเภทการแก้ไข', path: '/admin/correction-types', icon: <EditNoteIcon fontSize="small" /> },
    { text: 'จัดการเหตุผลการแก้ไข', path: '/admin/correction-reasons', icon: <QuestionAnswerIcon fontSize="small" /> },
    { text: 'จัดการสถานะ', path: '/admin/statuses', icon: <PlaylistAddCheckIcon fontSize="small" /> },
    { text: 'จัดการแผนก', path: '/admin/departments', icon: <BusinessIcon fontSize="small" /> },
    { text: 'จัดการหมวดหมู่', path: '/admin/categories', icon: <SettingsIcon fontSize="small" /> },
    { text: 'จัดการสถานที่', path: '/admin/locations', icon: <LocationCityIcon fontSize="small" /> },
    { text: 'ตั้งค่าเลขที่เอกสาร', path: '/admin/doc-config', icon: <ArticleIcon fontSize="small" /> },
    { text: 'ประวัติการใช้งาน (Log)', path: '/admin/audit-logs', icon: <FindInPageIcon fontSize="small" /> },
    { text: 'รายงานประวัติการแก้ไข', path: '/admin/audit-report', icon: <BarChartIcon fontSize="small" /> },
];

const MainLayout = ({ children }) => {
    const { user, logout } = useAuth();
    const { categories } = useCategories();

    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const [open, setOpen] = React.useState(!isMobile);
    const [anchorElUser, setAnchorElUser] = React.useState(null);
    const [adminMenuOpen, setAdminMenuOpen] = React.useState(false);

    // --- START: Define root pages where the back button should be hidden ---
    const rootPages = ['/', '/admin/users'];
    // --- END: Define root pages ---

    const handleDrawerToggle = () => setOpen(!open);
    const handleDrawerClose = () => setOpen(false);
    const handleOpenUserMenu = (event) => setAnchorElUser(event.currentTarget);
    const handleCloseUserMenu = () => setAnchorElUser(null);
    const handleAdminMenuClick = () => setAdminMenuOpen(!adminMenuOpen);

    const handleNavigate = (path) => {
        handleCloseUserMenu();
        if (isMobile) handleDrawerClose();
        navigate(path);
    };

    const handleLogout = () => {
        handleCloseUserMenu();
        logout();
    };

    const getRoleChip = (roleName) => {
        let props = { label: roleName || 'Unknown', size: 'small' };
        switch (roleName) {
            case 'Admin':
                props.color = 'error';
                break;
            case 'Head of Department':
                props.color = 'primary';
                break;
            case 'IT Reviewer':
                props.color = 'info';
                break;
            case 'Accountant':
                props.color = 'secondary';
                break;
            default:
                props.color = 'default';
        }
        return <Chip {...props} />;
    };

    const NavItem = ({ to, icon, text }) => {
        const selected = location.pathname.startsWith(to) && to !== '/';
        const isHome = to === '/' && location.pathname === '/';
        const isActive = selected || isHome;

        return (
            <ListItem disablePadding sx={{ px: 2, py: 0.5 }}>
                <ListItemButton
                    component={motion.div}
                    whileHover={{ x: 4 }}
                    selected={isActive}
                    onClick={() => handleNavigate(to)}
                    sx={{ 
                        borderRadius: '12px',
                        mb: 0.5,
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        background: isActive 
                            ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.15)} 0%, ${alpha(theme.palette.primary.main, 0.08)} 100%)`
                            : 'transparent',
                        border: isActive ? `1px solid ${alpha(theme.palette.primary.main, 0.3)}` : '1px solid transparent',
                        '&:hover': {
                            background: isActive 
                                ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.2)} 0%, ${alpha(theme.palette.primary.main, 0.12)} 100%)`
                                : `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.primary.main, 0.04)} 100%)`,
                            borderColor: alpha(theme.palette.primary.main, 0.3),
                            transform: 'translateX(4px)',
                        },
                        '&.Mui-selected': {
                            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.15)} 0%, ${alpha(theme.palette.primary.main, 0.08)} 100%)`,
                            borderColor: alpha(theme.palette.primary.main, 0.3),
                            '&:hover': {
                                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.2)} 0%, ${alpha(theme.palette.primary.main, 0.12)} 100%)`,
                            }
                        }
                    }}
                >
                    <ListItemIcon sx={{ 
                        color: isActive ? theme.palette.primary.main : 'text.secondary',
                        minWidth: 40,
                        transition: 'color 0.3s ease'
                    }}>
                        {icon}
                    </ListItemIcon>
                    <ListItemText 
                        primary={text} 
                        primaryTypographyProps={{ 
                            style: { 
                                fontSize: '0.9rem',
                                fontWeight: isActive ? 600 : 500,
                                color: isActive ? theme.palette.primary.main : 'inherit'
                            } 
                        }} 
                    />
                </ListItemButton>
            </ListItem>
        );
    };

    const drawerContent = (
        <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100%', 
            background: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.primary.main, 0.02)} 50%, #ffffff 100%)`,
            borderRight: `1px solid ${alpha(theme.palette.divider, 0.5)}`
        }}>
            <Box 
                component={motion.div}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                sx={{
                    p: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, transparent 100%)`,
                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`
                }}
            >
                <Box 
                    component={motion.div}
                    whileHover={{ scale: 1.05 }}
                    sx={{ 
                        width: 120, 
                        height: 'auto', 
                        mb: 1.5,
                        p: 1,
                        borderRadius: 2,
                        background: 'white',
                        boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.15)}`
                    }}
                >
                    <img
                        src={TsmLogo}
                        alt="Company Logo"
                        style={{
                            width: '100%',
                            height: 'auto',
                            objectFit: 'contain'
                        }}
                    />
                </Box>
                <Typography 
                    variant="subtitle1" 
                    sx={{ 
                        color: 'text.primary', 
                        textAlign: 'center', 
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}
                >
                    ระบบขอแก้ไขข้อมูลออนไลน์
                </Typography>
            </Box>

            <Box 
                component={motion.div}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                sx={{
                    px: 2,
                    py: 2,
                    borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                    textAlign: 'center',
                    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, transparent 100%)`
                }}
            >
                <Avatar 
                    sx={{ 
                        width: 56, 
                        height: 56, 
                        mx: 'auto', 
                        mb: 1.5,
                        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                        boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                        fontSize: '1.5rem',
                        fontWeight: 700
                    }}
                >
                    {user.fullName.charAt(0).toUpperCase()}
                </Avatar>
                <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }} noWrap>{user.fullName}</Typography>
                {getRoleChip(user.roleName)}
            </Box>

            <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
                <List>
                    <NavItem to="/" icon={<HomeIcon />} text="หน้าแรก" />
                    {(user.roleName === 'Admin' || user.roleName === 'Head of Department') && (
                        <NavItem to="/report" icon={<BarChartIcon />} text="รายงาน" />
                    )}
                </List>
                <Divider sx={{ mx: 2, my: 1 }} />
                <List>
                    <Typography variant="caption" sx={{ pl: 4, color: 'text.secondary', fontWeight: 'bold' }}>หมวดหมู่</Typography>
                    {categories.map((cat) => (
                        <NavItem key={cat.CategoryID} to={`/category/${cat.CategoryID}`} icon={<CategoryIcon />} text={cat.CategoryName} />
                    ))}
                </List>
            </Box>

            <Box>
                {user.roleName === 'Admin' && (
                    <List>
                        <ListItem disablePadding sx={{ px: 2, py: 0.25 }}>
                            <ListItemButton onClick={handleAdminMenuClick} sx={{ borderRadius: '8px' }}>
                                <ListItemIcon><SettingsIcon /></ListItemIcon>
                                <ListItemText primary="ผู้ดูแลระบบ" primaryTypographyProps={{ style: { fontSize: '0.9rem' } }} />
                                {adminMenuOpen ? <ExpandLess /> : <ExpandMore />}
                            </ListItemButton>
                        </ListItem>
                        <Collapse in={adminMenuOpen} timeout="auto" unmountOnExit>
                            <List component="div" disablePadding>
                                {adminMenuItems.map(item => <NavItem key={item.text} to={item.path} icon={item.icon} text={item.text} />)}
                            </List>
                        </Collapse>
                    </List>
                )}
                <Divider sx={{ mx: 2 }} />
                <List>
                    <ListItem disablePadding sx={{ px: 2, py: 1 }}>
                        <ListItemButton onClick={handleLogout} sx={{ borderRadius: '8px' }}>
                            <ListItemIcon><LogoutIcon /></ListItemIcon>
                            <ListItemText primary="ออกจากระบบ" primaryTypographyProps={{ style: { fontSize: '0.9rem' } }} />
                        </ListItemButton>
                    </ListItem>
                </List>
            </Box>
        </Box>
    );

    if (!user) return null;

    return (
        <Box sx={{ display: 'flex' }}>
            <AppBar 
                position="fixed" 
                sx={{ 
                    zIndex: (theme) => isMobile ? theme.zIndex.drawer + 1 : theme.zIndex.drawer - 1, 
                    backgroundColor: 'white', 
                    color: 'text.primary', 
                    boxShadow: `0 2px 8px ${alpha(theme.palette.common.black, 0.08)}`, 
                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                    backdropFilter: 'blur(10px)',
                }}
            >
                <Toolbar>
                    <IconButton 
                        color="inherit" 
                        aria-label="open drawer" 
                        edge="start" 
                        onClick={handleDrawerToggle} 
                        sx={{ 
                            mr: 2,
                            '&:hover': {
                                background: alpha(theme.palette.primary.main, 0.08),
                            }
                        }}
                    >
                        <MenuIcon />
                    </IconButton>

                    {/* ===== START: โค้ดที่แก้ไข (ปรับปรุงเงื่อนไข) ===== */}
                    {!rootPages.includes(location.pathname) && (
                        <Tooltip title="ย้อนกลับ">
                            <IconButton 
                                color="inherit" 
                                onClick={() => navigate(-1)} 
                                sx={{ 
                                    mr: 1,
                                    '&:hover': {
                                        background: alpha(theme.palette.primary.main, 0.08),
                                    }
                                }}
                            >
                                <ArrowBackIcon />
                            </IconButton>
                        </Tooltip>
                    )}
                    {/* ===== END: โค้ดที่แก้ไข ===== */}

                    <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
                    </Typography>
                    <NotificationBell />
                    <Box sx={{ flexGrow: 0, ml: 1 }}>
                        <Tooltip title="เปิดเมนูผู้ใช้">
                            <IconButton 
                                onClick={handleOpenUserMenu} 
                                sx={{ 
                                    p: 0,
                                    '&:hover': {
                                        transform: 'scale(1.05)',
                                    },
                                    transition: 'transform 0.2s ease'
                                }}
                            >
                                <Avatar 
                                    sx={{ 
                                        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                                        boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                                        fontWeight: 700
                                    }}
                                >
                                    {user.fullName.charAt(0).toUpperCase()}
                                </Avatar>
                            </IconButton>
                        </Tooltip>
                        <Menu 
                            sx={{ 
                                mt: '45px',
                                '& .MuiPaper-root': {
                                    borderRadius: 2,
                                    boxShadow: `0 8px 24px ${alpha(theme.palette.common.black, 0.15)}`,
                                    border: `1px solid ${alpha(theme.palette.divider, 0.5)}`
                                }
                            }} 
                            anchorEl={anchorElUser} 
                            anchorOrigin={{ vertical: 'top', horizontal: 'right' }} 
                            keepMounted 
                            transformOrigin={{ vertical: 'top', horizontal: 'right' }} 
                            open={Boolean(anchorElUser)} 
                            onClose={handleCloseUserMenu}
                        >
                            <MenuItem disabled>
                                <Typography textAlign="center" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                    {user.fullName}
                                </Typography>
                            </MenuItem>
                            <Divider />
                            <MenuItem 
                                onClick={() => handleNavigate('/profile')}
                                sx={{
                                    '&:hover': {
                                        background: alpha(theme.palette.primary.main, 0.08),
                                    }
                                }}
                            >
                                <ListItemIcon><AccountBoxIcon fontSize="small" /></ListItemIcon>
                                <Typography>โปรไฟล์</Typography>
                            </MenuItem>
                            <MenuItem 
                                onClick={handleLogout}
                                sx={{
                                    '&:hover': {
                                        background: alpha(theme.palette.error.main, 0.08),
                                    }
                                }}
                            >
                                <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
                                <Typography>ออกจากระบบ</Typography>
                            </MenuItem>
                        </Menu>
                    </Box>
                </Toolbar>
            </AppBar>

            <Drawer variant={isMobile ? "temporary" : "permanent"} open={open} onClose={handleDrawerClose} ModalProps={{ keepMounted: true }}
                sx={{
                    width: drawerWidth, flexShrink: 0,
                    '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box', borderRight: 'none' },
                }}>
                {drawerContent}
            </Drawer>

            <Box 
                component="main" 
                sx={{ 
                    flexGrow: 1, 
                    p: { xs: 2, sm: 3 }, 
                    bgcolor: '#F9FAFB', 
                    minHeight: '100vh',
                    background: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.02)} 0%, #F9FAFB 100%)`
                }}
            >
                <Toolbar />
                {children}
            </Box>
        </Box>
    );
};

export default MainLayout;