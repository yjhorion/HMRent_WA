/*  차량예약 리스트 (예약해제기능) */
const express = require('express')
const path = require('path');
const { prisma } = require('../utils/prisma/index.js')

router = express.Router()


/* 렌더링으로 화면 표시 */
router.get('/reservation', async (req, res, next) => {
    try {
        const reservation = await prisma.reservation.findMany({
            where : { dismissed : false },
            orderBy : { 
                resId : "desc",
            }
        })

        if (!reservation.length) {
            return res.status(404).json({ message : " 예약차랑 데이터가 없습니다 "})
        }

        return res.status(200).render('reservation', { data: reservation })

    } catch (error) {
        console.error(error);
        res.status(500).json({ message : error })
    }
})

router.post('/reservation', async (req, res, next) => {
    try {
        const { assetNo } = req.body
        
        await prisma.reservation.updateMany({
            where: { AssetNo : assetNo },
            data : { dismissed :  true }
        })

        return res.status(200).json({message : '수정되었습니다'})

    } catch (error) {
        console.error(error);
        res.status(500).json({ message : error})
    }
})


module.exports = router;