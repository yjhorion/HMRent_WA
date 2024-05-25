const AWS = require('aws-sdk');
const fs = require('fs')

const {S3ENDPOINT, S3ACCESS, S3SECRET, S3BUCKETNAME, S3DIRECTORY } = process.env

const s3 = new AWS.S3({
    endpoint: S3ENDPOINT,
    accessKeyId: S3ACCESS,
    secretAccessKey: S3SECRET,
    s3ForcePathStyle: true,
    signatureVersion: 'v4'
});

const bucketName = S3BUCKETNAME

const folderPath = '/HR380009/202401/';

// 파일명과 파일 사이즈를 저장할 배열
const uploadedFilesInfo = [];

// 업로드할 이미지 파일 목록
const imageFiles = [
    { fileName: 'image1.jpg', filePath: '../image-1.png'}, // 해당 경로값등은 프론트에서 전달받게 될것이지만. 일단은 샘플 이미지 파일을 사용
    { fileName: 'image2.jpg', filePath: '../image-2.png'},
    { fileName: 'image3.jpg', filePath: '../image-3.png'},
    { fileName: 'image4.jpg', filePath: '../image-4.png'},
    { fileName: 'image5.jpg', filePath: '../image-5.png'},
];

// 각 이미지 파일을 S3에 업로드하고 파일명과 파일 사이즈를 filesInfo 배열에 저장
async function uploadImages() {

    for (const file of imageFiles) {
        const params = {
            Bucket: bucketName,
            key: folderPath + file.fileName,
            Body: fs.readFileSync(file.filePath)
        };

        try {
            const data = await s3.upload(params).promise();
            uploadedFilesInfo.push({ IMGNAME: file.fileName, IMGSIZE: data.ContentLength});
            console.log(`${file.fileName} 업로드 완료, FILESIZE : ${file.fileSize}`)
        } catch (err) {
            console.error(`파일 업로드 중 에러 발생: ${err.message}`);
        }
    }

    return uploadedFilesInfo;
}

async function rollbackUploadedFiles() {
    for (const file of uploadedFilesInfo) {
        const params = {
            Bucket: bucketName,
            Key: folderPath + file.IMGNAME
        };
    }

    try {
        await s3.deleteObject(params).promise();
        console.log(`${file.IMGNAME} 삭제 완료`)
    } catch (err) {
        console.error(`파일 삭제 중 에러 발생: ${err.message}`);
    }
}

module.exports = { uploadImages, rollbackUploadedFiles }