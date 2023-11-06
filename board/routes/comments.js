const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
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
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: "토큰이 유효하지 않습니다", redirectUrl: "/login" });
        }
        req.user = user;
        next();
    });
};

// 댓글 목록 조회
router.get('/post/:postId/comments', async (req, res) => {
    const { postId } = req.params;

    try {
        const comments = await Comment.find({ postId: postId })
            .select('commentAuthor date content -_id')
            .sort('-date');
        res.status(200).json( comments );
    } catch (error) {
        res.status(500).json({ message: "Error retrieving comments", error: error });
    }
});

// 댓글 작성
router.post('/post/:postId/comments', authenticateToken, async (req, res) => {
    const { postId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content) {
        return res.status(400).json({ message: "댓글 내용을 입력해주세요" });
    }

    try {
        const newComment = await Comment.create({
            postId,
            commentAuthor: userId,
            content
        });

        res.status(201).json({ 
            message: "댓글이 성공적으로 작성되었습니다.",
            commentId: newComment.commentId,
            data: newComment 
        });
    } catch (error) {
        res.status(500).json({ message: "Error posting comment", error: error });
    }
});

// 댓글 수정
router.put('/post/:postId/comments/:commentId', authenticateToken, async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content.trim()) {
        return res.status(400).json({ message: "댓글 내용을 입력해주세요" });
    }

    try {
        const updateComment = await Comment.findOne({ commentId: commentId });

        if (!updateComment) {
            return res.status(404).json({ message: "댓글을 찾을 수 없습니다." });
        }
        if (updateComment.commentAuthor !== userId) {
            return res.status(403).json({ errorMessage: "본인이 작성한 댓글만 수정할 수 있습니다." });
        }

        await Comment.updateOne({ commentAuthor: userId }, { $set: { content: content } });

        res.status(200).json(updatedComment);
    } catch (error) {
        res.status(500).json({ message: "Error updating comment", error: error });
    }
});

// 댓글 삭제
router.delete('/post/:postId/comments/:commentId', authenticateToken, async (req, res) => {
    const { commentId } = req.params;
    const userId = req.user.id;

    try {
        const deletedComment = await Comment.findOneAndDelete({ commentId: commentId });
        if (!deletedComment) {
            return res.status(404).json({ message: "Comment not found" });
        }
        if (deletedComment.commentAuthor !== userId) {
            return res.status(403).json({ errorMessage: "본인이 작성한 댓글만 삭제할 수 있습니다."});
        }

        res.status(200).json({ message: "Comment deleted" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting comment", error: error });
    }
});

module.exports = router;