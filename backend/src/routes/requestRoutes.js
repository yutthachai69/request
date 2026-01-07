// backend/src/routes/requestRoutes.js
const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
// ===== START: แก้ไขส่วนนี้ (เพิ่ม allowBulk) =====
const { protect, authorize, allowBulk } = require('../middleware/authMiddleware');
// ===== END: แก้ไขส่วนนี้ =====
const upload = require('../middleware/fileUpload');

router.use(protect);

router.route('/')
    .get(requestController.getRequests)
    .post(upload, requestController.createRequest);

// ===== START: เพิ่ม Route ใหม่ =====
router.route('/bulk-action').post(allowBulk, requestController.performBulkAction);
// ===== END: เพิ่ม Route ใหม่ =====

router.route('/export').get(requestController.exportRequests);

router.route('/history').get(requestController.getApprovalHistory);

router.route('/:id/correction-types').get(requestController.getRequestCorrectionTypes);

router.route('/:id/action').post(requestController.performAction);

router.route('/:id')
    .get(requestController.getRequestById)
    .put(upload, requestController.updateRequest)
    .delete(requestController.deleteRequest);

module.exports = router;