const express = require("express");
const multer = require("multer");
const uploadController = require("../controllers/mediaController");

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload", upload.single("image"), uploadController.uploadMedia);

router.get("/:id", uploadController.getMedia);
router.get("/download/:id", uploadController.downloadMedia);

module.exports = router;
