const brandController = require('../controllers/brandController');
const express = require('express');

router = express.Router();

router.get("/", brandController.getAllBrandForUser);



module.exports = router;
