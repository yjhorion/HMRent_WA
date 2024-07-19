const AWS = require('aws-sdk');
const sharp = require('sharp');
const path = require('path'); // path 모듈을 추가합니다.
const { format } = require('date-fns');
const getRandomFileName = require('../FILENAME/filename.js'); // 랜덤파일명을 만들어주는 모듈함수

const { S3ENDPOINT, S3ACCESS, S3SECRET, S3BUCKETNAME } = process.env;

const s3 = new AWS.S3({
    endpoint: S3ENDPOINT,
    accessKeyId: S3ACCESS,
    secretAccessKey: S3SECRET,
    s3ForcePathStyle: true,
    signatureVersion: 'v4'
});

const date = format(new Date(), 'yyyyMM');

const bucketName = S3BUCKETNAME;
const folderPath = `../hmrdevbucket/HR380009/${date}/`;

// 파일명과 파일 사이즈를 저장할 배열
let uploadedFilesInfo = [];

// 업로드할 이미지 파일 목록
async function uploadImages(files) {
    // 초기화
    uploadedFilesInfo = [];

    for (const file of files) {
        const fileName = getRandomFileName();
        const fileSizeInKB = Math.floor(file.size / 1024);

        // 파일 MIME 타입과 확장자 확인
        let buffer = file.buffer;
        let contentType = file.mimetype;
        let fileExtension = path.extname(file.originalname); // 파일 확장자를 가져옵니다.

        if (file.mimetype === 'image/heif' || file.mimetype === 'image/heic') {
            try {
                buffer = await sharp(file.buffer).toFormat('jpeg').toBuffer();
                contentType = 'image/jpeg'; // 변환된 형식에 맞는 MIME 타입
                fileExtension = '.jpg'; // JPEG 확장자
            } catch (error) {
                console.error(`HEIF 파일 변환 중 에러 발생: ${error.message}`);
                continue; // 변환 실패 시 현재 파일을 건너뜁니다.
            }
        }

        const params = {
            Bucket: bucketName,
            Key: folderPath + fileName + fileExtension, // 확장자 포함
            Body: buffer,
            ContentType: contentType,
            ACL: 'public-read'
        };

        try {
            const data = await s3.upload(params).promise();
            uploadedFilesInfo.push({ "IMGNAME": fileName + fileExtension, "IMGSIZE": fileSizeInKB });
            console.log(`${fileName + fileExtension} 업로드 완료, FILESIZE : ${fileSizeInKB} KB`);
        } catch (error) {
            await rollbackUploadedFiles();
            console.error(`파일 업로드 중 에러 발생: ${error.message}`);
            return;
        }
    }
    return uploadedFilesInfo;
}