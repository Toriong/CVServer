require('dotenv').config();

const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const app = express();
const dbconnection = "mongodb+srv://gtorio:simba1997@clustercv.blvqa.mongodb.net/CVBlog"
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

// will create temporary files on my server and will never clean them up
const multiparty = require('connect-multiparty');

// this will enable the front-end to upload files/images to the server
const multipartyMiddleware = multiparty({ upload: './writingPostImageUploads' });

app.use(bodyParser.json({ limit: "1000mb" }));
app.use(bodyParser.urlencoded({ limit: "1000mb", extended: true, parameterLimit: 500000 }));

app.get('/', (request, response) => {
    response.status(200).json({
        message: "Server is live!"
    })
})

// what does cors do? 
app.use(cors());

app.use(express.json());

// store all of the static files (in this case, images) into /writingPostImageUploads
app.use(express.static("writingPostImageUploads"));

mongoose.connect(dbconnection, {
    useUnifiedTopology: true,
    useNewUrlParser: true
}).then(() => {
    console.log("connection to mongodb database is successful!")
});

app.use("/", require("./routes/blogPosts"));

app.use("/", require("./routes/users"));

app.use("/", require("./routes/tags"));

// upload and present the image that the user uploads to the text editor
app.post("/writePostImages", multipartyMiddleware, (req, res) => {

    const imageTempFile = req.files.upload;
    const imageTempFilePath = imageTempFile.path
    // console.log("imageTempFilePath", imageTempFilePath)
    console.log('imageTempFile.name', imageTempFile.name);

    // 'path' module provides utilities for working with file and directory paths
    const targetPathUrl = path.join(__dirname, `./writingPostImageUploads/${imageTempFile.name}`);
    console.log(targetPathUrl)
    if (path.extname(imageTempFile.originalFilename).toLowerCase() === ".png" || ".jpg") {
        console.log("I was executed");

        // what is url doing?
        console.log("imageTempFile.originalFilename", imageTempFile.originalFilename);
        res.status(200).json({
            uploaded: true,
            // how does the img src="" know that this is the url to use for its src attribute?
            url: imageTempFile.originalFilename
        })
        // fs = a module that allows the user to access and interact with the file systems
        // relocated the uploaded image into /writingPostImageUploads file
        fs.rename(imageTempFilePath, targetPathUrl, err => { err && console.log(`Error message: ${err}`) })
    }

    console.log(req.files);
})


app.listen(3005, () => {
    console.log('server listening on 3005')
})
