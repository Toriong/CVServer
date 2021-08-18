require('dotenv').config();

const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const app = express();
const dbconnection = "mongodb+srv://gtorio:simba1997@clustercv.blvqa.mongodb.net/CVBlog"
const bodyParser = require('body-parser');

// will create temporary files on my server and will never clean them up
const multiparty = require('connect-multiparty');

// this will enable the front-end to upload files/images to the server
const multipartyMiddleware = multiparty({ upload: './images' });

app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true, parameterLimit: 50000 }));

app.get('/', (request, response) => {
    response.status(200).json({
        message: "Server is live!"
    })
})

// what does cors do? 
app.use(cors());

app.use(express.json());

mongoose.connect(dbconnection, {
    useUnifiedTopology: true,
    useNewUrlParser: true
}).then(() => {
    console.log("connection to mongodb database is successful!")
});

app.use("/", require("./routes/blogposts"));

app.use("/", require("./routes/users"));

// upload and present the image that the user uploads to the text editor
app.post("/writePostImages", multipartyMiddleware, (req, res) => {
    console.log(req.files.upload)
})


app.listen(3005, () => {
    console.log('server listening on 3005')
})
