const mongoose = require("mongoose");
const { v4: uuidv4 } = require('uuid');

const postSchema = new mongoose.Schema({
    postId: {
        type: String,
        required: true,
        unique: true,
        default: uuidv4
    },
    postPw: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    postAuthor: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        default: Date.now,
        required: true
    },
    content: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model("Post", postSchema);