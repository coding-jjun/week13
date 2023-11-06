const mongoose = require("mongoose");
const { v4: uuidv4, v4 } = require('uuid');

const commentSchema = new mongoose.Schema({
    commentId: {
        type: String,
        required: true,
        unique: true,
        default: uuidv4
    },
    postId: {
        type: String,
        required: true
    },
    commentAuthor: {
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

module.exports = mongoose.model("Comment", commentSchema);