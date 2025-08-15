const brandController = require('../controllers/brandController');
const express = require('express');

router = express.Router();

router.get('/', brandController.getAllBrand);
router.get('/:id', brandController.getBrandByPk);
router.post('/', brandController.createBrand);
router.put('/sort', brandController.sortBrand);
router.put('/:id', brandController.updateBrand);


module.exports = router;
