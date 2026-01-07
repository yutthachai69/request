// backend/src/controllers/roleController.js
const Admin = require('../models/adminModel');
const asyncHandler = require('../utils/asyncHandler');

exports.getTabsForRole = asyncHandler(async (req, res) => {
    // req.user.RoleID จะถูกส่งมาจาก middleware `protect`
    const roleId = req.user.RoleID;
    if (!roleId) {
        res.status(403);
        throw new Error('User role is not defined.');
    }
    const tabs = await Admin.getTabsForRole(roleId);
    res.json(tabs);
});