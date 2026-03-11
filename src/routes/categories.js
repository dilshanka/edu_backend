const express = require("express");
const { body, validationResult } = require("express-validator");
const Category = require("../models/Category");
const Student = require("../models/Student");
const auth = require("../middleware/auth");

const router = express.Router();

// GET /api/categories
router.get("/", auth, async (req, res) => {
  try {
    const { search } = req.query;
    const filter = {};

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    const categories = await Category.find(filter).sort({ order: 1, createdAt: 1 });

    // Get student counts for each category
    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => {
        const studentCount = await Student.countDocuments({ category: cat._id });
        return { ...cat.toObject(), studentCount };
      })
    );

    res.json(categoriesWithCount);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/categories/:id
router.get("/:id", auth, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found" });

    const studentCount = await Student.countDocuments({ category: category._id });
    res.json({ ...category.toObject(), studentCount });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/categories
router.post(
  "/",
  auth,
  [body("name").trim().notEmpty().withMessage("Category name is required")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      const existing = await Category.findOne({ name: req.body.name });
      if (existing) {
        return res.status(400).json({ message: "Category with this name already exists" });
      }

      const maxOrder = await Category.findOne().sort({ order: -1 });
      const category = new Category({
        name: req.body.name,
        description: req.body.description || "",
        color: req.body.color || "bg-info/10 text-info border-info/20",
        order: maxOrder ? maxOrder.order + 1 : 0,
      });
      await category.save();

      res.status(201).json({ ...category.toObject(), studentCount: 0 });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  }
);

// PUT /api/categories/:id
router.put("/:id", auth, async (req, res) => {
  try {
    const { name, description, color } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (color !== undefined) updates.color = color;

    const category = await Category.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!category) return res.status(404).json({ message: "Category not found" });

    const studentCount = await Student.countDocuments({ category: category._id });
    res.json({ ...category.toObject(), studentCount });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Category with this name already exists" });
    }
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/categories/:id/reorder
router.put("/:id/reorder", auth, async (req, res) => {
  try {
    const { order } = req.body;
    const category = await Category.findByIdAndUpdate(req.params.id, { order }, { new: true });
    if (!category) return res.status(404).json({ message: "Category not found" });
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/categories/:id
router.delete("/:id", auth, async (req, res) => {
  try {
    const studentCount = await Student.countDocuments({ category: req.params.id });
    if (studentCount > 0) {
      return res.status(400).json({
        message: `Cannot delete category with ${studentCount} assigned student(s). Reassign them first.`,
      });
    }

    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found" });
    res.json({ message: "Category deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
