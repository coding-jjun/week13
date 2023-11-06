const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true,
        match: [/^[a-zA-Z0-9]{3,}$/, 'is invalid']
    },
    userPw: {
        type: String,
        required: true,
        minlength: 4
    },
    name: {
        type: String,
        required: true
    },
    willBeDeleted: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    }
});

// 비밀번호 해시하기
userSchema.pre('save', async function(next) {
    const user = this;
    // 비밀번호 필드가 변경되었는지 확인
    if (user.isModified('userPw')) {
        // 비밀번호를 해시하여 저장
        user.userPw = await bcrypt.hash(user.userPw, 8);
    }
    next();
});

// 인증 method
userSchema.statics.findByCredentials = async function(nickname, password) {
    const user = await User.findOne({ userId: nickname });
    if (!user) {
        throw new Error('등록되지 않은 아이디입니다.');
    }
    const isMatch = await bcrypt.compare(password, user.userPw);
    if (!isMatch) {
        throw new Error('비밀번호를 잘못 입력했습니다.');
    }
    return user;
};

const User = mongoose.model("User", userSchema);
module.exports = User;