require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Category = require("../models/Category");
const Student = require("../models/Student");
const ChatMessage = require("../models/Chat");
const AISetting = require("../models/AISetting");


const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB for seeding...");

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Category.deleteMany({}),
      Student.deleteMany({}),
      ChatMessage.deleteMany({}),
      AISetting.deleteMany({}),
    ]);
    console.log("Cleared existing data");

    // Create admin user
    const admin = await User.create({
      name: "Admin User",
      email: "admin@educrm.com",
      password: "admin123",
      role: "Administrator",
    });
    console.log("Admin user created: admin@educrm.com / admin123");

    // Create categories
    const categories = await Category.insertMany([
      { name: "Interested in Phase Course", description: "Parents/students who have shown interest in the phase course through initial inquiry", color: "bg-info/10 text-info border-info/20", order: 0 },
      { name: "Video Viewed", description: "Parents/students who have viewed the course introduction video", color: "bg-accent/10 text-accent border-accent/20", order: 1 },
      { name: "Payment Reminder Needed", description: "Students with upcoming or overdue payments that need reminders", color: "bg-warning/10 text-warning border-warning/20", order: 2 },
      { name: "Registered", description: "Students who have completed registration and are enrolled", color: "bg-success/10 text-success border-success/20", order: 3 },
      { name: "Bank Details Requested", description: "Students who have requested bank details for payment", color: "bg-destructive/10 text-destructive border-destructive/20", order: 4 },
    ]);
    console.log(`${categories.length} categories created`);

    const catMap = {};
    categories.forEach((c) => (catMap[c.name] = c._id));

    // Create students
    const students = await Student.insertMany([
      { name: "Priya Sharma", phone: "+91 98765 43210", email: "priya@email.com", category: catMap["Registered"], subject: "Mathematics", language: "Hindi", enrollmentMonth: "March 2026", firstClassDate: "2026-03-10", nextPaymentDate: "2026-04-10", lastInteraction: "2026-03-07" },
      { name: "Rahul Patel", phone: "+91 87654 32109", category: catMap["Interested in Phase Course"], subject: "Science", language: "English", enrollmentMonth: "March 2026", firstClassDate: "2026-03-15", nextPaymentDate: "2026-04-15", lastInteraction: "2026-03-06" },
      { name: "Anita Desai", phone: "+91 76543 21098", category: catMap["Video Viewed"], subject: "English", language: "Hindi", enrollmentMonth: "April 2026", firstClassDate: "2026-04-01", nextPaymentDate: "2026-05-01", lastInteraction: "2026-03-05" },
      { name: "Mohammed Ali", phone: "+91 65432 10987", category: catMap["Payment Reminder Needed"], subject: "Physics", language: "Urdu", enrollmentMonth: "February 2026", firstClassDate: "2026-02-15", nextPaymentDate: "2026-03-15", lastInteraction: "2026-03-04" },
      { name: "Sneha Gupta", phone: "+91 54321 09876", category: catMap["Bank Details Requested"], subject: "Chemistry", language: "English", enrollmentMonth: "March 2026", firstClassDate: "2026-03-12", nextPaymentDate: "2026-04-12", lastInteraction: "2026-03-07" },
      { name: "Vikram Singh", phone: "+91 43210 98765", category: catMap["Registered"], subject: "Biology", language: "Hindi", enrollmentMonth: "January 2026", firstClassDate: "2026-01-10", nextPaymentDate: "2026-03-10", lastInteraction: "2026-03-03" },
      { name: "Deepa Nair", phone: "+91 32109 87654", category: catMap["Interested in Phase Course"], subject: "Mathematics", language: "Malayalam", enrollmentMonth: "April 2026", firstClassDate: "2026-04-05", nextPaymentDate: "2026-05-05", lastInteraction: "2026-03-06" },
      { name: "Arjun Reddy", phone: "+91 21098 76543", category: catMap["Video Viewed"], subject: "Computer Science", language: "Telugu", enrollmentMonth: "March 2026", firstClassDate: "2026-03-20", nextPaymentDate: "2026-04-20", lastInteraction: "2026-03-02" },
      { name: "Kavita Joshi", phone: "+91 10987 65432", category: catMap["Payment Reminder Needed"], subject: "History", language: "Hindi", enrollmentMonth: "February 2026", firstClassDate: "2026-02-10", nextPaymentDate: "2026-03-10", lastInteraction: "2026-03-01" },
      { name: "Sanjay Kumar", phone: "+91 98712 34567", category: catMap["Registered"], subject: "Geography", language: "English", enrollmentMonth: "March 2026", firstClassDate: "2026-03-08", nextPaymentDate: "2026-04-08", lastInteraction: "2026-03-07" },
    ]);
    console.log(`${students.length} students created`);

    // Create student ID map by name
    const studentMap = {};
    students.forEach((s) => (studentMap[s.name] = s._id));

    // Create chat messages
    const chatMessages = await ChatMessage.insertMany([
      { studentId: studentMap["Priya Sharma"], studentName: "Priya Sharma", sender: "student", message: "Hi, I want to know about the Phase 2 course schedule.", timestamp: "2026-03-07T10:30:00", isHandoff: false },
      { studentId: studentMap["Priya Sharma"], studentName: "Priya Sharma", sender: "ai", message: "Hello Priya! The Phase 2 course starts on March 15th. Classes are held Mon-Fri from 4 PM to 6 PM. Would you like me to share the detailed syllabus?", timestamp: "2026-03-07T10:30:05", isHandoff: false },
      { studentId: studentMap["Priya Sharma"], studentName: "Priya Sharma", sender: "student", message: "Yes please, and what about the fees?", timestamp: "2026-03-07T10:31:00", isHandoff: false },
      { studentId: studentMap["Priya Sharma"], studentName: "Priya Sharma", sender: "ai", message: "Sure! I'm sending you the syllabus PDF now.\n\nRegarding fees:\n- Monthly: Rs.2,500\n- Quarterly: Rs.7,000 (save Rs.500)\n- Annual: Rs.25,000 (save Rs.5,000)\n\nWould you like our bank details for payment?", timestamp: "2026-03-07T10:31:10", isHandoff: false },
      { studentId: studentMap["Mohammed Ali"], studentName: "Mohammed Ali", sender: "student", message: "I haven't received my receipt yet for last month's payment.", timestamp: "2026-03-07T09:15:00", isHandoff: true },
      { studentId: studentMap["Mohammed Ali"], studentName: "Mohammed Ali", sender: "ai", message: "I understand your concern, Mohammed. Let me escalate this to our admin team for a quick resolution. A team member will reach out shortly.", timestamp: "2026-03-07T09:15:08", isHandoff: true },
      { studentId: studentMap["Rahul Patel"], studentName: "Rahul Patel", sender: "student", message: "Can you tell me about the Science batch timings?", timestamp: "2026-03-06T14:00:00", isHandoff: false },
      { studentId: studentMap["Rahul Patel"], studentName: "Rahul Patel", sender: "ai", message: "Hi Rahul! We have two Science batches:\n\nMorning: 9 AM - 11 AM\nEvening: 5 PM - 7 PM\n\nBoth batches cover the same curriculum. Which timing works best for you?", timestamp: "2026-03-06T14:00:07", isHandoff: false },
      { studentId: studentMap["Sneha Gupta"], studentName: "Sneha Gupta", sender: "student", message: "I want to pay but need bank details", timestamp: "2026-03-07T11:00:00", isHandoff: false },
      { studentId: studentMap["Sneha Gupta"], studentName: "Sneha Gupta", sender: "ai", message: "Here are our bank details:\n\nBank: State Bank of India\nAccount: Institute of Excellence\nA/C No: 1234567890\nIFSC: SBIN0001234\n\nPlease share the transaction screenshot after payment for confirmation.", timestamp: "2026-03-07T11:00:12", isHandoff: false },
    ]);
    console.log(`${chatMessages.length} chat messages created`);

    // Create default AI settings
    await AISetting.create({});
    console.log("Default AI settings created");

    console.log("\nSeed completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Seed error:", error);
    process.exit(1);
  }
};

seedData();
