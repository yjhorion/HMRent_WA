/* 회수차량조회 라우터 */
const express = require('express')
const path = require('path');
const { prisma } = require('../utils/prisma/index.js')

router = express.Router()


/* 렌더링으로 화면 표시 */
router.get('/RetVehicle', async (req, res, next) => {
    try {
        const RetVehicle = await prisma.RetVehicle.findMany({
            orderBy : { RetVId : "desc" }
        })

        if (!RetVehicle.length) {
            return res.status(404).json({ message : " 회수차량 데이터가 없습니다 "})
        }

        return res.status(200).render('RetVehicle', { data: RetVehicle })

    } catch (error) {
        console.error(error);
        res.status(500).json({ message : error })
    }
})


module.exports = router;