const mongoose = require('mongoose');

const tagSchema = {
    id: String,
    tag: String,
    description: String
};

const Tag = mongoose.model('tag', tagSchema);

module.exports = Tag;


