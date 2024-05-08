const express = require('express')
const path = require('path');
const { prisma } = require('../utils/prisma/index.js')

router = express.Router()

/* 입고 QC */

router.get('/INQC', async (req, res, next) => {
    try{

        const mainPagePath = path.join(__dirname, '../INQC.html');

        res.sendFile(mainPagePath)
    } catch (error) {
        console.log(error);
        next(error);
    }
})

router.post('/INQC-carNo', async (req, res, next) => {        // 이벤트 리스너에서 데이터를 받아왔을 때, 여기에서 req.body가 undefined로 뜨고있음. 데이터를  잘 받아오도록 수정해야함.
    try {
        const carnumber = req.body
        console.log('카넘버' + carnumber)
        return res.status(200).json({ message : carnumber } )

    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
})

module.exports = router;