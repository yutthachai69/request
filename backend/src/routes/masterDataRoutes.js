// backend/src/routes/masterDataRoutes.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { 
    getCategories, 
    getLocations, 
    getPermittedCategories,
    getStatuses,
    createCategory, 
    updateCategory, 
    deleteCategory,
    createLocation,
    updateLocation,
    deleteLocation,
    updateStatus,
    getCorrectionTypes,
    getCorrectionReasons,
    getDepartments,      
    createDepartment,    
    updateDepartment,
    deleteDepartment,
    getWorkflowPreview,
    getCategoryMappingsForLocation
} = require('../controllers/masterDataController');

// --- Public / User Level Routes ---
router.get('/statuses', protect, getStatuses);
router.get('/locations', protect, getLocations);
router.get('/my-categories', protect, getPermittedCategories);
router.get('/correction-types', protect, getCorrectionTypes);
router.get('/correction-reasons', protect, getCorrectionReasons);
router.get('/workflow-preview', protect, getWorkflowPreview);

// --- Category Routes (Admin POST/PUT/DELETE) ---
router.route('/categories')
    .get(protect, getCategories)
    .post(protect, authorize('Admin'), createCategory);
router.route('/categories/:id')
    .put(protect, authorize('Admin'), updateCategory)
    .delete(protect, authorize('Admin'), deleteCategory);

// --- Location Routes (Admin POST/PUT/DELETE) ---
router.route('/locations')
    .post(protect, authorize('Admin'), createLocation);
router.route('/locations/:id')
    .put(protect, authorize('Admin'), updateLocation)
    .delete(protect, authorize('Admin'), deleteLocation);
router.route('/locations/:id/categories')
    .get(protect, authorize('Admin'), getCategoryMappingsForLocation);
    
// --- Department Routes (Admin POST/PUT/DELETE) ---
router.route('/departments')
    .get(protect, getDepartments)
    .post(protect, authorize('Admin'), createDepartment);
router.route('/departments/:id')
    .put(protect, authorize('Admin'), updateDepartment)
    .delete(protect, authorize('Admin'), deleteDepartment);

// --- Admin Only Routes for Statuses ---
router.route('/statuses/:id')
    .put(protect, authorize('Admin'), updateStatus);

module.exports = router;