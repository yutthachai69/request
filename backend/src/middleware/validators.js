// backend/src/middleware/validators.js
const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

exports.validateRegisterUser = [
    body('username', 'Username is required').notEmpty(),
    body('password', 'Password must be at least 6 characters long').isLength({ min: 6 }),
    body('fullName', 'Full name is required').notEmpty(),
    handleValidationErrors
];

exports.validateCreateRequest = [
    body('categoryId', 'Category is required').isInt({ min: 1 }),
    body('requestDate', 'Invalid date format').isISO8601(),
    body('problemDetail', 'Problem detail cannot be empty').notEmpty(),
    handleValidationErrors
];

exports.validateApproveRequest = [
    body('comment').optional({ checkFalsy: true }).isString().withMessage('Comment must be a string'),
    handleValidationErrors
];

exports.validateCloseRequest = [
    body('operatorName', 'Operator name is required').notEmpty(),
    body('completedAt', 'Invalid completion date').isISO8601(),
    handleValidationErrors
];

exports.validateRejectRequest = [
    body('rejectionReason', 'Rejection reason is required').notEmpty(),
    handleValidationErrors
];

exports.validateChangePassword = [
    body('oldPassword', 'Old password is required').notEmpty(),
    body('newPassword', 'New password must be at least 6 characters long').isLength({ min: 6 }),
    handleValidationErrors
];