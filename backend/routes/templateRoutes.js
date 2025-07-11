const express = require('express');
const router = express.Router();
const templateControllers = require('../controllers/templateControllers');
const verifyTokens = require('../middleware/verifyTokens');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// Template routes
router.post('/', verifyTokens, templateControllers.saveTemplate);
router.get('/', verifyTokens, templateControllers.getUserTemplates);
router.get('/:templateId', verifyTokens, templateControllers.getTemplate);
router.put('/:templateId', verifyTokens, templateControllers.updateTemplate);
router.delete('/:templateId', verifyTokens, templateControllers.deleteTemplate);
router.post('/upload-image', verifyTokens, upload.single('image'), templateControllers.uploadImage);
router.post('/upload-image-direct', verifyTokens, templateControllers.uploadImageDirect);


module.exports = router;