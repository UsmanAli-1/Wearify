const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const upload = require("../middleware/upload");
const axios = require("axios");
const FormData = require("form-data");
const mongoose = require("mongoose");
const User = require("../models/User");

const aiGarmentSchema = new mongoose.Schema(
  {
    filename: String,
    gender: String,
    color: String,
    imagePath: String,
  },
  { collection: "aigarments" },
);

const AIGarment =
  mongoose.models.AIGarment || mongoose.model("AIGarment", aiGarmentSchema);

router.post("/suggest", auth, upload.single("image"), async (req, res) => {
  try {
    const COST = 40;
    const { gender } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "No image uploaded" });
    }

    if (!gender || !["male", "female"].includes(gender)) {
      return res.status(400).json({ message: "Invalid gender" });
    }

    // ── Step 1: Check points ──
    const user = await User.findById(req.user.id);
    if (user.points < COST) {
      return res.status(400).json({ message: "Not enough points" });
    }

    // ── Step 2: Validate full body ──
    // const validationForm = new FormData();
    // validationForm.append("file", req.file.buffer, {
    //   filename: "image.jpg",
    //   contentType: req.file.mimetype,
    // });

    // let validationResult;
    // try {
    //   const validationRes = await axios.post(
    //     `${process.env.AI_VALIDATION_URL}/check-full-body`,
    //     validationForm,
    //     { headers: validationForm.getHeaders(), timeout: 30000 }
    //   );
    //   validationResult = validationRes.data;
    //   console.log("✅ Validation result:", validationResult);
    // } catch (err) {
    //   console.warn("⚠️ Validation service unavailable — skipping");
    //   validationResult = { isFullBody: true };
    // }

    // if (!validationResult.isFullBody) {
    //   return res.status(400).json({
    //     message: "Please upload a clear full-body photo",
    //     reason: validationResult.reason,
    //   });
    // }

    // ── Step 3: Get skin tone ──
    const skinForm = new FormData();
    skinForm.append("file", req.file.buffer, {
      filename: "image.jpg",
      contentType: req.file.mimetype,
    });
    skinForm.append("gender", gender);

    console.log(
      "🎨 Calling suggestion model at:",
      process.env.SUGGESTION_MODEL_URL,
    );

    let skinTone;
    let suggestedColors;

    try {
      const skinRes = await axios.post(
        `${process.env.SUGGESTION_MODEL_URL}/suggest-outfits`,
        skinForm,
        { headers: skinForm.getHeaders(), timeout: 60000 },
      );

      if (skinRes.data.success === false) {
        return res.status(400).json({
          message:
            skinRes.data.message ||
            "Image rejected. Please upload a clear photo.",
          reason: skinRes.data.reason,
        });
      }

      skinTone = skinRes.data.skin_tone;
      suggestedColors = skinRes.data.suggested_colors;
      console.log("✅ Skin tone detected:", skinTone);
      console.log("✅ Suggested colors:", suggestedColors);
    } catch (err) {
      console.error("❌ Suggestion model failed:", err.message);
      return res.status(503).json({
        message: "Skin tone analysis unavailable. Please try again.",
      });
    }

    // ── Step 4: Query MongoDB ──
    console.log(
      "🔍 Querying aigarments — gender:",
      gender,
      "colors:",
      suggestedColors,
    );

    const garments = await AIGarment.aggregate([
      { $match: { gender, color: { $in: suggestedColors } } },
      { $sample: { size: 4 } },
    ]);

    console.log(`👗 Found ${garments.length} garments`);
    garments.forEach((g) => console.log(`   → ${g.filename} (${g.color})`));

    // ── Step 5: Deduct points ──
    user.points -= COST;
    await user.save();
    console.log(`💎 Points deducted. Remaining: ${user.points}`);

    return res.json({
      skin_tone: skinTone,
      suggested_colors: suggestedColors,
      suggestions: garments.map((g) => ({
        _id: g._id,
        name: g.filename,
        imagePath: g.imagePath,
        color: g.color,
      })),
      points: user.points,
      pointsExhausted: user.points < COST,
    });
  } catch (err) {
    console.error("🔥 Suggestion error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
