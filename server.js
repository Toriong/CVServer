require('dotenv').config();

const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const app = express();
const dbconnection = "mongodb+srv://gtorio:simba1997@clustercv.blvqa.mongodb.net/CVBlog"

app.use(cors())

app.use(express.json());

mongoose.connect(dbconnection, {
    useUnifiedTopology: true,
    useNewUrlParser: true
}).then(() => {
    console.log("connection to mongodb database is successful!")
});

app.use("/", require("./routes/blogposts"));

app.use("/", require("./routes/users"))

app.listen(3005, () => {
    console.log('users server started on 3005')
})
