const AWS = require('aws-sdk');
const sharp = require('sharp');
const path = require('path');
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
const folderPath = `../hmrdevbucket/HR380016/${date}/`; /// 운영계 : `..hmrbucket/HR380016/${date}/`,   개발계 : `../hmrdevbucket/HR380016/${date}`

// 파일명과 파일 사이즈를 저장할 배열
let uploadedFilesInfo = [];

// 업로드할 이미지 파일 목록
async function uploadImages(files) {
    // 초기화
    uploadedFilesInfo = [];

    // 파일 업로드 작업 배열 생성
    const uploadPromises = files.map(async (file) => {
        let fileName = getRandomFileName();
        const fileSizeInKB = Math.floor(file.size / 1024);

        // 원래 파일의 확장자 추출
        const fileExtension = path.extname(file.originalname).toLowerCase();
        let buffer = file.buffer;
        let contentType = file.mimetype;

        // HEIF 파일을 JPEG로 변환
        if (file.mimetype === 'image/heif' || file.mimetype === 'image/heic') {
            try {
                buffer = await sharp(file.buffer).toFormat('jpeg').toBuffer();
                contentType = 'image/jpeg';
                fileName += '.jpg'; // JPEG 확장자로 변경
            } catch (error) {
                console.error(`HEIF 파일 변환 중 에러 발생: ${error.message}`);
                return; // 변환 실패 시 현재 파일을 건너뜁니다.
            }
        } else {
            fileName += fileExtension; // 원래 파일의 확장자를 사용
        }

        const params = {
            Bucket: bucketName,
            Key: folderPath + fileName,
            Body: buffer,
            ContentType: contentType,
            ACL: 'public-read'
        };

        try {
            const data = await s3.upload(params).promise();
            uploadedFilesInfo.push({ "IMGNAME": fileName, "IMGSIZE": fileSizeInKB });
            console.log(`${fileName} 업로드 완료, FILESIZE : ${fileSizeInKB} KB`);
        } catch (error) {
            console.error(`파일 업로드 중 에러 발생: ${error.message}`);
            throw error; // 에러 발생 시 Promise.reject를 호출하여 전체 업로드를 중단
        }
    });

    try {
        // 모든 업로드 작업이 완료될 때까지 대기
        await Promise.all(uploadPromises);
        return uploadedFilesInfo;
    } catch (error) {
        // 에러 발생 시 롤백
        await rollbackUploadedFiles();
        throw error; // 에러를 다시 던져 호출자에게 알림
    }
}

// 전송 과정에서 실패하는 부분이 생기면 S3에 업로드한 부분을 롤백하는 함수
async function rollbackUploadedFiles() {
    for (const file of uploadedFilesInfo) {
        const params = {
            Bucket: bucketName,
            Key: folderPath + file.IMGNAME
        };

        try {
            await s3.deleteObject(params).promise();
            console.log(`${file.IMGNAME} 삭제 완료`);
        } catch (err) {
            console.error(`파일 삭제 중 에러 발생: ${err.message}`);
        }
    }
}

module.exports = { uploadImages, rollbackUploadedFiles };
