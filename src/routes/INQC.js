/* 입고QC 라우터 */
const express = require('express');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');
const iconv = require('iconv-lite');
const getCurrentDateTime = require('../utils/Time/DateTime.js')

router = express.Router()
require('dotenv').config();

const {uploadImages, rollbackUploadedFiles} = require('../utils/IMAGEUPLOAD/imageupload.js');

/* multerS3 */
const multer = require('multer');
const multerS3 = require('multer-s3');
const AWS = require('aws-sdk');

// const { v4: uuidv4 } = require('uuid');

// const { S3ACCESS, S3SECRET, S3BUCKETNAME } = process.env;

/* multer config/settings */
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


/* 차고지 데이터를 코드로 치환해주는 함수(req.session.reqCode, ENTRYLOCATION)을 인자로 받음 */
function findKeyByValue(sessionCode, value) {
    for (const codeGroup of sessionCode) {
        for (const group in codeGroup) {
            for (const key in codeGroup[group]) {
                if (codeGroup[group][key] === value) {
                    return key;
                }
            }
        }
    }
    return null; // 값이 없을 경우 null 반환
}


/* INQC GET(2000) */
router.get('/INQCNEW', async(req, res, next) =>  {
    try {

    const { year, month, day, hour, minute, second } = getCurrentDateTime();


    /* session 세팅 이전까지 사용할 하드코딩된 코드값 */
    const Code = [
        {
            HR58: {
            HR580003: '아산 차고지',
            HR580004: '상품화센터',
            HR580006: '본사',
            HR580099: '기타',
            HR580001: '하모니파크',
            HR580002: '송도 차고지'
          }
        },
        {
          HR65: {
            HR650001: '기본출고지',
            HR650002: '아산출고지',
            HR650005: '화성출고지',
            HR650006: '광주출고지',
            HR650003: '울산출고지',
            HR650004: '칠곡출고지',
            HR650007: '소하리출고지',
            HR650008: '서산출고지'
          }
        }
    ]

    const reqCode = Code.map(item => {
        const key = Object.keys(item)[0];
        const values = Object.values(item[key]);

        return { [key]: values };
    })

        const sendingdata = JSON.stringify({
            "request" : {
                "DOCTRDCDE" : "2000",
                "DOCPORTAL" : "M",
                "DOCSNDDAT" : `${year}${month}${day}`,
                "DOCSNDTIM" : `${hour}${minute}${second}`,
                "RGTFLDUSR" : "H202404010",//req.session.USERID,
                "RGTFLDPWR" : "!Ekdzhd123"//req.session.USERPW
            },
            "data" : {}
        })

        console.log("Secret Key (Base64):", secret_key.toString('base64'));
        console.log("IV (Base64):", IV.toString('base64'));

        if (!secret_key) {
            console.log("No Secret Key.");
            return res.status(500).send('No Secret Key.');
        }


        const encryptedData = encrypt(sendingdata, secret_key, IV);
        console.log("Encrypted Data:", encryptedData);
        const decryptedData = decrypt(encryptedData, secret_key, IV);
        console.log("Decrypted Data:", decryptedData);



        /* ERP에 암호화된 데이터를 보내는 부분 */

        let decryptedresponse

        const response = await axios.post(testServerUrl, encryptedData, {
            headers: {
                'Content-Type': 'text/plain'
            }
        });

        if (!response.data || response.data == '' || response.data == [])
            {
                decryptedresponse = {}
            } else {
                decryptedresponse = decrypt(response.data, secret_key, IV);
            }

        console.log("Response received:", response.data);
        console.log("복호화 된 응답값 :", decryptedresponse);

        /* 프론트에 데이터를 보내는 부분. stringify 되었던 데이터를 parse 해서 json형식으로 보내줌 */
        res.send({
            data: JSON.parse(decryptedresponse), reqCode
        })

    } catch (error) {
        console.error('통신 에러: ', error.message);
        res.status(500).send('통신 에러');
    }
});









/* INQC GET(2100) */
router.get('/INQCOLD', async(req, res, next) =>  {
    try {

    const { year, month, day, hour, minute, second } = getCurrentDateTime();

    /* session 세팅 이전까지 사용할 하드코딩된 코드값 */
    const Code = [
        {
            HR58: {
                HR580003: '아산 차고지',
                HR580004: '상품화센터',
                HR580006: '본사',
                HR580099: '기타',
                HR580001: '하모니파크',
                HR580002: '송도 차고지'
                }
                },
                {
            HR65: {
                HR650001: '기본출고지',
                HR650002: '아산출고지',
                HR650005: '화성출고지',
                HR650006: '광주출고지',
                HR650003: '울산출고지',
                HR650004: '칠곡출고지',
                HR650007: '소하리출고지',
                HR650008: '서산출고지'
                }
            }
            ]
        
            const reqCode = Code.map(item => {
                const key = Object.keys(item)[0];
                const values = Object.values(item[key]);
        
                return { [key]: values };
            })

        const sendingdata = JSON.stringify({
            "request" : {
                "DOCTRDCDE" : "2100",
                "DOCPORTAL" : "M",
                "DOCSNDDAT" : `${year}${month}${day}`,
                "DOCSNDTIM" : `${hour}${minute}${second}`,
                "RGTFLDUSR" : "H202404010",//req.session.USERID,
                "RGTFLDPWR" : "!Ekdzhd123"//req.session.USERPW
            },
            "data" : {
            }
        })

        if (!secret_key) {
            console.log("No Secret Key.");
            return res.status(500).send('No Secret Key.');
        }

        const encryptedData = encrypt(sendingdata, secret_key, IV);
        const decryptedData = decrypt(encryptedData, secret_key, IV);

        console.log("암호화 값 : ", encryptedData);
        console.log("복호화 값 : ", decryptedData);

        /* ERP에 암호화된 데이터를 보내는 부분 */

        let decryptedresponse

        const response = await axios.post(testServerUrl, encryptedData, {
            headers: {
                'Content-Type': 'text/plain'
            }
        });

        if (!response.data || response.data == '' || response.data == [])
            {
                decryptedresponse = {}
            } else {
                decryptedresponse = decrypt(response.data, secret_key, IV);
            }

        console.log("Response received:", response.data);
        console.log("복호화 된 응답값 :", decryptedresponse);

        /* 프론트에 데이터를 보내는 부분. stringify 되었던 데이터를 parse 해서 json형식으로 보내줌 */
        res.send({
            data: JSON.parse(decryptedresponse), reqCode
        })

    } catch (error) {
        console.error('통신 에러: ', error.message);
        res.status(500).send('통신 에러');
    }
});











/* INQC POST(2001) */
router.post('/INQCNEW', upload.array('IMGLIST'), async(req, res, next) =>  {
    try {

    const { ASSETNO, MILEAGE, DEPARTLOCATION, ENTRYLOCATION, DETAILLOCATION } = req.body;
    const { year, month, day, hour, minute, second } = getCurrentDateTime();

    /* session 세팅 이전까지 사용할 하드코딩된 코드값 */
    const reqCode = [
        {
            HR58: {
                HR580003: "아산 차고지",
                HR580004: "상품화센터",
                HR580006: "본사",
                HR580099: "기타",
                HR580001: "하모니파크",
                HR580002: "송도 차고지"
            }
        },
        {
            HR65: {
                HR650001: "기본출고지",
                HR650002: "아산출고지",
                HR650005: "화성출고지",
                HR650006: "광주출고지",
                HR650003: "울산출고지",
                HR650004: "칠곡출고지",
                HR650007: "소하리출고지",
                HR650008: "서산출고지"
            }
        }
    ];
        
        // const uploadedFilesInfo = await uploadImages(req.files);
        // console.log('Uploaded Files Info: ', uploadedFilesInfo);

        // const reqCode = Code.map(item => {
        //     const key = Object.keys(item)[0];
        //     const values = Object.values(item[key]);
        
        //     return { [key]: values };
        // })


        console.log('받아오는 데이터 그 자체 : ',  DEPARTLOCATION)
        
        /* 프론트에서 받은 출고지 데이터를 코드로 치환 */
        const DepartCode = findKeyByValue(reqCode, DEPARTLOCATION);
        if (!DepartCode) {
            console.error('Invalid DEPARTLOCATION:', DEPARTLOCATION);
            return res.status(400).send('Invalid DEPARTLOCATION.');
        }
        console.log('DepartCode', DepartCode);

        /* 프론트에서 받은 차고지 데이터를 코드로 치환 */
        const EntryCode = findKeyByValue(reqCode, ENTRYLOCATION);
        if (!EntryCode) {
            console.error('Invalid ENTRYLOCATION:', ENTRYLOCATION);
            return res.status(400).send('Invalid ENTRYLOCATION.');
        }
        console.log('EntryCode', EntryCode);

        const uploadedFilesInfo = await uploadImages(req.files);
        if (!uploadedFilesInfo.length) {
            return res.status(400).json({ message : '이미지 0개'})
        }

        console.log(uploadedFilesInfo);
                
        const sendingdata = JSON.stringify({
            "request" : {
                "DOCTRDCDE" : "2001",
                "DOCPORTAL" : "M",
                "DOCSNDDAT" : `${year}${month}${day}`,
                "DOCSNDTIM" : `${hour}${minute}${second}`,
                "RGTFLDUSR" : "H202404010",//req.session.USERID,
                "RGTFLDPWR" : "!Ekdzhd123"//req.session.USERPW
            },
            "data" : {
                "ASSETNO" : ASSETNO,
                "MILEAGE" : MILEAGE,
                "DEPARTLOCATION" : DepartCode,
                "ENTRYLOCATION" : EntryCode,
                "DETAILLOCATION" : DETAILLOCATION,
                "IMGLIST" : uploadedFilesInfo
            }
        })

        if (!secret_key) {
            console.log("No Secret Key.");
            return res.status(500).send('No Secret Key.');
        }

        const encryptedData = encrypt(sendingdata, secret_key, IV);
        const decryptedData = decrypt(encryptedData, secret_key, IV);

        console.log("암호화 값 : ", encryptedData);
        console.log("복호화 값 : ", decryptedData);

        /* ERP에 암호화된 데이터를 보내는 부분 */
        const response = await axios.post(testServerUrl, encryptedData, {
            headers: {
                'Content-Type': 'text/plain'
            }
        });

       

        const decryptedresponse = decrypt(response.data, secret_key, IV);
        console.log("Response received:", response.data);
        console.log("복호화 된 응답값 :", decryptedresponse);


        /* 응답값이 0000 (처리완료)가 아니라면, 업로드한 이미지를 롤백(삭제)하는 부분 */
        if (JSON.parse(decryptedresponse).result.CODE !== "0000"){
            await rollbackUploadedFiles()
        /* 프론트에 데이터를 보내는 부분. stringify 되었던 데이터를 parse 해서 json형식으로 보내줌 */
            return res.status(410).send({
                data: JSON.parse(decryptedresponse), reqCode
            })
        } else {
        /* 프론트에 데이터를 보내는 부분. stringify 되었던 데이터를 parse 해서 json형식으로 보내줌 */
            return res.status(201).send({
                data: JSON.parse(decryptedresponse), reqCode
            })
        }        
        

    } catch (error) {
        console.error('통신 에러: ', error.message);
        res.status(500).send('통신 에러');
    }
});











/* INQC POST(2101) */
router.post('/INQCOLD',  upload.array('IMGLIST'), async(req, res, next) =>  {
    try {

    const { ASSETNO, SEQNO, MILEAGE, ENTRYLOCATION, DETAILLOCATION } = req.body;
    const { year, month, day, hour, minute, second } = getCurrentDateTime();

    /* session 세팅 이전까지 사용할 하드코딩된 코드값 */
    const Code = [
        {
            HR58: {
                HR580003: '아산 차고지',
                HR580004: '상품화센터',
                HR580006: '본사',
                HR580099: '기타',
                HR580001: '하모니파크',
                HR580002: '송도 차고지'
                }
                },
                {
            HR65: {
                HR650001: '기본출고지',
                HR650002: '아산출고지',
                HR650005: '화성출고지',
                HR650006: '광주출고지',
                HR650003: '울산출고지',
                HR650004: '칠곡출고지',
                HR650007: '소하리출고지',
                HR650008: '서산출고지'
                }
            }
        ]
        
        // const uploadedFilesInfo = await uploadImages(req.files);
        // console.log('Uploaded Files Info: ', uploadedFilesInfo);

        const uploadedFilesInfo = await uploadImages(req.files);
        if (!uploadedFilesInfo.length) {
            return res.status(400).json({ message : '이미지 0개'})
        }

        const reqCode = Code.map(item => {
            const key = Object.keys(item)[0];
            const values = Object.values(item[key]);
        
            return { [key]: values };
        })

        /* 프론트에서 받은 차고지 데이터를 코드로 치환 */
        const EntryCode = findKeyByValue(reqCode, ENTRYLOCATION);
        console.log('EntryCode', EntryCode);

                
        const sendingdata = JSON.stringify({
            "request" : {
                "DOCTRDCDE" : "2101",
                "DOCPORTAL" : "M",
                "DOCSNDDAT" : `${year}${month}${day}`,
                "DOCSNDTIM" : `${hour}${minute}${second}`,
                "RGTFLDUSR" : "H202404010",//req.session.USERID,
                "RGTFLDPWR" : "!Ekdzhd123"//req.session.USERPW
            },
            "data" : {
                "ASSETNO" : ASSETNO,
                "SEQNO" : SEQNO,
                "MILEAGE" : MILEAGE,
                "ENTRYLOCATION" : EntryCode,
                "DETAILLOCATION" : DETAILLOCATION,
                "IMGLIST" : uploadedFilesInfo
            }
        })

        if (!secret_key) {
            console.log("No Secret Key.");
            return res.status(500).send('No Secret Key.');
        }

        const encryptedData = encrypt(sendingdata, secret_key, IV);
        const decryptedData = decrypt(encryptedData, secret_key, IV);

        console.log("암호화 값 : ", encryptedData);
        console.log("복호화 값 : ", decryptedData);

        /* ERP에 암호화된 데이터를 보내는 부분 */

        let decryptedresponse

        const response = await axios.post(testServerUrl, encryptedData, {
            headers: {
                'Content-Type': 'text/plain'
            }
        });

        decryptedresponse = decrypt(response.data, secret_key, IV);
        console.log("Response received:", response.data);
        console.log("복호화 된 응답값 :", decryptedresponse);

                /* 응답값이 0000 (처리완료)가 아니라면, 업로드한 이미지를 롤백(삭제)하는 부분 */
                if (JSON.parse(decryptedresponse).result.CODE !== "0000"){
                    await rollbackUploadedFiles()
                /* 프론트에 데이터를 보내는 부분. stringify 되었던 데이터를 parse 해서 json형식으로 보내줌 */
                    return res.status(410).send({
                        data: JSON.parse(decryptedresponse), reqCode
                    })
                } else {
                /* 프론트에 데이터를 보내는 부분. stringify 되었던 데이터를 parse 해서 json형식으로 보내줌 */
                    return res.status(201).send({
                        data: JSON.parse(decryptedresponse), reqCode
                    })
                }        
        
    } catch (error) {
        console.error('통신 에러: ', error.message);
        res.status(500).send('통신 에러');
    }
});

module.exports = router;