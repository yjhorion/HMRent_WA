const express = require('express')
const path = require('path');
const { prisma } = require('../utils/prisma/index.js')

router = express.Router()

/* 회수차량 조회 */

router.get('/retrieval', async (req, res, next) => {
    try{

        const mainPagePath = path.join(__dirname, '../retrieval.html');

        res.sendFile(mainPagePath)
    } catch (error) {
        console.log(error);
        next(error);
    }
})

module.exports = router;