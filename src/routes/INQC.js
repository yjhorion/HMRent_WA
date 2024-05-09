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
            where : { UpdatedAt : null },
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

/* 실행번호를 클릭했을 때, 해당 데이터를 검색하고 리다이렉팅 */
router.get('/editINQC/:exeNo', async (req, res, next) => {
    try {
        const  exeNo  = req.params.exeNo

        const data = await prisma.INQC.findFirst({
            where : { exeNo : exeNo }
        })

        if (!data) {
            return res.status(400).json({ message : "실행번호로 검색된 데이터가 없습니다"})
        }

        // res.status(302).redirect(`/editINQC?GUBUN=${data.GUBUN}&exeNo=${data.exeNo}&carNo=${data.carNo}&CliName=${data.CliName}&InReason=${data.InReason}`)
        return res.status(200).json({GUBUN:data.GUBUN, exeNo:data.exeNo, carNo:data.carNo, CliName:data.CliName, InReason:data.InReason})
    } catch(error) {
        console.error(error);
        return res.status(500).json({ message: error })
    }
})

/* 실행번호 기반 리다이렉팅 된 페이지로 넘어가는 라우터 */
router.get('/editINQC', (req, res) => {
    const { GUBUN, exeNo, carNo, CliName, InReason } = req.query;

    res.render('editINQC', { GUBUN, exeNo, carNo, CliName, InReason })
})

router.post('/submitINQC', async(req, res, next) => {
    try {
    const { mileage, entryLocation, detailLocation, remark, exeNo } = req.body;


    /* req.body 데이터 중 필수데이터가 있다면 이곳에서 if(!mileague)... 등으로 예외처리하고 메세지로 리턴해줄 것. 
    
        schema에는 nullable로 설정되어 있는데이터들 (입력 전에는 null값일 수밖에 없는)이기 때문에, 이곳에서 입력 예외처리 해주거나,
        front에서 전송하기 전 예외처리가 필요함.

        front에서 처리해주는쪽이 더 깔끔하고, 백앤드에서는 데이터 유실확인 목적으로 예외처리할 것.
    */

    

    const updateData = await prisma.INQC.updateMany({  // updatefirst 로 진행했지만, 사실은 findfirst등을 한 이후에 해당 정보를 바꾸고 commit 하거나 rawquery를 사용하는게 더 바람직할 것.
        where : { exeNo },
        data : {
            Mileage : +mileage,
            EntryLocation : entryLocation,
            DetailLocation : detailLocation,
            Remark : remark
        }
    })

    if (!updateData) {
        return res.status(400).json({ message : "데이터가 존재하지 않습니다. 실행번호를 확인해주세요"})
    }

    return res.status(201).json({ data : updateData })
} catch (error) {
    console.error(error)
    return res.status(500).json({ message: error})
}
})

module.exports = router;



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
