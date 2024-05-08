const express = require('express')
const path = require('path');
const { prisma } = require('../utils/prisma/index.js')

router = express.Router()

/* 예약 해제 리스트 */

router.get('/dismissed', async (req, res, next) => {
    try{

        const mainPagePath = path.join(__dirname, '../dismissed.html');

        res.sendFile(mainPagePath)
    } catch (error) {
        console.log(error);
        next(error);
    }
})

module.exports = router;