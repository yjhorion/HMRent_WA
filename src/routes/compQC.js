/* 상품화완료QC 라우터 */
const express = require('express');
const path = require('path');
const { prisma } = require('../utils/prisma/index.js');
const axios = require('axios');
const crypto= require('crypto');
const iconv = require('iconv-lite');
const getCurrentDateTime = require('../utils/Time/DateTime.js');
const jwt = require('jsonwebtoken');

const router = express.Router()
require('dotenv').config();

const {uploadImages, rollbackUploadedFiles} = require('../utils/IMAGEUPLOAD/COMPQCimageupload.js')

/* multerS3 */
const multer = require('multer');
const multerS3 = require('multer-s3');
const AWS = require('aws-sdk');

const { v4: uuidv4 } = require('uuid');

// const { S3ENDPOINT, S3ACCESS, S3SECRET, S3BUCKETNAME } = process.env;

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

/* COMP-QC GET (3000) */
router.get('/CompQC/:STATUSREQ', authenticateToken, async(req, res, next) => {
    try {
        
    const { year, month, day, hour, minute, second } = getCurrentDateTime();

    console.log('COMPQC 전체조회');
    console.log('로그인한 유저아이디' + req.user.USERID);
    console.log('로그인한 유저비밀번호' + req.user.USERPW);


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
        const { STATUSREQ } = req.params

        const sendingdata = JSON.stringify({
            "request" : {
                "DOCTRDCDE" : "3000",
                "DOCPORTAL" : "M",
                "DOCSNDDAT" : `${year}${month}${day}`,
                "DOCSNDTIM" : `${hour}${minute}${second}`,
                "RGTFLDUSR" : req.user.USERID,
                "RGTFLDPWR" : req.user.USERPW
            },
            "data" : {
                "REQSTATUS" : STATUSREQ // 상품화를 의미하는 STATUS값 - 문서(3000) 참조
            }
        })

        console.log("Encoded secret key : ", secret_key) // Base64 encoded key
        console.log("Encoded Initial Vector : ", IV) // Base64 encoded IV

        if (!secret_key) {
            console.log("No Secret Key.");
            return res.status(500).send('No Secret Key.');
        }

        const encryptedData = encrypt(sendingdata, secret_key, IV);
        const decryptedData = decrypt(encryptedData, secret_key, IV);

        /* ERP에 암호화된 데이터를 보내는 부분 */

        let decryptedresponse;

        const response = await axios.post(testServerUrl, encryptedData, {
            headers: {
                'Content-Type': 'text/plain'
            }
        });

        decryptedresponse = decrypt(response.data, secret_key, IV);
        const parsedResponse = JSON.parse(decryptedresponse);

        // ENTRYLOCATION 값을 매핑된 값으로 치환하는 로직
        const mappedResponse = parsedResponse.map(item => {
            const entryLocation = item.ENTRYLOCATION;
            let newEntryLocation = entryLocation;

            // Code 배열을 순회하며 ENTRYLOCATION의 값을 찾고 치환
            Code.forEach(locationSet => {
                const locationType = Object.keys(locationSet)[0];
                const locations = locationSet[locationType];
                if (locations.hasOwnProperty(entryLocation)) {
                    newEntryLocation = locations[entryLocation];
                }
            });

            // 기존 데이터에 치환된 값을 적용
            return {
                ...item,
                ENTRYLOCATION: newEntryLocation
            };
        });

        /* 프론트에 데이터를 보내는 부분. stringify 되었던 데이터를 parse 해서 json형식으로 보내줌 */
        res.send({
            data: mappedResponse, reqCode
        })

    } catch (error) {
        console.error('통신 에러: ', error.message);
        res.status(500).send('통신 에러');
    }
});



/**********************************************************************************************************************************************************************************************/
/*********************************************************** 사진이 없을 경우의 동작에 대한 예외처리가 필요할 '수'도 있음 **************************************************************************/
/***********************************************************   multerS3를 이용해 실제로 데이터를 넣으면서 확인해볼 것 **************************************************************************/
/**********************************************************************************************************************************************************************************************/

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

router.post('/CompQC/:ASSETNO', upload.array('IMGLIST'), authenticateToken, async (req, res, next) => { // multerS3를 통한 이미지 업로드는 INQC에서 참조하여 구성할 것.
    try {

            // if (!req.files || !req.files.length) {
            //     return res.status(400).send({
            //         message : "이미지없음"
            //     })
            // }

            const { ASSETNO } = req.params;
            console.log('ASSETNO : ', ASSETNO);
            const { year, month, day, hour, minute, second } = getCurrentDateTime();
            console.log('Current DateTime : ', `${year}-${month}-${day} ${hour}:${minute}:${second}`)

            let { MILEAGE, ENTRYLOCATION, DETAILLOCATION, KEYQUANT, KEYTOTAL, KEYLOCATION } = req.body;
            console.log('Recieved body : ', req.body);

            if (!KEYQUANT) {
                KEYQUANT = 1
            }

            if (!KEYTOTAL) {
                KEYTOTAL = 1
            }
            // const { reqCode, USERID, USERPW } = req.session;

            console.log('COMPQC POST');
            console.log('로그인한 유저아이디' + req.user.USERID);
            console.log('로그인한 유저비밀번호' + req.user.USERPW);

            /* session 세팅 이전까지 사용할 하드코딩된 코드값 */
            const reqCode = [
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
              

            /* 프론트에서 받은 차고지 데이터를 코드로 치환 */
            const EntryCode = findKeyByValue(reqCode, ENTRYLOCATION);
            console.log('EntryCode', EntryCode);

            // let uploadedFilesInfo = [];
            // if (req.files && req.files.length > 0) {
                

                //console.log('---------------------req.files---------------------: ', req.files);
    
                const uploadedFilesInfo = req.files ? await uploadImages(req.files) : [];
                if (!uploadedFilesInfo.length) {
                    console.log('이미지 0개')
                }
            // }

                console.log('---------------------uploaded files info--------------------- : ', uploadedFilesInfo);

            const sendingdata = JSON.stringify({
                "request" : {
                    "DOCTRDCDE" : "3001",
                    "DOCPORTAL" : "M",
                    "DOCSNDDAT" :  `${year}${month}${day}`,
                    "DOCSNDTIM" : `${hour}${minute}${second}`,
                    "RGTFLDUSR" : req.user.USERID,
                    "RGTFLDPWR" : req.user.USERPW
                },
                "data" : {
                    "ASSETNO" : ASSETNO,
                    "MILEAGE" : MILEAGE,
                    "ENTRYLOCATION" : EntryCode, // 로그인 시 json형태로 오는 값을, 바탕으로 프론트에서 stringdata를 받으면, 해당 value에 상응하는 키값으로 치환하여 데이터 보낼 것.
                    "DETAILLOCATION" : DETAILLOCATION,
                    "KEYQUANT" : KEYQUANT, // 이 값도 전달받은 값으로 전달. (일관되게 string datatype으로 전달)
                    "KEYTOTAL" : KEYTOTAL, // 프론트와 백에서 (보유수량 =< 총수량) 조건에 맞는 값인지 validate
                    "KEYLOCATION" : KEYLOCATION,
                    "IMGLIST" : uploadedFilesInfo
                }
            })

            console.log(uploadedFilesInfo);


        const encryptedData = encrypt(sendingdata, secret_key, IV);
        const decryptedData = decrypt(encryptedData, secret_key, IV);

        console.log("암호화 값 : ", encryptedData);
        console.log("복호화 값 : ", decryptedData);

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
            return res.status(410).send({
                data: JSON.parse(decryptedresponse),
            })
        } else {
            return res.status(201).send({
                data: JSON.parse(decryptedresponse),
            })
        }        

    } catch (error) {
        await rollbackUploadedFiles() // 이부분이 잘 작동할지 테스트를 아직 못함. 응답서버가 꺼져있다던지 하는경우에 테스트 필요.
        console.error('통신에러: ', error.message);
        console.log('이미지 롤백 시작');
        await rollbackUploadedFiles();
        console.log('이미지 롤백 완료');
        return res.status(500).send('통신 에러');
    }
})

/* 위치정보 저장을 위한 라우터 (3100:GET, 3101:POST) */
router.get('/LOCSET', /*authenticateToken,*/ async(req, res, next) => {
    try {
        
    const { year, month, day, hour, minute, second } = getCurrentDateTime();

    /*

    console.log('위치정보 전체조회');
    console.log('로그인한 유저아이디' + req.user.USERID);
    console.log('로그인한 유저비밀번호' + req.user.USERPW);

    */
    

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
        const { STATUSREQ } = req.params

        const sendingdata = JSON.stringify({
            "request" : {
                "DOCTRDCDE" : "3100",
                "DOCPORTAL" : "M",
                "DOCSNDDAT" : `${year}${month}${day}`,
                "DOCSNDTIM" : `${hour}${minute}${second}`,
                "RGTFLDUSR" : "H202404010", //req.user.USERID,
                "RGTFLDPWR" : "!Ekdzhd123"  //req.user.USERPW
            },
            "data" : {
            }
        })

        console.log("Encoded secret key : ", secret_key) // Base64 encoded key
        console.log("Encoded Initial Vector : ", IV) // Base64 encoded IV

        if (!secret_key) {
            console.log("No Secret Key.");
            return res.status(500).send('No Secret Key.');
        }

        const encryptedData = encrypt(sendingdata, secret_key, IV);
        const decryptedData = decrypt(encryptedData, secret_key, IV);

        console.log("암호화 값 : ", encryptedData);
        console.log("복호화 값 : ", decryptedData)

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

        /* 프론트에 데이터를 보내는 부분. stringify 되었던 데이터를 parse 해서 json형식으로 보내줌 */
        res.send({
            data: JSON.parse(decryptedresponse), reqCode
        })

    } catch (error) {
        console.error('통신 에러: ', error.message);
        res.status(500).send('통신 에러');
    }
});


router.post('/LOCSET/:ASSETNO', /*authenticateToken,*/ async (req, res, next) => { // multerS3를 통한 이미지 업로드는 INQC에서 참조하여 구성할 것.
    try {

            const { ASSETNO } = req.params;
            console.log('ASSETNO : ', ASSETNO);

            const { ENTRYLOCATION, DETAILLOCATION } = req.body;
            const { year, month, day, hour, minute, second } = getCurrentDateTime();
            console.log('Current DateTime : ', `${year}-${month}-${day} ${hour}:${minute}:${second}`)


            // const { reqCode, USERID, USERPW } = req.session;

            /*
            console.log('위치정보 POST');
            console.log('로그인한 유저아이디' + req.user.USERID);
            console.log('로그인한 유저비밀번호' + req.user.USERPW);
            */


            /* session 세팅 이전까지 사용할 하드코딩된 코드값 */
            const reqCode = [
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
              

            /* 프론트에서 받은 차고지 데이터를 코드로 치환 */
            const EntryCode = findKeyByValue(reqCode, ENTRYLOCATION);
            console.log('EntryCode', EntryCode);



            const sendingdata = JSON.stringify({
                "request" : {
                    "DOCTRDCDE" : "3101",
                    "DOCPORTAL" : "M",
                    "DOCSNDDAT" :  `${year}${month}${day}`,
                    "DOCSNDTIM" : `${hour}${minute}${second}`,
                    "RGTFLDUSR" : "H202404010",//req.user.USERID,
                    "RGTFLDPWR" : "!Ekdzhd123" //req.user.USERPW
                },
                "data" : {
                    "ASSETNO" : ASSETNO,
                    "ENTRYLOCATION" : EntryCode, // 로그인 시 json형태로 오는 값을, 바탕으로 프론트에서 stringdata를 받으면, 해당 value에 상응하는 키값으로 치환하여 데이터 보낼 것.
                    "DETAILLOCATION" : DETAILLOCATION
                }
            })


        const encryptedData = encrypt(sendingdata, secret_key, IV);
        const decryptedData = decrypt(encryptedData, secret_key, IV);

        console.log("암호화 값 : ", encryptedData);
        console.log("복호화 값 : ", decryptedData);

        const response = await axios.post(testServerUrl, encryptedData, {
            headers: {
                'Content-Type': 'text/plain'
            }
        });

        const decryptedresponse = decrypt(response.data, secret_key, IV);
        console.log("Response received:", response.data);
        console.log("복호화 된 응답값 :", decryptedresponse);

        /* 응답값이 0000 (처리완료)가 아니라면, 업로드한 이미지를 롤백(삭제)하는 부분 */
        return res.status(201).send({
            data: JSON.parse(decryptedresponse),
        })  

    } catch (error) {
        return res.status(500).send('통신 에러');
    }
})


// ///////////////////////////


// /* 렌더링으로 화면 표시 */
// router.get('/CompQC', async (req, res, next) => {
//     try {
//         const CompQC = await prisma.CompQC.findMany({
//             where : { UpdatedAt : null },
//             orderBy : { CompQCId : "desc" }
//         })

//         if (!CompQC.length) {
//             return res.status(404).json({ message : " 존재하는 상품화완료QC 데이터가 없습니다 "})
//         }

//         if (req.query.carNo) {                                  //차량번호로 검색이 req.query로 들어올 경우, 차량번호로 조회.
//             const { carNo } = req.query
//             const result = await prisma.CompQC.findMany({
//                 where : { carNo: { contains: carNo 
//                 }}
//             })
//             return res.status(200).render('CompQC', { data: result })
//         }

//         return res.status(200).render('CompQC', { data: CompQC })

//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message : error })
//     }
// })

/* GET 요청을 ERP에 전문데이터를 담아 던지는 예시코드

const axios = require('axios');

router.get('/CompQC', async (req, res, next) => {
    try {
        const requestData = {
            // ERP 시스템이 요구하는 데이터 형식에 따라 구성
            // 예를 들어, 필요한 파라미터나 요청 데이터를 추가
            // 예: carNo: req.query.carNo

            // 특정한 메인페이지등에서 조회하는 부분은, 일정한 전문으로 하드코딩
            // 특정 값등이 입력되어야 하는 경우에는 template literal을 이용하여, 전문의 특정부분을 변수처리하여 전송
            // 추가적으로, AES로 암호화 하는 부분이 필요하고, 키등을 공유할 것
        };

        // ERP 시스템으로 요청을 보내는 부분
        const response = await axios.post('http://101.101.218.134:8080/', requestData);

        // ERP 시스템으로부터 받은 데이터를 화면에 렌더링하는 부분
        if (response.status === 200) {
            const CompQC = response.data; // 예를 들어, ERP 시스템에서 받은 데이터가 JSON 형식으로 오는 경우

            if (!CompQC.length) {
                return res.status(404).json({ message: "존재하는 상품화완료QC 데이터가 없습니다" });
            }

            if (req.query.carNo) {
                const { carNo } = req.query;
                const result = CompQC.filter(item => item.carNo.includes(carNo));
                return res.status(200).render('CompQC', { data: result });
            }

            return res.status(200).render('CompQC', { data: CompQC });
        } else {
            return res.status(response.status).json({ message: "ERP 시스템에서 데이터를 가져오는데 실패했습니다" });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error });
    }
});


*/

/* 실행번호를 클릭했을 때, 해당 데이터를 검색하고 리다이렉팅 */
// router.get('/editCompQC/:carNo', async (req, res, next) => {
//     try {
//         const  carNo  = req.params.carNo

//         const data = await prisma.CompQC.findFirst({
//             where : { 
//                 carNo : carNo,
//                 UpdatedAt : null
//              }
//         })

//         if (!data) {
//             return res.status(400).json({ message : "실행번호로 검색된 데이터가 없습니다"})
//         }

//         return res.status(200).json({GUBUN:data.GUBUN, carNo:data.carNo, modelName:data.modelName, mainTstatus:data.mainTstatus})
//     } catch(error) {
//         console.error(error);
//         return res.status(500).json({ message: error })
//     }
// })

/* 실행번호 기반 리다이렉팅 된 페이지로 넘어가는 라우터 */
// router.get('/editCompQC', (req, res) => {
//     const { GUBUN, carNo, modelName, mainTstatus } = req.query;

//     res.render('editCompQC', { GUBUN, carNo, modelName, mainTstatus })
// })

/* 전송버튼을 눌렀을 때, 데이터와 이미지 전송 */
// router.post('/submitCompQC', upload.array('images', 50), async(req, res, next) => {
//     try {
//         const { mileage, entryLocation, detailLocation, remark, KeyAmountPres, KeyAmountTot, KeyLocation, carNo } = req.body;
//         const imageURLs = req.files.map(file => {
//         const decodedFilename = decodeURIComponent(file.originalname);

//         return { filename: decodedFilename, location: file.location}
//     })

//     const CompQCdata = await prisma.CompQC.findFirst({
//         where: { carNo },
//     })

//     const CompQCId = CompQCdata.CompQCId    
    
//     const updateData = await prisma.CompQC.updateMany({  // updatefirst 로 진행했지만, 사실은 findfirst등을 한 이후에 해당 정보를 바꾸고 commit 하거나 rawquery를 사용하는게 더 바람직할 것.
//         where : { carNo },
//         data : {
//             Mileage : +mileage,
//             EntryLocation : entryLocation,
//             DetailLocation : detailLocation,
//             KeyAmountPres : +KeyAmountPres,
//             KeyAmountTot : +KeyAmountTot,
//             KeyLocation : KeyLocation,
//             Remark : remark
//         }
//     })
    
//     /* 이용자가 이미지를 추가했을 때에만 동작하도록 (아닐경우 에러가 발생함으로) */
//     if (req.files || req.files.length !==0) {
        
//         const saveImageURLs = await Promise.all(imageURLs.map(async imageURL => 
//             await prisma.CompQCIMG.create({
//                 data : { 
//                     ImgURL : imageURL.location,
//                     carNo : carNo,
//                     CompQCId : CompQCId
//                 }
//             })
//         ))
//     }
    
    /* req.body 데이터 중 필수데이터가 있다면 이곳에서 if(!mileague)... 등으로 예외처리하고 메세지로 리턴해줄 것. 
    
        schema에는 nullable로 설정되어 있는데이터들 (입력 전에는 null값일 수밖에 없는)이기 때문에, 이곳에서 입력 예외처리 해주거나,
        front에서 전송하기 전 예외처리가 필요함.

        front에서 처리해주는쪽이 더 깔끔하고, 백앤드에서는 데이터 유실확인 목적으로 예외처리할 것.
    */



//     if (!updateData) {
//         return res.status(400).json({ message : "데이터가 존재하지 않습니다. 실행번호를 확인해주세요"})
//     }

//     return res.status(201).json({ data : updateData, message: "업로드 성공" })
// } catch (error) {
//     console.error(error)
//     return res.status(500).json({ message: error})
// }
// })




module.exports = router;