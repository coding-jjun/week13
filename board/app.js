const express = require('express');
const app = express();
const port = 5000;

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.listen(port, () => {
    console.log(port, '포트로 서버가 열렸어요!');
});

app.use(express.json());

const postRouter = require("./routes/posts");
const commentRouter = require("./routes/comments");
const userRouter = require("./routes/user");

// localhost:3000/api -> goodsRouter
app.use("/api", [postRouter, commentRouter, userRouter]);

const connect = require("./schemas");
connect();