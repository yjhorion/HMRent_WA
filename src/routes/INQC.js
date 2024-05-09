const express = require('express')
const path = require('path');
const { prisma } = require('../utils/prisma/index.js')

router = express.Router()

/* 입고 QC */

/* 기존의 html로 그려주는 방식 */
// router.get('/INQC', async (req, res, next) => {
//     try{

//         const mainPagePath = path.join(__dirname, '../INQC.html');

//         res.sendFile(mainPagePath)
//     } catch (error) {
//         console.log(error);
//         next(error);
//     }
// })

/* 템플릿 엔진을 통해서 데이터를 조회하고 쏴주는 방식 */
router.get('/INQC', async (req, res, next) => {
    try {
        const INQC = await prisma.INQC.findMany({
            orderBy : { INQCId : "desc" }
        })

        if (!INQC.length) {
            return res.status(404).json({ message : " 존재하는 입고QC 데이터가 없습니다 "})
        }

        if (req.query.carNo) {
            const { carNo } = req.query
            const result = await prisma.INQC.findMany({
                where : { carNo: { contains: carNo 

                }}
            })
            return res.status(200).render('INQC', { data: result })
        }

        return res.status(200).render('INQC', { data: INQC })

    } catch (error) {
        console.error(error);
        res.status(500).json({ message : error })
    }
})

router.get('/editINQC/:exeNo', async (req, res, next) => {
    try {
        const { exeNo } = +req.params;

        const data = await prisma.INQC.findFirst({
            where : { exeNo }
        })

        if (!data) {
            return res.status(400).json({ message : "실행번호로 검색된 데이터가 없습니다"})
        }

        res.status(200).json({ data })

    } catch(error) {
        console.error(error);
        return res.status(500).json({ message: error })
    }
})




/* 검색을 위해 차량번호를 받아오는 부분. 바로 조회까지 이어질 수 있다. */
// router.post('/INQC', async (req, res, next) => {        // app.js 에서 bodyparser 부분 이전에 라우터를 import해오는 부분이 배치되어서, 바디로 파싱이 안되고있었음. bodyparser 이후에 라우터 import를 하여 해결.
//     try {
//         const carnumber = req.body.data
        
        
//         const result = await prisma.INQC.findMany({
//             where : { carNo : carnumber }
//         })

//         console.log(result)

//         return res.status(200).render('INQC_result', { data: result })

//     } catch (error) {
//         console.error(error);
//         res.status(500).send('Internal Server Error');
//     }
// })

module.exports = router;