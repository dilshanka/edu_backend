const express = require("express");
const { body, validationResult } = require("express-validator");
const Student = require("../models/Student");
const auth = require("../middleware/auth");

const router = express.Router();


// GET /api/students
router.get("/", auth, async (req, res) => {
  try {
    const { category, search, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (category && category !== "all") {
      filter.category = category;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const total = await Student.countDocuments(filter);
    const students = await Student.find(filter)
      .populate("category", "name color")
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ students, total, page: Number(page), totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/students/:id
router.get("/:id", auth, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).populate("category", "name color");
    if (!student) return res.status(404).json({ message: "Student not found" });
    res.json(student);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/students
router.post(
  "/",
  auth,
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("phone").trim().notEmpty().withMessage("Phone is required"),
    body("category").notEmpty().withMessage("Category is required"),
    body("subject").trim().notEmpty().withMessage("Subject is required"),
    body("language").trim().notEmpty().withMessage("Language is required"),
    body("enrollmentMonth").notEmpty().withMessage("Enrollment month is required"),
    body("firstClassDate").notEmpty().withMessage("First class date is required"),
    body("nextPaymentDate").notEmpty().withMessage("Next payment date is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      const student = new Student({
        ...req.body,
        lastInteraction: new Date().toISOString().split("T")[0],
      });
      await student.save();
      await student.populate("category", "name color");

      res.status(201).json(student);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  }
);

// PUT /api/students/:id
router.put("/:id", auth, async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate(
      "category",
      "name color"
    );
    if (!student) return res.status(404).json({ message: "Student not found" });
    res.json(student);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/students/:id
router.delete("/:id", auth, async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });
    res.json({ message: "Student deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
