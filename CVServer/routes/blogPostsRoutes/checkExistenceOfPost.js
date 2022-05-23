
const BlogPost = require("../../models/blogPost");
const router = require("../users");




router.route("/checkExistencePost/:package").get((req, res) => {
    const package = JSON.parse(req.params.package)
    const { postId } = package;
    // GOAL: check if the post exist
    BlogPost.findOne({ _id: postId }).countDocuments().then(doesPostExist => {
        console.log('doesPostExist: ', doesPostExist);
        res.json(!!doesPostExist)
    })
}, error => {
    if (error) {
        console.error('An error has occurred: ', error)
    }
})

module.exports = router;