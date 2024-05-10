const express = require("express");
require("dotenv").config();
const saltRounds = parseInt(process.env.saltrounds) || 10;
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { BlacklistModel } = require("../Models/Blacklist");
const Student = require("../Models/Student");
const Mark = require("../Models/Mark");
const Subject = require("../Models/Subject");
const { auth } = require("../Middleware/auth.middleware");

const universityRouter = express.Router();

universityRouter.post("/register", async (req, res) => {
  console.log(req.body);
  const { username, email, password, field } = req.body;

  try {
    if (!email || !username || !password || !field) {
      res.status(400).send({ message: "Input fields are required!" });
    } else {
      const existingUser = await Student.findOne({ email });

      if (existingUser) {
        res.status(409).send({ message: "User with this Email Already Exists!" });
      } else {
        bcrypt.hash(password, saltRounds, async function (err, hash) {
          if (err) {
            console.log(err.message);
            res.status(500).send({ message: "An Error Occurred", error: err });
          } else {
            // Generate rollnumber based on timestamp
            const rollnumber = Date.now().toString().substr(-6); // Using last 6 digits of current timestamp

            const student = new Student({
              username,
              email,
              password: hash, // Use the hashed password
              rollnumber,
              field,
            });

            // Automatically select subjects based on field
            const subjects = await Subject.find({ field });

            // Assign subjects to the student
            student.subjects = subjects.map((subject) => subject._id);

            // Save student to database
            await student.save();

            // Create marks for each subject
            for (const subject of subjects) {
              const mark = new Mark({
                student: student._id,
                subject: subject._id,
                marks: 0, // Initialize marks to 0
              });
              await mark.save();
            }

            res.status(201).send({ message: "User created successfully!" });
          }
        });
      }
    }
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: "Internal Server Error", error: err.message });
  }
});





universityRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).send({ message: "All input fields are required!" });
    } else {
      // Check if it's admin login
      if (email === "admin@gmail.com" && password === "admin@123") {
        // Hardcoded token for admin
        
        const adminToken = jwt.sign({ userType: "admin" }, process.env.SecretKey );
        res.status(200).send({ message: "Admin logged in successfully!", token: adminToken ,userType: "admin@123"});
      } else {
        // Regular user login
        const user = await Student.findOne({ email });

        if (!user) {
          res.status(404).send({ message: "User does not exist!" });
        } else {
          const passwordMatch = await bcrypt.compare(password, user.password);

          if (passwordMatch) {
            const token = jwt.sign({ userId: user._id, username: user.username }, process.env.SecretKey, { expiresIn: 5 * 60 });
            res.status(200).send({ message: "Login successful!", token, userId: user._id });
          } else {
            res.status(401).send({ message: "Incorrect password!" });
          }
        }
      }
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Internal Server Error", error: err.message });
  }
});


universityRouter.get("/logout", async (req, res) => {
  const token = req.headers.authorization;
  // console.log(token,"tojh");
  try {
    if (token) {
      // Revoke the token by adding it to the blacklist
      await BlacklistModel.findOneAndUpdate({}, { $addToSet: { blacklist: token } }, { upsert: true });
      res.status(200).json({ message: "User has been logged out" });
    } else {
      // If no token is provided, send an error response
      res.status(400).json({ error: "Token is not provided" });
    }
  } catch (error) {
    // Handle any errors that occur during the process
    res.status(500).json({ error: error.message });
  }
});


universityRouter.get("/:userID", auth, async (req, res) => {
  try {
    const userID = req.params.userID;
    const loggedInUserID = req.body.userId;
    console.log

    // Check if the requested user ID matches the ID of the logged-in user
    if (userID !== loggedInUserID) {
      return res.status(403).send({ message: "Access denied! You are not authorized to view this data." });
    }

    const student = await Student.findById(userID).populate('subjects');
    if (!student) {
      return res.status(404).send({ message: "Student not found!" });
    }

    const subjectsWithMarks = [];
    for (const subject of student.subjects) {
      const marks = await Mark.find({ student: userID, subject: subject._id });
    
      subjectsWithMarks.push({ subject: subject.name, marks:marks[0].marks });
    }

    res.status(200).send({ message: "Student data retrieved successfully!", student, subjectsWithMarks });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Internal Server Error", error: err.message });
  }
});


universityRouter.get("/", auth, async (req, res) => {
  try {
    if (req.userType === "admin") {
      // If admin, fetch all student data
      const students = await Student.find().populate('subjects');
      const studentsWithMarks = [];

      // Iterate over each student
      for (const student of students) {
        const subjectsWithMarks = [];

        // Fetch marks for each subject of the student
        for (const subject of student.subjects) {
          const marks = await Mark.findOne({ student: student._id, subject: subject._id });
          subjectsWithMarks.push({ subject: subject.name, marks: marks ? marks.marks : null, subjectI: subject._id });
        }

        studentsWithMarks.push({
          _id: student._id,
          username: student.username,
          email: student.email,
          rollnumber: student.rollnumber,
          field: student.field,
          subjectsWithMarks
        });
      }

      res.status(200).send({ message: "All student data retrieved successfully!", students: studentsWithMarks });
    } else {
      res.status(403).send({ message: "Access denied! Insufficient privileges." });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Internal Server Error", error: err.message });
  }
});

universityRouter.get("/admin/:id", auth, async (req, res) => {
  try {
    // Check if the user is an admin
    if (req.userType !== "admin") {
      return res.status(403).send({ message: "Access denied! Insufficient privileges." });
    }

    // Get the student ID from the request parameters
    const studentId = req.params.id;

    // Find the student by ID and populate the 'subjects' field along with marks
    const student = await Student.findById(studentId).populate('subjects');

    // If the student is not found, return a 404 error
    if (!student) {
      return res.status(404).send({ message: "Student not found!" });
    }

    // Fetch marks for each subject of the student
    const subjectsWithMarks = [];
    for (const subject of student.subjects) {
      const mark = await Mark.findOne({ student: studentId, subject: subject._id });
      subjectsWithMarks.push({ subject: subject.name, marks: mark ? mark.marks : null });
    }

    // Return the student details along with subjects and marks
    res.status(200).send({ message: "Student details retrieved successfully!", student, subjectsWithMarks });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Internal Server Error", error: err.message });
  }
});

universityRouter.patch("/admin/:userId", auth, async (req, res) => {
  try {
    if (req.userType !== "admin") {
      return res.status(403).send({ message: "Access denied! Insufficient privileges." });
    }

    const userIdToUpdate = req.params.userId;
    const { name, username, email, password } = req.body;

    const updateFields = {};
    if (name) updateFields.name = name;
    if (username) updateFields.username = username;
    if (email) updateFields.email = email;
    if (password) {
      updateFields.password = await bcrypt.hash(password, saltRounds);
    }

    const updatedUser = await Student.findByIdAndUpdate(userIdToUpdate, updateFields, { new: true });

    if (!updatedUser) {
      res.status(404).send({ message: "User not found!" });
    } else {
      res.status(200).send({ message: "User updated successfully!", user: updatedUser });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Internal Server Error", error: err.message });
  }
});


universityRouter.patch("/admin/marks/:studentId/:subjectId", auth, async (req, res) => {
  try {
    // Check if the user is an admin
    if (req.userType !== "admin") {
      return res.status(403).send({ message: "Access denied! Insufficient privileges." });
    }

    // Extract student ID and subject ID from request parameters
    const { studentId, subjectId } = req.params;

    // Find the student by ID
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).send({ message: "Student not found!" });
    }

    // Check if the subject exists for the student
    const subjectExists = student.subjects.includes(subjectId);
    if (!subjectExists) {
      return res.status(404).send({ message: "Subject not found for the student!" });
    }


    // Check if marks field is present in the request body
    if (!req.body.marks) {
      return res.status(400).send({ message: "Marks field is required!" });
    }

    // Update marks for the subject
    const updatedMark = await Mark.findOneAndUpdate(
      { student: studentId, subject: subjectId },
      { marks: req.body.marks },
      { new: true }
    );

    if (!updatedMark) {
      return res.status(404).send({ message: "Marks not updated!" });
    }

    res.status(200).send({ message: "Marks updated successfully!", updatedMark });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Internal Server Error", error: err.message });
  }
});



universityRouter.patch("/admin/marks/:studentId", auth, async (req, res) => {
  try {
    // Check if the user is an admin
    if (req.userType !== "admin") {
      return res.status(403).send({ message: "Access denied! Insufficient privileges." });
    }

    // Extract student ID from request parameters
    const { studentId } = req.params;

    // Find the student by ID
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).send({ message: "Student not found!" });
    }

    // Check if marks field is present in the request body
    if (!req.body.subjects || !Array.isArray(req.body.subjects)) {
      return res.status(400).send({ message: "Subjects array is required!" });
    }

    // Update marks for each subject
    const updatedMarks = [];
    for (const subject of req.body.subjects) {
      const { subjectId, marks } = subject;

      // Check if the subject exists for the student
      const subjectExists = student.subjects.includes(subjectId);
      if (!subjectExists) {
        updatedMarks.push({ subjectId, marks: null, message: "Subject not found for the student!" });
      } else {
        // Update marks for the subject
        const updatedMark = await Mark.findOneAndUpdate(
          { student: studentId, subject: subjectId },
          { marks },
          { new: true }
        );
        updatedMarks.push({ subjectId, marks: updatedMark ? updatedMark.marks : null, message: updatedMark ? "Marks updated successfully!" : "Marks not updated!" });
      }
    }

    res.status(200).send({ message: "Marks updated for all subjects!", updatedMarks });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Internal Server Error", error: err.message });
  }
});



module.exports = {
  universityRouter,
};
