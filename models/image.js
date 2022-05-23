const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
    image: String
});

//Image is a model which has a schema imageSchema

const Image = mongoose.model('Image', imageSchema);

module.exports = Image;

