const express = require('express');
const multer = require('multer');
const morgan = require('morgan');
const path = require('path');
const AWS = require('aws-sdk');
const multerS3 = require('multer-s3');
const { v4: uuidv4 } = require('uuid');

require('dotenv').config();

const { prisma } = require('./utils/prisma/index.js')
// router = express.Router()

const app = express();
const PORT = 3000;

const { S3ACCESS, S3SECRET, S3BUCKETNAME } = process.env;

app.use(morgan('combined'));

/* AWS SDK configuration */
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

/* S3 configuration */
const s3 = new AWS.S3({
    accessKeyId: S3ACCESS,
    secretAccessKey: S3SECRET,
    region: 'us-east-1'         // 전역 설정을 무시하고 s3객체 생성시에 명시된 설정을 우선시해서, 서비스를 특정할 때 사용할 수 있음. (명시적 구분을 위해 다시 설정)
});

/* S3 configuration */
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
            const carNumber = req.body.carNumber;
            console.log(carNumber);
            const fileName = `${carNumber}_${currentDate}`
            const shortUUID = uuidv4().split('-')[0]
            cb(null,  `${shortUUID}-${carNumber}-${currentDate}${ext}`)
        }
    })
});

app.get('/', (req,res) => {
    
    res.sendFile('index.html', { root: __dirname });
});

// 이미지 업로드를 라우트
app.post('/upload', upload.array('images', 50), async (req, res, next) => {
    
    try{
        console.log('업로드된 파일 정보:', req.files);
        
        const VehicleNumber = req.files[0].split('-')[1]

        const RecentPost = await prisma.Vehicles.create({ 
            data : { VehicleNumber }
        })


    
        const imageURLs = req.files.map(file => {
            const decodedFilename = decodeURIComponent(file.originalname);
            const vehicleNumber = decodedFilename.split('-')[1]
  
            return { filename: decodedFilename, location: file.location, vehicleNumber };
        }); 

        /* 차량 이미지에 대한 데이터를 저장하는 곳. VehicleId 값을 어떻게 가져올지 미구현. */
        for (i = 0; i < imageURLs.length; i++) {
            await prisma.VehicleImages.create({
            data : { VehicleId: "id값을 어떻게 받아올지 고민", ImgURL: imageURLs[i].location, vehicleNumber: imageURLs[i].vehicleNumber}
        })

        }




        // imageURLs를 map으로 돌며 VehicleImage에 URL을 저장시켜야함.

        
        res.json({ imageURLs });
    } catch (error) {
        console.log(error);
        next(error)
    }
 
});


// 이미지 delete를 라우트


/** 구현부 s3.deleteObject를 이용해서 delete를 구현.
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 */

app.use(express.static('public'));

app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
  });











  /**기존 데이터 유실이 나오던 업로드 코드. 원인 분석이 되지 않아 남겨둠.
require('dotenv').config();

const {S3ACCESS, S3SECRET, S3BUCKETNAME, //SQSQUEUEURL
} = process.env;

const app = express();
const PORT = 3000;
// const router = express.Router() //라우터 아직 미사용중

app.use(morgan('combined'));

// 랜딩페이지
app.get('/', (req,res) => {
    
    res.sendFile('index.html', { root: __dirname });
});


const s3 = new AWS.S3({
    accessKeyId: S3ACCESS,
    secretAccessKey: S3SECRET,
    region: "us-east-1" 
});

const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: S3BUCKETNAME,
        acl: 'public-read',
        // limits: { fileSize: 10 * 1024 * 1000}, // 10MB 용량제한
        metadata: function (req, file, cb) {
            cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
            cb(null, Date.now().toString() + path.extname(file.originalname));
        } 
    })
})



// upload 버튼을 누를 경우 작동하는 post
app.post('/upload', upload.array('images', 50), async (req, res) => {
    const uploadedFiles = req.files;
    const totalFiles = uploadedFiles.length;

    try {
        console.log(`${totalFiles}개의 파일 업로드 시작됨`);

        for (let index = 0; index < totalFiles; index++) {
            const file = uploadedFiles[index];
            console.log(`${index + 1}번 파일 : ${file.originalname}`);

            const uploadResult = await s3.upload({
                Bucket: S3BUCKETNAME,
                Key: Date.now().toString() + path.extname(file.originalname),
                Body: file.buffer,
                ACL: 'public-read'
            }).promise();

            console.log(`파일 업로드 성공 (${file.originalname}):`, uploadResult.Location);
        }

        res.send('업로드 완료');
    } catch (error) {
        console.error('에러 :', error);
        return res.status(500).send('업로드 에러');
    }
});





app.listen(PORT, () => {
  console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});

**/