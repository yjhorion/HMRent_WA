/** 게시판 형식의 전체 목록 조회 
 * 
 * 조회 조건 0 : 전체조회 (id값 순서대로 desc == which means 게시 시간순서 내림차순)
 * 조회 조건 1 : 차량번호 
 * 조회 조건 2 : 날자
 * 조회 조건 3 : confirm 된 것, 되지 않은 것. confirm 의 기본값은 0으로 falsy. 이외 보류, 승인 등등은 0++ 오름차순.
 * 
 * 
 * **/

import express from 'express'
import { prisma } from '../utils/prisma/index.js'

router = express.Router()

/* 전체조회 */
router.get('/posts', async (req, res, next) => {
    try {
        const Vehicles = await prisma.Vehicles.findMany({
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
        const Vehicles = await prisma.Vehicles.findMany({
            where : { confirm: { not: 1 } },
            orderBy: {
                VehicleId: 'desc'
            }
        });

        if (!Vehicles) return res.status(400).json({ message: "미승인 목록이 없습니다."})
        return res.status(200).json({ data: Vehicles})
    } catch (error) {
        console.log(error);
        next(error);
    }
})

/* 전체조회(confirm이 된것 제외) + 게시 시간기준 오름차순 */
router.get('/posts/ascnotconlist', async (req, res, next) => {
    try{
        const Vehicles = await prisma.Vehicles.findMany({
            where : { confirm: { not: 1 } },
            orderBy: {
                VehicleId: 'asc'
            }
        });

        if (!Vehicles) return res.status(400).json({ message: "미승인 목록이 없습니다."})
        return res.status(200).json({ data: Vehicles})
    } catch (error) {
        console.log(error);
        next(error);
    }
})



/* 전체조회(confirm이 된 것만) 게시 시간기준 내림차순*/
router.get('/posts/conlist', async (req, res, next) => {
    try{
        const Vehicles = await prisma.Vehicles.findMany({
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
        const Vehicles = await prisma.Vehicles.findMany({
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
        const { VehicleNumber } = +req.params;
        const Vehicle = await prisma.Vehicles.findMany({ 
            where: { VehicleNumber },
            orderBy : {
                VehicleId : 'asc'
            }
        })
    } catch (error) {
        console.log(error);
        next(error);
    }
})




export default router;
