const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Post = require("../schemas/post");
const Comment = require("../schemas/comment");

// JWT 검증 미들웨어
const authenticateToken = (req, res, next) => {
    // 클라이언트가 보낸 요청 헤더에서 토큰을 가져온다.
    const authHeader = req.headers['authorization'];
    // 토큰은 "Bearer TOKEN_VALUE" 형태로 오기 때문에 공백을 기준으로 분리된다.
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token == null) {
        // 토큰이 없으면 로그인 페이지로 리다이렉트합니다.
        return res.status(401).json({ message: "로그인이 필요합니다", redirectUrl: "/login" });
    }

    // 토큰을 검증합니다.
    jwt.verify(token, 'secretKey', (err, user) => {
        if (err) {
            return res.status(403).json({ message: "토큰이 유효하지 않습니다", redirectUrl: "/login" });
        }
        req.user = user;
        next();
    });
};

// 전체 게시글 조회
router.get("/post", async(req, res) => {
    try {
        const posts = await Post.find({ isActive: true })
            .select('title postAuthor date -_id') // _id 필드를 제외하고, title, postAuthor, date 필드만 선택합니다.
            .sort('-date'); // 작성 날짜(date) 기준 내림차순으로 정렬합니다.
        res.status(200).json( posts );
    } catch (error) {
        res.status(500).json({ message: "Error retrieving posts", error: error });
    }
});

// 게시글 작성 API
router.post('/post', authenticateToken, async (req, res) => {
    const { title, content } = req.body;
    const userId = req.user.id;

    try {
        // create 메소드를 사용하여 새 게시글 문서를 생성하고 저장합니다.
        const newPost = await Post.create({
            title,
            postAuthor: userId,
            content
            // postId는 기본값으로 UUID가 설정되어 있습니다.
        });

        res.status(201).json({
            message: "New post created successfully",
            postId: newPost.postId, // 생성된 문서의 postId(UUID)를 반환합니다.
            data: newPost
        });
    } catch (error) {
        res.status(500).json({ message: "Error creating new post", error: error });
    }
});

// 게시글 조희 API
router.get("/post/:postId", async (req, res) => {
    const { postId } = req.params; // URL로부터 postId를 추출합니다.

    try {
        // findOne 메서드를 사용하여 단일 문서를 조회합니다.
        const post = await Post.findOne({ postId: postId, isActive: true })
            .select('title postAuthor date content -_id');

        if (!post) {
            return res.status(404).json({ message: "게시글을 찾을 수 없습니다." });
        }

        res.status(200).json(post); // 조회된 게시글을 반환합니다.
    } catch (error) {
        res.status(500).json({ message: "Error retrieving the post", error: error });
    }
});

// 게시글 수정 API
router.put("/post/:postId", authenticateToken, async (req, res) => {
    const { postId } = req.params;
    const userId = req.user.id;
    const { content } = req.body;

    try {
        const existPost = await Post.findOne({ postId : postId, isActive: true });
        if (!existPost) {
            return res.status(400).json({ errorMessage: "존재하지 않는 게시글입니다."});
        } 
        if (existPost.postAuthor !== userId) {
            return res.status(403).json({ errorMessage: "본인이 작성한 게시글만 수정할 수 있습니다."});
        }

        await Post.findOneAndUpdate({ postId: postId }, { $set: { content: content } });
        res.json({ success: true });              
    } catch (error) {
        res.status(500).json({ errorMessage: "게시글 수정 중 오류가 발생했습니다.", error: error});
    }
});

// 게시글 숨김 API
router.patch("/post/:postId", authenticateToken, async (req, res) => {
    const { postId } = req.params;
    const userId = req.user.id;

    try {
        const post = await Post.findOne({ postId: postId, isActive: true, isHidden: false });
        if (!post) {
            return res.status(400).json({ errorMessage: "존재하지 않는 게시물입니다."})
        }
        if (existPost.postAuthor !== userId) {
            return res.status(403).json({ errorMessage: "본인이 작성한 게시글만 숨길 수 있습니다."});
        }

        await Post.updateOne({ postId: postId }, { $set: { isHidden: true }});
        await Comment.updateMany({ postId: postId }, { $set: { isHidden: true }});
        res.json({ result: "success" });
    } catch (error) {
        res.status(500).json({ errorMessage: "게시글 숨김 중 오류가 발생했습니다.", error: error});
    }
});

// 게시글 복원 API
router.patch("/post/:postId", authenticateToken, async (req, res) => {
    const { postId } = req.params;
    const userId = req.user.id;

    try {
        const post = await Post.findOne({ postId: postId, isActive: true, isHidden: true });
        if (!post) {
            return res.status(400).json({ errorMessage: "존재하지 않는 게시물입니다."})
        }
        if (existPost.postAuthor !== userId) {
            return res.status(403).json({ errorMessage: "본인이 작성한 게시글만 복원할 수 있습니다."});
        }

        await Post.updateOne({ postId: postId }, { $set: { isHidden: false }});
        await Comment.updateMany({ postId: postId }, { $set: { isHidden: false } });
        res.json({ result: "success" });
    } catch (error) {
        res.status(500).json({ errorMessage: "게시글 복원 중 오류가 발생했습니다.", error: error});
    }
});


// 게시글 삭제 API
router.delete("/post/:postId", authenticateToken, async (req, res) => {
    const { postId } = req.params;
    const userId = req.user.id;

    try {
        const existPost = await Post.findOne({ postId: postId, isActive: true });
        if (!existPost) {
            return res.status(400).json({ errorMessage: "존재하지 않는 게시물입니다."});
        }
        if (existPost.postAuthor !== userId) {
            return res.status(403).json({ errorMessage: "본인이 작성한 게시물만 삭제할 수 있습니다."});
        }

        await Post.deleteOne({ postId: postId });
        res.json({ result: "success" });    
    } catch (error) {
        res.status(500).json({ errorMessage: "게시물 삭제 중 오류가 발생했습니다.", error: error});
    }
});

module.exports = router;