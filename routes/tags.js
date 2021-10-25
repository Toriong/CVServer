const express = require('express');
const router = express.Router();
const Tag = require("../models/tag");

// GOAL: send all of the tags in the database to the user when the user is creating a blog post in the component WriteBlogPost

router.route("/tags").get((req, res) => {
    console.log("getting all tags");
    Tag.find()
        .then(tag => res.json(tag))
})

router.route("/tags/:package").get((req, res) => {
    console.log("getting all tag names");
    const { package } = req.params;
    const { name } = JSON.parse(package);
    if (name === "getTagNames") {
        Tag.find({}, { description: 0 })
            .then(tags => {
                res.json(tags)
            });
    };
})


// what does module.exports doing?
module.exports = router