// backend/src/controllers/masterDataController.js
const MasterData = require('../models/masterDataModel');
const Department = require('../models/departmentModel');
const asyncHandler = require('../utils/asyncHandler');
const cache = require('../utils/cache');

exports.getCategories = asyncHandler(async (req, res) => {
    if (cache.has('categories')) {
        return res.json(cache.get('categories'));
    }
    const categories = await MasterData.getCategories();
    cache.set('categories', categories);
    res.json(categories);
});

exports.getLocations = asyncHandler(async (req, res) => {
    const { categoryId } = req.query;
    if (!categoryId && cache.has('locations')) {
        return res.json(cache.get('locations'));
    }
    const locations = await MasterData.getLocations(categoryId);
    if (!categoryId) {
        cache.set('locations', locations);
    }
    res.json(locations);
});

exports.getStatuses = asyncHandler(async (req, res) => {
    if (cache.has('statuses')) {
        return res.json(cache.get('statuses'));
    }
    const statuses = await MasterData.getStatuses();
    cache.set('statuses', statuses);
    res.json(statuses);
});

exports.getPermittedCategories = asyncHandler(async (req, res) => {
    const categories = await MasterData.getPermittedCategories(req.user.UserID);
    res.json(categories);
});

exports.getCorrectionTypes = asyncHandler(async (req, res) => {
    const { categoryId } = req.query;
    if (!categoryId && cache.has('correction_types_all')) {
        return res.json(cache.get('correction_types_all'));
    }

    const correctionTypes = await MasterData.getCorrectionTypes(categoryId || null);
    
    if (!categoryId) {
        cache.set('correction_types_all', correctionTypes);
    }

    res.json(correctionTypes);
});

exports.getCorrectionReasons = asyncHandler(async (req, res) => {
    if (cache.has('correction_reasons')) {
        return res.json(cache.get('correction_reasons'));
    }
    const reasons = await MasterData.getCorrectionReasons();
    cache.set('correction_reasons', reasons);
    res.json(reasons);
});

// --- Category ---
exports.createCategory = asyncHandler(async (req, res) => {
    const { name, requiresCCSClosing } = req.body;
    await MasterData.createCategory(name, requiresCCSClosing);
    cache.del('categories');
    res.status(201).json({ message: 'สร้างหมวดหมู่สำเร็จ' });
});

exports.updateCategory = asyncHandler(async (req, res) => {
    const { name, requiresCCSClosing } = req.body;
    await MasterData.updateCategory(req.params.id, name, requiresCCSClosing);
    cache.del('categories');
    res.status(200).json({ message: 'อัปเดตหมวดหมู่สำเร็จ' });
});

exports.deleteCategory = asyncHandler(async (req, res) => {
    await MasterData.deleteCategory(req.params.id);
    cache.del('categories');
    res.status(200).json({ message: 'ลบหมวดหมู่สำเร็จ' });
});

// --- Location ---
exports.createLocation = asyncHandler(async (req, res) => {
    const { LocationName, categoryIds } = req.body;
    if (!LocationName) {
        res.status(400);
        throw new Error('กรุณาระบุชื่อสถานที่');
    }
    await MasterData.createLocation(LocationName, categoryIds);
    cache.del('locations');
    res.status(201).json({ message: 'สร้างสถานที่สำเร็จ' });
});

exports.updateLocation = asyncHandler(async (req, res) => {
    const { LocationName, categoryIds } = req.body;
    if (!LocationName) {
        res.status(400);
        throw new Error('กรุณาระบุชื่อสถานที่');
    }
    await MasterData.updateLocation(req.params.id, LocationName, categoryIds);
    cache.del('locations');
    res.status(200).json({ message: 'อัปเดตสถานที่สำเร็จ' });
});

exports.deleteLocation = asyncHandler(async (req, res) => {
    await MasterData.deleteLocation(req.params.id);
    cache.del('locations');
    res.status(200).json({ message: 'ลบสถานที่สำเร็จ' });
});

exports.getCategoryMappingsForLocation = asyncHandler(async (req, res) => {
    const mappings = await MasterData.getCategoryMappingsForLocation(req.params.id);
    res.json(mappings);
});

// --- Status ---
exports.updateStatus = asyncHandler(async (req, res) => {
    const { name, colorCode } = req.body;
    await MasterData.updateStatus(req.params.id, { name, colorCode });
    cache.del('statuses');
    res.status(200).json({ message: 'อัปเดตสถานะสำเร็จ' });
});

// --- Department ---
exports.getDepartments = asyncHandler(async (req, res) => {
    const cacheKey = req.user.RoleName === 'Admin' ? 'departments_admin' : 'departments_user';
    if (cache.has(cacheKey)) {
        return res.json(cache.get(cacheKey));
    }
    const departments = req.user.RoleName === 'Admin' 
        ? await Department.getAllAdmin()
        : await Department.getAll();
    cache.set(cacheKey, departments);
    res.json(departments);
});

exports.createDepartment = asyncHandler(async (req, res) => {
    await Department.create(req.body.departmentName);
    cache.del(['departments_admin', 'departments_user']);
    res.status(201).json({ message: 'สร้างแผนกสำเร็จ' });
});

exports.updateDepartment = asyncHandler(async (req, res) => {
    await Department.update(req.params.id, req.body);
    cache.del(['departments_admin', 'departments_user']);
    res.status(200).json({ message: 'อัปเดตแผนกสำเร็จ' });
});

exports.deleteDepartment = asyncHandler(async (req, res) => {
    await Department.delete(req.params.id);
    cache.del(['departments_admin', 'departments_user']);
    res.status(200).json({ message: 'ลบแผนกสำเร็จ' });
});

// --- Workflow ---
exports.getWorkflowPreview = asyncHandler(async (req, res) => {
    const { categoryId, correctionTypeIds } = req.query;
    if (!categoryId) {
        return res.status(400).json({ message: 'กรุณาระบุ Category ID' });
    }
    const typeIdsArray = correctionTypeIds ? correctionTypeIds.split(',').map(id => parseInt(id, 10)) : [];
    const workflow = await MasterData.getWorkflowPreview({
        categoryId: parseInt(categoryId, 10),
        correctionTypeIds: typeIdsArray
    });
    res.json(workflow);
});