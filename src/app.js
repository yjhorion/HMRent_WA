const express = require('express');
const multer = require('multer');
const morgan = require('morgan');
const path = require('path');
const AWS = require('aws-sdk');
const multerS3 = require('multer-s3');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// router = express.Router()

const app = express();
const PORT = 3000;

const { S3ACCESS, S3SECRET, S3BUCKETNAME } = process.env;

app.use(morgan('combined'));

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
    region: 'us-east-1'
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
app.post('/upload', upload.array('images', 50), (req, res) => {

    console.log('업로드된 파일 정보:', req.files);
    

    const imageURLs = req.files.map(file => {
        const decodedFilename = decodeURIComponent(file.originalname);
        return { filename: decodedFilename, location: file.location };
    });
    
    res.json({ imageURLs });
});

app.use(express.static('public'));

app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
  });











/** 
require('dotenv').config();

const {S3ACCESS, S3SECRET, S3BUCKETNAME, //SQSQUEUEURL
} = process.env;

const app = express();
const PORT = 3000;
// const router = express.Router() //라우터 아직 미사용중

app.use(morgan('combined'));

const s3 = new AWS.S3({
    accessKeyId: S3ACCESS,
    secretAccessKey: S3SECRET,
    region: "us-east-1" 
});

// 랜딩페이지
app.get('/', (req,res) => {
    
    res.sendFile('index.html', { root: __dirname });
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