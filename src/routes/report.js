/* 기능외 기능 : 불편사항 신고기능 */

const express = require('express')
const { prisma } = require('../utils/prisma/index.js')

require('dotenv').config();

const router = express.Router();

router.post('/report', async (req, res, next) => {
    try{
        const { USERID, USERPW } = req.session.user;
        const { content } = req.content;

        await prisma.report.create({
            data : {
                USERID,
                USERPW,
                content
            }
        })

        // 신고내용이 접수되면, 카카오톡으로 알림 메세지 추가

        return res.status(201).json({ message : "신고 완료"})
    } catch (error) {
        console.error('신고기능 에러 : ', error.message);
        res.status(500).send('신고기능 에러')
    }
})