
const Media = require('../models/media');


const uploadMedia = async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).send("Không có file.");
  try {
    const img = await Media.create({
      name: file.originalname,
      data: file.buffer.toString('base64'),
      mimetype: file.mimetype,
      status: "INACTIVE",
    });

    res.status(201).json({ message: "Đã lưu ảnh!", id: img.id });
  } catch (err) {
    res.status(500).send("Lỗi server khi lưu ảnh.");
  }
};

const getMedia = async (req, res) => {
  try {
    const image = await Media.findByPk(req.params.id);
    if (!image) return res.status(404).send("Ảnh không tồn tại.");

    if (image.status !== "ACTIVE") {
      image.status = "ACTIVE";
      await image.save();
    }
    const base64 = image.data.toString("base64");
    const mimeType = image.mimetype;
    const dataUrl = `data:${mimeType};base64,${base64}`;
    return res.status(200).json({
      id: image.id,
      name: image.name,
      imageUrl: dataUrl,
    });
  } catch (err) {
    res.status(500).send("Lỗi khi lấy ảnh.");
  }
};
module.exports = {
  uploadMedia,
  getMedia,
};
