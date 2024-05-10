const express = require("express");
require("dotenv").config();
const app = express();
const Port = process.env.PORT || 8000;
const cors = require("cors");

const connection = require('./Config/db');
const { universityRouter } = require("./Routers/University");

app.use(express.json());
app.use(cors());
app.use("/university", universityRouter);

app.get("/", (req, res) => {
    res.status(200).send({ message: "Welcome to the backend of University Dashboard" });
});

app.listen(Port, async () => {
    try {
        await connection;
        console.log("Server is connected to DB");
        console.log(`App is listening to the port ${Port}`);
    } catch (error) {
        console.log(error);
    }
});
