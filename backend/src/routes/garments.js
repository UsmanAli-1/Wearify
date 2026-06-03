const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const Garment = require("../models/Garment");
const cloudinary = require("../config/cloudinary");

const uploadToCloudinary = (buffer, folder) =>
  new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder }, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      })
      .end(buffer);
  });

router.post("/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image uploaded" });
    }

    const uploaded = await uploadToCloudinary(req.file.buffer, "wearify/garments");

    const garment = await Garment.create({
      name: req.body.name || "Garment",
      imagePath: uploaded.secure_url,
    });

    console.log("✅ Garment uploaded:", garment.imagePath);
    res.json({ message: "Garment uploaded", garment });
  } catch (err) {
    console.error("🔥 FULL ERROR:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const garments = await Garment.find().sort({ createdAt: -1 });
    res.status(200).json(garments);
  } catch (err) {
    console.error("❌ GET /api/garments ERROR:", err);
    res.status(500).json({ message: "Failed to fetch garments" });
  }
});

module.exports = router;
