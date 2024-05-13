/* 상품화완료QC 라우터 */
const express = require('express')
const path = require('path');
const { prisma } = require('../utils/prisma/index.js')

/* multerS3 */
const multer = require('multer');
const multerS3 = require('multer-s3');
const AWS = require('aws-sdk');

const { v4: uuidv4 } = require('uuid');

require('dotenv').config();

const { S3ACCESS, S3SECRET, S3BUCKETNAME } = process.env;

/* multer config/settings */
AWS.config.update({
    correctClockSkew: true,
    region: 'us-east-1',
    signatureVersion: 'V4',
    httpOptions: {
        timeout: 240000,
        connectTimeout: 120000,
    },
    encoding: 'utf8'
})

const s3 = new AWS.S3({
    accessKeyId: S3ACCESS,
    secretAccessKey: S3SECRET,
    region: 'us-east-1'         // 전역 설정을 무시하고 s3객체 생성시에 명시된 설정을 우선시해서, 서비스를 특정할 때 사용할 수 있음. (명시적 구분을 위해 다시 설정)
});

const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: S3BUCKETNAME,
        acl: 'public-read',
        limits: { fileSize: 5 * 1024 * 1024},
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: function(req, file, cb) {
            const currentDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const ext = path.extname(file.originalname);
            const carNo = req.body.carNo;
            const fileName = `${carNo}`
            const shortUUID = uuidv4().split('-')[0]
            cb(null,  `${shortUUID}-${carNo}-${ext}`)
        }
    })
});

router = express.Router()

/* 렌더링으로 화면 표시 */
router.get('/CompQC', async (req, res, next) => {
    try {
        const CompQC = await prisma.CompQC.findMany({
            where : { UpdatedAt : null },
            orderBy : { CompQCId : "desc" }
        })

        if (!CompQC.length) {
            return res.status(404).json({ message : " 존재하는 상품화완료QC 데이터가 없습니다 "})
        }

        if (req.query.carNo) {                                  //차량번호로 검색이 req.query로 들어올 경우, 차량번호로 조회.
            const { carNo } = req.query
            const result = await prisma.CompQC.findMany({
                where : { carNo: { contains: carNo 
                }}
            })
            return res.status(200).render('CompQC', { data: result })
        }

        return res.status(200).render('CompQC', { data: CompQC })

    } catch (error) {
        console.error(error);
        res.status(500).json({ message : error })
    }
})

/* 실행번호를 클릭했을 때, 해당 데이터를 검색하고 리다이렉팅 */
router.get('/editCompQC/:carNo', async (req, res, next) => {
    try {
        const  carNo  = req.params.carNo

        const data = await prisma.CompQC.findFirst({
            where : { 
                carNo : carNo,
                UpdatedAt : null
             }
        })

        if (!data) {
            return res.status(400).json({ message : "실행번호로 검색된 데이터가 없습니다"})
        }

        return res.status(200).json({GUBUN:data.GUBUN, carNo:data.carNo, modelName:data.modelName, mainTstatus:data.mainTstatus})
    } catch(error) {
        console.error(error);
        return res.status(500).json({ message: error })
    }
})

/* 실행번호 기반 리다이렉팅 된 페이지로 넘어가는 라우터 */
router.get('/editCompQC', (req, res) => {
    const { GUBUN, carNo, modelName, mainTstatus } = req.query;

    res.render('editCompQC', { GUBUN, carNo, modelName, mainTstatus })
})

/* 전송버튼을 눌렀을 때, 데이터와 이미지 전송 */
router.post('/submitCompQC', upload.array('images', 50), async(req, res, next) => {
    try {
        const { mileage, entryLocation, detailLocation, remark, KeyAmountPres, KeyAmountTot, KeyLocation, carNo } = req.body;
        const imageURLs = req.files.map(file => {
        const decodedFilename = decodeURIComponent(file.originalname);

        return { filename: decodedFilename, location: file.location}
    })

    const CompQCdata = await prisma.CompQC.findFirst({
        where: { carNo },
    })

    const CompQCId = CompQCdata.CompQCId    
    
    const updateData = await prisma.CompQC.updateMany({  // updatefirst 로 진행했지만, 사실은 findfirst등을 한 이후에 해당 정보를 바꾸고 commit 하거나 rawquery를 사용하는게 더 바람직할 것.
        where : { carNo },
        data : {
            Mileage : +mileage,
            EntryLocation : entryLocation,
            DetailLocation : detailLocation,
            KeyAmountPres : +KeyAmountPres,
            KeyAmountTot : +KeyAmountTot,
            KeyLocation : KeyLocation,
            Remark : remark
        }
    })
    
    /* 이용자가 이미지를 추가했을 때에만 동작하도록 (아닐경우 에러가 발생함으로) */
    if (req.files || req.files.length !==0) {
        
        const saveImageURLs = await Promise.all(imageURLs.map(async imageURL => 
            await prisma.CompQCIMG.create({
                data : { 
                    ImgURL : imageURL.location,
                    carNo : carNo,
                    CompQCId : CompQCId
                }
            })
        ))
    }
    
    /* req.body 데이터 중 필수데이터가 있다면 이곳에서 if(!mileague)... 등으로 예외처리하고 메세지로 리턴해줄 것. 
    
        schema에는 nullable로 설정되어 있는데이터들 (입력 전에는 null값일 수밖에 없는)이기 때문에, 이곳에서 입력 예외처리 해주거나,
        front에서 전송하기 전 예외처리가 필요함.

        front에서 처리해주는쪽이 더 깔끔하고, 백앤드에서는 데이터 유실확인 목적으로 예외처리할 것.
    */



    if (!updateData) {
        return res.status(400).json({ message : "데이터가 존재하지 않습니다. 실행번호를 확인해주세요"})
    }

    return res.status(201).json({ data : updateData, message: "업로드 성공" })
} catch (error) {
    console.error(error)
    return res.status(500).json({ message: error})
}
})




module.exports = router;