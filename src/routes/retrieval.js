/* 회수차량 조회 라우터 (4000) */

const express = require('express');
const path = require('path');
const { prisma } = require('../utils/prisma/index.js');
const getCurrentDateTime = require('../utils/Time/DateTime.js');
const crypto= require('crypto');
const iconv = require('iconv-lite');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const sharp = require('sharp');
// const { getDeviceType } = require('../utils/DEVICEDETECTOR/devicedetector.js');

router = express.Router()

require('dotenv').config();

const {uploadImages, rollbackUploadedFiles} = require('../utils/IMAGEUPLOAD/RETRVimageupload.js')

/* multerS3 */
const multer = require('multer');
const multerS3 = require('multer-s3');
const AWS = require('aws-sdk');

const { v4: uuidv4 } = require('uuid');

const storage = multer.memoryStorage();

const upload = multer({
    storage : storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 파일 크기 제한
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('이미지 파일만 업로드 가능합니다.'));
        }
        cb(null, true)
    }
});

// .env에서 ERP서버 주소, 암호화 키 가져오고 정의
const testServerUrl = process.env.testServerUrl
const secret_key = Buffer.from(process.env.CRYPTO_SECRET_KEY, 'utf8')
const IV         = Buffer.from(process.env.IV, 'utf8')


/* 암호화 함수 */
function encrypt(text, key, iv) {
    const encodedText = iconv.encode(text, 'euc-kr'); // encode into 'euc-kr first before encrypting'
    const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
    let encrypted = cipher.update(encodedText, 'euc-kr', 'base64');
    encrypted += cipher.final('base64'); 
    return encrypted;
}

/* 복호화 함수 */
function decrypt(encrypted, key, iv) {
    const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
    let decrypted = decipher.update(Buffer.from(encrypted, 'base64'));
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return iconv.decode(decrypted, 'euc-kr');
}

// jwt 토근값에서 아이디 비밀번호 가져오기
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// 날자 조작을 위한 헬퍼 함수
function addMonths(date, months) {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months );

    // 월값이 음수나 12 이상의 경우, setMonth가 자동으로 연도를 조정해 줌
    return d;
}


/* 회수차량 조회 */
router.get('/retrieval', authenticateToken, async (req, res, next) => {
    try{
        const { year, month, day, hour, minute, second } = getCurrentDateTime();

        // 현재 날짜 기준으로 -3개월과 +1개월의 날자를 꼐산
        const currentDate = new Date(year, month - 1, day); // 월은 0부터 시작하므로 -1
        const startDate = addMonths(currentDate, -3); // -3개월
        const endDate = addMonths(currentDate, 1); // +1개월

        const QRDATBEG = req.params.QRDATBEG || `${startDate.getFullYear()}${(startDate.getMonth() + 1).toString().padStart(2, '0')}${startDate.getDate().toString().padStart(2, '0')}`;
        const QRDATEND = req.params.QRDATND || `${endDate.getFullYear()}${(endDate.getMonth() + 1).toString().padStart(2, '0')}${endDate.getDate().toString().padStart(2, '0')}`;

        console.log('시작일',QRDATBEG)
        console.log('종료일',QRDATEND)

        console.log('회수차량 조회');
        console.log('로그인한 유저아이디' + req.user.USERID);
        console.log('로그인한 유저비밀번호' + req.user.USERPW);

        const sendingdata = JSON.stringify({
            "request" : {
                "DOCTRDCDE" : "4000",
                "DOCPORTAL" : "M",
                "DOCSNDDAT" : `${year}${month}${day}`,
                "DOCSNDTIM" : `${hour}24${minute}${second}`,
                "RGTFLDUSR" : req.user.USERID,
                "RGTFLDPWR" : req.user.USERPW
            },
            "data" : {
                "RETSTS" : "", // 회수완료여부 null - 전체 , "A" - 회수완료 , "B" - 회수요청
                "QRCRTRA" : "A", // 조회조건 "A" - 요청일자, "B" - 지급일자, "C" - 완료일자 -- 프론트에서 값을 전달받아 전달.
                "QRDATBEG" : QRDATBEG, //QRDATBEG, // 조회일자시작일 - YYYYMMDD 포멧으로 프론트에서 값을 받아서 전달. reqbody에 해당  값이 빈 string 혹은 null 일경우, 현재날자 값
                "QRDATEND" : QRDATEND, // 조회일자종료일 - YYYYMMDD 포멧으로 프론트에서 값을 받아서 전달. reqbody에 해당  값이 빈 string 혹은 null 일경우, 현재날자 값
            }
        })

        if (!secret_key) {
            console.log("No Secret Key.")
            return res.status(500).send('No Secret Key. 암호화 문제')
        }

        const encryptedData = encrypt(sendingdata, secret_key, IV);
        const decryptedData = decrypt(encryptedData, secret_key, IV);

        //console.log("암호화 값 : ", encryptedData);
        //console.log("복호화 값 : ", decryptedData);

        /* ERP에 암호화된 데이터를 보내는 부분 */

        const response = await axios.post(testServerUrl, encryptedData, {
            headers: {
                'Content-Type' : 'text/plain'
            }
        });

        const decryptedresponse = decrypt(response.data, secret_key, IV);
        //console.log("Response received:", response.data);
        //console.log("복호화 된 응답값 :", decryptedresponse);

        /* 프론트에 데이터를 보내는 부분. stringify 되었던 데이터를 parse 해서 json로 치환한 후 보내줌 */
        res.send({
            data : JSON.parse(decryptedresponse),
        });

    } catch (error) {
        console.log(error);
        next(error);
    }
})

/* 회수대상 이미지 업로드, 비고수정 */
router.post('/retrieval/:ASSETNO/:SEQNO', upload.array('IMGLIST'), authenticateToken, async (req, res, next) => {
    try {
        const { year, month, day, hour, minute, second } = getCurrentDateTime();
        const { ASSETNO, SEQNO } = req.params;
        const { BIGO } = req.body;

        console.log('회수대상 이미지 업로드');
        console.log('로그인한 유저아이디: ' + req.user.USERID);
        console.log('로그인한 유저비밀번호: ' + req.user.USERPW);

        console.log(`-- 받아온 정보 --
                    자산번호: ${ASSETNO}, 순번: ${SEQNO}, 비고: ${BIGO}`);

        // 이미지 리사이징 작업 (비율유지)
        const resizedImages = await Promise.all(
            req.files.map(async (file) => {
                try {
                    const resizedBuffer = await sharp(file.buffer)
                        .resize({
                            width: 800, // 가로 800px
                            withoutEnlargement: true // 원본보다 큰 경우는 확대하지 않음
                        })
                        .toBuffer();

                    return {
                        ...file,
                        buffer: resizedBuffer,
                    };
                } catch (error) {
                    console.error(`리사이징 실패: ${error.message}`);
                    return null; // 리사이징 실패 시 null 반환
                }
            })
        );

        // 리사이징된 이미지가 null인 경우를 로그로 남김
        resizedImages.forEach((image, index) => {
            if (image === null) {
                console.error(`파일 인덱스 ${index}: 리사이징 실패`);
            }
        });

        // S3에 리사이징된 이미지 업로드
        const uploadedFilesInfo = resizedImages.filter(image => image !== null).length
            ? await uploadImages(resizedImages.filter(image => image !== null))
            : [];
        if (!uploadedFilesInfo.length) {
            console.log('이미지 0개');
        }

        console.log('---------------------uploaded files info--------------------- : ', uploadedFilesInfo);

        const sendingdata = JSON.stringify({
            "request": {
                "DOCTRDCDE": "4001",
                "DOCPORTAL": "M",
                "DOCSNDDAT": `${year}${month}${day}`,
                "DOCSNDTIM": `${hour}24${minute}${second}`,
                "RGTFLDUSR": req.user.USERID,
                "RGTFLDPWR": req.user.USERPW
            },
            "data": {
                "ASSETNO": ASSETNO,            // 자산번호
                "SEQNO": SEQNO,                // 순번
                "BIGO": BIGO,                  // 비고
                "IMGLIST": uploadedFilesInfo  // 이미지
            }
        });

        console.log(uploadedFilesInfo);

        if (!secret_key) {
            console.log("No Secret Key.");
            return res.status(500).send('No Secret Key. 암호화 문제');
        }

        const encryptedData = encrypt(sendingdata, secret_key, IV);
        const decryptedData = decrypt(encryptedData, secret_key, IV);

        console.log("암호화 값: ", encryptedData);
        console.log("복호화 값: ", decryptedData);

        /* ERP에 암호화된 데이터를 보내는 부분 */

        let decryptedresponse;

        const response = await axios.post(testServerUrl, encryptedData, {
            headers: {
                'Content-Type': 'text/plain'
            }
        });

        decryptedresponse = decrypt(response.data, secret_key, IV);
        console.log("Response received:", response.data);
        console.log("복호화 된 응답값:", decryptedresponse);

        /* 프론트에 데이터를 보내는 부분. 응답값이 0000 (처리완료)가 아니라면 롤백, else, stringify 되었던 데이터를 parse 해서 json로 치환한 후 보내줌 */
        if (JSON.parse(decryptedresponse).result.CODE !== "0000") {
            console.log(`-----롤백 진행----- 
                        진행사유: ${decryptedresponse}`);
            await rollbackUploadedFiles();
            return res.status(410).send({
                data: JSON.parse(decryptedresponse)
            });
        } else {
            res.send({
                data: JSON.parse(decryptedresponse)
            });
        }

    } catch (error) {
        console.log('통신 에러: ', error.message);
        res.status(500).send('통신 에러');
        console.log('이미지 롤백 시작');
        await rollbackUploadedFiles();
        console.log('이미지 롤백 완료');
    }
});

module.exports = router;