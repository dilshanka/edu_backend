const express = require("express");
const Student = require("../models/Student");
const Category = require("../models/Category");
const ChatMessage = require("../models/Chat");
const auth = require("../middleware/auth");

const router = express.Router();

// GET /api/dashboard/statistics
router.get("/statistics", auth, async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();

    // Get "Registered" category count
    const registeredCat = await Category.findOne({ name: "Registered" });
    const registeredStudents = registeredCat
      ? await Student.countDocuments({ category: registeredCat._id })
      : 0;

    // Active chats - unique students who chatted in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const activeChats = await ChatMessage.distinct("studentId", {
      timestamp: { $gte: sevenDaysAgo.toISOString() },
    });

    // Handoff alerts
    const handoffAlerts = await ChatMessage.countDocuments({ isHandoff: true });

    res.json({
      totalStudents,
      registeredStudents,
      activeChats: activeChats.length,
      handoffAlerts,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/dashboard/weekly-activity
router.get("/weekly-activity", auth, async (req, res) => {
  try {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1);

    const activity = await Promise.all(
      days.map(async (day, index) => {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + index);
        const dateStr = date.toISOString().split("T")[0];

        const chats = await ChatMessage.countDocuments({
          timestamp: { $regex: `^${dateStr}` },
        });

        const registrations = await Student.countDocuments({
          createdAt: {
            $gte: new Date(dateStr),
            $lt: new Date(new Date(dateStr).getTime() + 86400000),
          },
        });

        return { day, chats, registrations };
      })
    );

    res.json(activity);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/dashboard/category-distribution
router.get("/category-distribution", auth, async (req, res) => {
  try {
    const categories = await Category.find().sort({ order: 1 });
    const distribution = await Promise.all(
      categories.map(async (cat) => ({
        name: cat.name,
        value: await Student.countDocuments({ category: cat._id }),
        color: cat.color,
      }))
    );

    res.json(distribution);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/dashboard/enrollment-trends
router.get("/enrollment-trends", auth, async (req, res) => {
  try {
    const months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleString("default", { month: "short" });
      const year = date.getFullYear();
      const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);

      const count = await Student.countDocuments({
        createdAt: { $gte: date, $lt: nextMonth },
      });

      months.push({ month: `${monthName} ${year}`, students: count });
    }

    res.json(months);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
