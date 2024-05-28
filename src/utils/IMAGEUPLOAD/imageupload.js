const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const getRandomFileName = require('../FILENAME/filename.js'); // 랜덤파일명을 만들어주는 모듈함수

const { S3ENDPOINT, S3ACCESS, S3SECRET, S3BUCKETNAME } = process.env;

const s3 = new AWS.S3({
    endpoint: S3ENDPOINT,
    accessKeyId: S3ACCESS,
    secretAccessKey: S3SECRET,
    s3ForcePathStyle: true,
    signatureVersion: 'v4'
});

const bucketName = S3BUCKETNAME;
const folderPath = './HR380009/202401/';

// 파일명과 파일 사이즈를 저장할 배열
let uploadedFilesInfo = [];

// 업로드할 이미지 파일 목록
const imageFiles = [
    { "fileName": getRandomFileName(), "filePath": path.join(__dirname, '../IMAGEUPLOAD/IMAGE_SAMPLE/image1.png') }, // 해당 경로값등은 프론트에서 전달받게 될것이지만. 일단은 샘플 이미지 파일을 사용
    { "fileName": getRandomFileName(), "filePath": path.join(__dirname, '../IMAGEUPLOAD/IMAGE_SAMPLE/image2.png') },
    { "fileName": getRandomFileName(), "filePath": path.join(__dirname, '../IMAGEUPLOAD/IMAGE_SAMPLE/image3.png') },
    { "fileName": getRandomFileName(), "filePath": path.join(__dirname, '../IMAGEUPLOAD/IMAGE_SAMPLE/image4.png') },
    { "fileName": getRandomFileName(), "filePath": path.join(__dirname, '../IMAGEUPLOAD/IMAGE_SAMPLE/image5.png') },
];

// 각 이미지 파일의 용량을 저장할 배열
const fileLength = [];

// 각 이미지 파일의 용량을 구하여 fileLength 배열에 저장
for (let i = 0; i < imageFiles.length; i++) {
    const filePath = path.join(__dirname, `../IMAGEUPLOAD/IMAGE_SAMPLE/image${i + 1}.png`);
    const fileStats = fs.statSync(filePath);
    const fileSizeInBytes = fileStats.size;
    const fileSizeInKB = Math.floor(fileSizeInBytes / 1024);

    fileLength.push(fileSizeInKB);
}

// 각 이미지 파일을 S3에 업로드하고 파일명과 파일 사이즈를 uploadedFilesInfo 배열에 저장
async function uploadImages() {
    // 초기화
    uploadedFilesInfo = [];

    for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const fileSize = fileLength[i];

        const params = {
            Bucket: bucketName,
            Key: folderPath + file.fileName,
            Body: fs.readFileSync(file.filePath)
        };

        try {
            const data = await s3.upload(params).promise();
            uploadedFilesInfo.push({ "IMGNAME": file.fileName, "IMGSIZE": fileSize });
            console.log(`${file.fileName} 업로드 완료, FILESIZE : ${fileSize} KB`);
            // console.dir(data);
        } catch (err) {
            await rollbackUploadedFiles();
            console.error(`파일 업로드 중 에러 발생: ${err.message}`);
            return;
        }
    }

    return uploadedFilesInfo;
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








// const AWS = require('aws-sdk');
// const fs = require('fs')
// const path = require('path')
// const getRandomFileName = require('../FILENAME/filename.js') // 랜덤파일명을 만들어주는 모듈함수

// const {S3ENDPOINT, S3ACCESS, S3SECRET, S3BUCKETNAME, S3DIRECTORY } = process.env

// const s3 = new AWS.S3({
//     endpoint: S3ENDPOINT,
//     accessKeyId: S3ACCESS,
//     secretAccessKey: S3SECRET,
//     s3ForcePathStyle: true,
//     signatureVersion: 'v4'
// });

// const bucketName = S3BUCKETNAME

// const folderPath = './HR380009/202401/';

// // 파일명과 파일 사이즈를 저장할 배열
// let uploadedFilesInfo = [];

// // 업로드할 이미지 파일 목록
// const imageFiles = [
//     { "fileName": getRandomFileName(), "filePath": path.join(__dirname, '../IMAGEUPLOAD/IMAGE_SAMPLE/image1.png') }, // 해당 경로값등은 프론트에서 전달받게 될것이지만. 일단은 샘플 이미지 파일을 사용
//     { "fileName": getRandomFileName(), "filePath": path.join(__dirname, '../IMAGEUPLOAD/IMAGE_SAMPLE/image2.png') },
//     { "fileName": getRandomFileName(), "filePath": path.join(__dirname, '../IMAGEUPLOAD/IMAGE_SAMPLE/image3.png') },
//     { "fileName": getRandomFileName(), "filePath": path.join(__dirname, '../IMAGEUPLOAD/IMAGE_SAMPLE/image4.png') },
//     { "fileName": getRandomFileName(), "filePath": path.join(__dirname, '../IMAGEUPLOAD/IMAGE_SAMPLE/image5.png') },
// ];

// const fileLength = []

// for (let i = 0; i < imageFiles.length; i++){
//     const filePath = path.join(__dirname, `../IMAGEUPLOAD/IMAGE_SAMPLE/image${i+1}.png`)
//     const fileStats = fs.statSync(filePath);
//     const fileSizeInBytes = fileStats.size;
//     const fileSizeInKB = fileSizeInBytes / 1024;

//     fileLength.push(fileSizeInKB)
// }

// for (const file of imageFiles) {
//     console.log("파일명: " + file.fileName, "파일path : " + file.filePath)
// }
// // 각 이미지 파일을 S3에 업로드하고 파일명과 파일 사이즈를 filesInfo 배열에 저장
// async function uploadImages() {

//     //초기화
//     uploadedFilesInfo = [];

//     for (const file of imageFiles) {
//         const params = {
//             Bucket: bucketName,
//             Key: folderPath + file.fileName,
//             Body: fs.readFileSync(file.filePath)
//         };

//         try {
//             const data = await s3.upload(params).promise()
//                 uploadedFilesInfo.push({ "IMGNAME": file.fileName, "IMGSIZE": "10kb"/*data.ContentLength*/});
//                 console.log(`${file.fileName} 업로드 완료, FILESIZE : ${data.ContentLength}`)
//                 /* 업로드한 파일의 메타데이터에는 ContentLength가 존재하지 않는다.
//                 따라서, 업로드 이전에 용량을 파악하여 업로드할 때 함께 전달해주거나
//                 혹은 업로드 된 파일을 다운로드하는 형식으로 메타데이터를 받아와서 확인해야한다.
//                 해당 과정은 multer을 적용해보고, 수정하도록 할 것. */
//                 console.dir(data)
//         } catch (err) {
//             await rollbackUploadedFiles();
//             console.error(`파일 업로드 중 에러 발생: ${err.message}`);
//         }
//     }

//     return uploadedFilesInfo;
// }

// /* 전송 과정에서 실패하는 부분이 생기면 S3에 업로드 한 부분을 롤백한다 */
// async function rollbackUploadedFiles() {
//     for (const file of uploadedFilesInfo) {
//         const params = {
//             Bucket: bucketName,
//             Key: folderPath + file.IMGNAME
//         };
    
//         try {
//             await s3.deleteObject(params).promise();
//             console.log(`${file.IMGNAME} 삭제 완료`)
//         } catch (err) {
//             console.error(`파일 삭제 중 에러 발생: ${err.message}`);
//         }
//     }
// }
// module.exports = { uploadImages, rollbackUploadedFiles }