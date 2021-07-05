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
    phoneNum: String
};

const User = mongoose.model("users", userSchema);

module.exports = User;

