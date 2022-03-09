require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const app = express();
const dbconnection = "mongodb+srv://gtorio:simba1997@clustercv.blvqa.mongodb.net/CVBlog"
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');


// will create temporary files on my server
const multiparty = require('connect-multiparty');

// this will enable the front-end to upload files/images to the server
const multipartyMiddleware = multiparty({ uploadDir: './writingPostImageUploads' });

// fix this bodyParser
app.use(bodyParser.json({ limit: "1000mb" }));
app.use(bodyParser.urlencoded({ limit: "1000mb", extended: true, parameterLimit: 500000 }));
app.use(express.urlencoded({ extended: true }));

app.get('/', (request, response) => {
    response.status(200).json({
        message: "Server is live!"
    })
})

// what does cors do? 
app.use(cors());

app.use(express.json());

// store all of the static files (in this case, images) into /writingPostImageUploads







mongoose.connect(dbconnection, {
    useUnifiedTopology: true,
    useNewUrlParser: true
}).then(() => {
    console.log("connection to mongodb database is successful!")
}).catch(error => {
    console.log(`Error in connecting to DB: ${error}`)
});







// conn.once('open',)

app.use("/", require("./routes/blogPosts"));

app.use("/", require("./routes/users"));

app.use("/", require("./routes/tags"));

app.use("/", require("./routes/blogPostsRoutes/getAllBlogPosts"))

app.use("/", require("./routes/deleteUser"))



app.use("/userIcons", express.static("userIcons"));
app.use("/postIntroPics", express.static("postIntroPics"))
app.use(express.static("writingPostImageUploads"));
// upload and present the image that the user uploads to the text editor
app.post("/writePostImages", multipartyMiddleware, (req, res) => {
    console.log("req.files.upload", req.files.upload);
    const imageTempFile = req.files.upload;
    const imageTempFilePath = imageTempFile.path
    // 'path' module provides utilities for working with file and directory paths
    console.log("path: ", path);
    const targetPathUrl = path.join(__dirname, `./writingPostImageUploads/${imageTempFile.name}`);
    // if (path.extname(imageTempFile.originalFilename).toLowerCase() === ".png" || ".jpg") {

    res.status(200).json({
        uploaded: true,

        //able to save the save the images, but the title, subtitle, and the intro pic gets deleted
        url: `http://localhost:3005/${imageTempFile.originalFilename}`
        // url: `${imageTempFile.originalFilename}`
    })
    // fs = a module that allows the user to access and interact with the file systems
    // relocated the uploaded image into /writingPostImageUploads file
    fs.rename(imageTempFilePath, targetPathUrl, err => { console.log(`Error message: ${err}`) })
    // fs.open(targetPathUrl, err => { console.log(`Error message: ${err}`) })
    // }
});










app.listen(3005, () => {
    console.log('server listening on 3005')
})
