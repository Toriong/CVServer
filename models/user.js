const mongoose = require('mongoose');


const userSchema = {
    id: String,
    firstName: String,
    lastName: String,
    userName: String,
    password: String,
    belief: String,
    sex: String,
    reasonsToJoin: String,
    email: String,
    phoneNum: String,
    bio: String,
    topics: Array,
    socialMedia: Array,
    icon: String,
    blogPosts: String,
    isSignedIn: Boolean,
    isUserNew: Boolean,
    roughDrafts: Array
};

const User = mongoose.model("users", userSchema);

module.exports = User;

