const mongoose = require("mongoose");

const imageSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  imagePath: {
    type: String,
    required: true,
  },
  pointsUsed: {
    type: Number,
    default: 40,
  },
    status: {
    type: String,
    default: "uploaded", // later: processing, done
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Image", imageSchema);
