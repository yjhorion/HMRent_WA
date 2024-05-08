const express = require('express')
const path = require('path');
const { prisma } = require('../utils/prisma/index.js')

router = express.Router()

/* 상품화완료 QC */

router.get('/compQC', async (req, res, next) => {
    try{

        const mainPagePath = path.join(__dirname, '../INQC.html');

        res.sendFile(mainPagePath)
    } catch (error) {
        console.log(error);
        next(error);
    }
})

module.exports = router;