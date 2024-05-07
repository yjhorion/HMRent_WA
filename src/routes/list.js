/** 게시판 형식의 전체 목록 조회 
 * 
 * 조회 조건 0 : 전체조회 (id값 순서대로 desc == which means 게시 시간순서 내림차순)
 * 조회 조건 1 : 차량번호 
 * 조회 조건 2 : 날자
 * 조회 조건 3 : confirm 된 것, 되지 않은 것. confirm 의 기본값은 0으로 falsy. 이외 보류, 승인 등등은 0++ 오름차순.
 * 
 * 
 * **/

const express = require('express')
const { prisma } = require('../utils/prisma/index.js')

router = express.Router()

/* 전체조회 */
router.get('/posts', async (req, res, next) => {
    try {
        const Vehicles = await prisma.vehicles.findMany({
            orderBy: {
                VehicleId: 'desc'
            }
        });
        return res.status(200).json({ data: Vehicles})
    } catch (error) {
        console.log(error);
        next(error);
    }
})

/* 전체조회(confirm이 된것 제외) + 게시 시간기준 내림차순 */
router.get('/posts/notconlist', async (req, res, next) => {
    try{
        
        const Vehicles = await prisma.vehicles.findMany({
            where : { 
                NOT : { 
                    confirm : 1
            }
        },
            orderBy: {
                VehicleId: 'desc'
            }
        });

        if (!Vehicles.length) return res.status(400).json({ message: "미승인 목록이 없습니다."})
        return res.status(200).json({ data: Vehicles})
    } catch (error) {
        console.log(error);
        next(error);
    }
})

/* 전체조회(confirm이 된것 제외) + 게시 시간기준 오름차순 
    ***같은 조건에서 오름차순 내림차순을 지정할 때엔, 한가지 api만 사용하고, 프론트에서 전달받아 저장하고 있는 데이터로 재정렬만 하는 방식 고려해볼 것.*/
router.get('/posts/ascnotconlist', async (req, res, next) => {
    try{
        const Vehicles = await prisma.vehicles.findMany({
            where : { confirm : {
                        not : 1
            } 
        },
            orderBy: {
                VehicleId: 'asc'
            }
        });

        if (!Vehicles.length) return res.status(400).json({ message: "미승인 목록이 없습니다."})
        return res.status(200).json({ data: Vehicles})
    } catch (error) {
        console.log(error);
        next(error);
    }
})



/* 전체조회(confirm이 된 것만) 게시 시간기준 내림차순*/
router.get('/posts/conlist', async (req, res, next) => {
    try{
        const Vehicles = await prisma.vehicles.findMany({
            where : { confirm: 1 },
            orderBy : {
                VehicleId : 'desc'
            }
        });

        if (!Vehicles) return res.status(400).json({ message: "승인 목록이 없습니다."})
        return res.status(200).json({ data: Vehicles})
    }catch (error) {
        console.log(error);
        next(error);
    }
})

/* 전체조회(confirm이 된 것만) 게시 시간기준 오름차순*/
router.get('/posts/ascdconlist', async (req, res, next) => {
    try{
        const Vehicles = await prisma.vehicles.findMany({
            where : { confirm: 1 },
            orderBy : {
                VehicleId : 'asc'
            }
        });

        if (!Vehicles) return res.status(400).json({ message: "승인 목록이 없습니다."})
        return res.status(200).json({ data: Vehicles})
    }catch (error) {
        console.log(error);
        next(error);
    }
})

/* 차량번호로 조회 */
router.get('/posts/:VehicleNumber', async (req, res, next) => {
    try {
        const { VehicleNumber } = req.params;
        const Vehicles = await prisma.vehicles.findMany({ 
            where: { VehicleNumber },
            orderBy : {
                VehicleId : 'desc'
            }
        })

        if (!Vehicles.length) {
            return res.status(400).json({ message : "입력하신 차량번호로 조회된 차량이 없습니다"})
        }

        return res.status(200).json({ data: Vehicles })
    } catch (error) {
        console.log(error);
        next(error);
    }
})


/* 차량번호로 조회한 이후, id값(data[i]["VehicleNumber"]) 으로 이미지 조회 */
router.get('/posts/:VehicleNumber/:VehicleId', async (req, res, next) => {
    try{
        const { VehicleNumber, VehicleId } = req.params;
        const VehicleImages = await prisma.vehicleImages.findMany({
            where : { VehicleNumber , VehicleId: +VehicleId} 
        })

        if (!VehicleImages.length) {
            return res.status(400).json({ message: "등록된 이미지가 없습니다"})
        }

        return res.status(200).json({ data: VehicleImages })
        // 프론트단에서 data[i]["ImgURL"]을 for문을 돌려서 이미지를 출력해내야한다.
    } catch (error) {
        console.log(error);
        next(error);
    }
})

module.exports = router;
