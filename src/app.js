const express = require('express');
const multer = require('multer');
const morgan = require('morgan');
const path = require('path');
const AWS = require('aws-sdk');
const multerS3 = require('multer-s3');

require('dotenv').config();

const {S3ACCESS, S3SECRET, S3BUCKETNAME, SQSQUEUEURL} = process.env;

const app = express();
const PORT = 3000;
// const router = express.Router() //라우터 아직 미사용중

app.use(morgan('combined'));

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

const sqs = new AWS.SQS({
    accessKeyId: S3ACCESS,
    secretAccessKey: S3SECRET,
    region: "us-east-1"
})

app.get('/', (req,res) => {
    res.sendFile('index.html', { root: __dirname });
});

app.post('/upload', upload.array('images', 50), (req, res) => {
    const uploadedFiles = req.files;
    const totalFiles = req.files.length;

    console.log(`${totalFiles}개의 파일 업로드됨`);
    
    uploadedFiles.forEach((file, index) => {
        console.log(`${index + 1}번 파일 : ${file.originalname} : 업로드 성공`);
    });

    // 이미지 업로드 요청을 SQS에 보냄
    const params = {
        MessageBody: 'Image uploaded',
        QueueUrl: SQSQUEUEURL,
        MessageGroupId: 'S3UploadTest'
    };

    sqs.sendMessage(params, (err, data) => {
        if (err) {
            console.error('SQS 전송 오류:', err);
        } else {
            console.log('SQS 전송 성공:', data.MessageId);
        }
    });

    res.send('업로드 완료')
})


app.listen(PORT, () => {
  console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});
