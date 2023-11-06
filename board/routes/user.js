const express = require('express');
const jwt = require('jsonwebtoken');
const User = require("../schemas/user");
const Post = require("../schemas/post");
const Comment = require("../schemas/comment");
const schedule = require('node-schedule');
const { errorMonitor } = require('events');
const router = express.Router();

// jwt로부터 id를 가져오는 method
function getUserIdFromToken(token) {
    const decoded = jwt.verify(token, 'secretKey');
    return decoded.id;
}

// 계정 생성 API
router.post('/signup', async (req, res) => {
    const { nickname, password, passwordConfirmation, name } = req.body;
  
    // 닉네임 검증
    if (!nickname.match(/^[a-zA-Z0-9]{3,}$/)) {
        return res.status(400).json({ message: "아이디는 3자 이상으로 영문, 숫자만 사용할 수 있습니다." });
    }
  
    // 비밀번호 아이디 중복 검증
    if (password.includes(nickname)) {
        return res.status(400).json({ message: "비밀번호는 아이디를 포함할 수 없습니다." });
    }

    // 비밀번호 길이 검증
    if (password.length < 4) {
        if (!password.length) {
            return res.status(400).json({ message: "비밀번호를 입력해 주세요." });
        }
        return res.status(400).json({ message: "비밀번호는 최소 4자 이상으로 입력해주세요." });
    }
  
    // 비밀번호 확인
    if (password !== passwordConfirmation) {
        return res.status(400).json({ message: "비밀번호가 일치하지 않습니다." });
    }

    // 이름이 비어있거나 공백인지 확인
    if (!name.trim()) {
        return res.status(400).json({ message: "이름을 입력해주세요." });
    }
  
    try {
        // 중복 닉네임 검사
        const existingUser = await User.findOne({ userId: nickname });
        if (existingUser) {
            return res.status(400).json({ message: "이미 사용 중인 아이디입니다." });
        }
  
        // 새로운 유저 생성
        const newUser =  await User.create({ 
            userId: nickname,
            userPw: password,
            name: name
        });
  
        // 회원가입 성공 응답
        res.status(201).json({ message: "회원가입에 성공하였습니다." });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 로그인 API
router.post('/login', async (req, res) => {
    const { nickname, password } = req.body;

    try {
        const user = await User.findByCredentials(nickname, password);
        const userId = user.userId;

        // 비활성화된 계정인 경우, 계정 복구
        if (user.willBeDeleted || !user.isActive) {
            await Post.updateMany({ postAuthor: userId }, { $set: { isActive: true }});
            await Comment.updateMany({ commentAuthor: userId }, { $set: { isActive: true }});
        }

        // JWT 토큰 생성
        const token = jwt.sign({ id: userId }, 'secretKey', { expiresIn: '2h' });

        // 쿠키에 JWT 저장
        res.cookie('auth_token', token, {
            httpOnly: true,
            sameSite: 'strict'
        });

        // 로그인 성공 응답
        res.status(200).json({ message: "로그인에 성공하였습니다." });
    } catch (error) {
        // res.status(400).json({ message: "아이디 혹은 비밀번호가 일치하지 않습니다." });
        res.status(400).json({ message: error.message });
    }
});

// 계정 비활성화 API
router.put('/user/deactivate', async (req, res) => {
    try {
        const token = req.header('Authorization').replace('Bearer ', '');
        const userId = getUserIdFromToken(token);
      
        // 사용자를 찾아 삭제 대기 상태로 설정
        const user = await User.findOne({ userId: userId });
        if (!user) {
            return res.status(404).json({ message: "유저가 존재하지 않습니다." });
        }
        
        await User.findOneAndUpdate({ userId: userId }, { $set: { isActive: false }});

        // User와 연관된 모든 게시글과 댓글의 상태를 비활성화로 변경
        await Post.updateMany({ postAuthor: userId }, { $set: { isActive: false }});
        await Comment.updateMany({ commentAuthor: userId }, { $set: { isActive: false }});
  
        res.send("계정이 비활성화되었습니다.");
    } catch (error) {
        res.status(500).send(error.toString());
    }
});


// 계정 탈퇴 API
router.delete('/user/delete', async (req, res) => {
    try {
        const token = req.header('Authorization').replace('Bearer ', '');
        const userId = getUserIdFromToken(token);
      
        // 사용자를 찾아 삭제 대기 상태로 설정
        const user = await User.findOneAndUpdate({ userId: userId }, { $set: { willBeDeleted: true }});
        if (!user) {
            return res.status(404).json({ message: "유저가 존재하지 않습니다." });
        }
        
        // 스케줄러가 실행되기 전 사용자의 모든 게시글과 댓글을 비활성화
        await Post.updateMany({ postAuthor: userId }, { $set: { isActive: false }});
        await Comment.updateMany({ commentAuthor: userId }, { $set: { isActive: false }});

        // node-schedule을 사용하여 2분 후 삭제 실행
        schedule.scheduleJob(Date.now() + 120000, async function(){
            const userToDelete = await User.findOne({ userId: userId });
            if (userToDelete.willBeDeleted) {
                await Post.deleteMany({ postAuthor: userId });
                await Comment.deleteMany({ commentAuthor: userId });
                await User.findOneAndDelete({ userId: userId });
            }
        });
  
        res.send('Account deletion scheduled. You have 2 minutes to cancel.');
    } catch (error) {
        res.status(500).send(error.toString());
    }
});

module.exports = router;