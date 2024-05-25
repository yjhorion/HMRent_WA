/* 상품화완료QC 라우터 */
const express = require('express')
const path = require('path');
const { prisma } = require('../utils/prisma/index.js')
const axios = require('axios');
const crypto= require('crypto');
const iconv = require('iconv-lite');

require('dotenv').config();

const router = express.Router()
const getCurrentDateTime = require('../utils/Time/DateTime.js');

const {uploadImages, rollbackUploadedFiles} = require('../utils/IMAGEUPLOAD/imageupload.js')

/* multerS3 */
const multer = require('multer');
const multerS3 = require('multer-s3');
const AWS = require('aws-sdk');

const { v4: uuidv4 } = require('uuid');

require('dotenv').config();

const { S3ENDPOINT, S3ACCESS, S3SECRET, S3BUCKETNAME } = process.env;

/* multer config/settings */
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
    endpoint: S3ENDPOINT,
    accessKeyId: S3ACCESS,
    secretAccessKey: S3SECRET,
    s3ForcePathStyle: true,
    region: 'us-east-1'         // 전역 설정을 무시하고 s3객체 생성시에 명시된 설정을 우선시해서, 서비스를 특정할 때 사용할 수 있음. (명시적 구분을 위해 다시 설정)
});

const upload = multer({         // 프론트에서 전송버튼이 구현되면, multer를 이용해서 버켓에 데이터를 저장한다.
    storage: multerS3({
        s3: s3,
        bucket: S3BUCKETNAME,
        acl: 'public-read',
        limits: { fileSize: 5 * 1024 * 1024},
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: function(req, file, cb) {
            const currentDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const ext = path.extname(file.originalname);
            const carNo = req.body.carNo;
            const fileName = `${carNo}`
            const shortUUID = uuidv4().split('-')[0]
            cb(null,  `${shortUUID}-${carNo}-${ext}`)
        }
    })
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




/* COMP-QC GET (3000) */
/* /CompQC의 렌더링 부분이 프론트로 전달되는 방식으로 구현 된 이후에 endpoint 변경할 것. */
router.get('/com-test/dev/CompQC', async (req, res, next) => {
    try {
        // const user = req.session.user;  
        // const USERID = user.USERID

        const { year, month, day, hour, minute, second } = getCurrentDateTime();

        const sendingdata = JSON.stringify({
            "request" : {
                "DOCTRDCDE" : "3000",
                "DOCPORTAL" : "M",
                "DOCSNDDAT" : `${year}${month}${day}`,
                "DOCSNDTIM" : `${hour}24${minute}${second}`,
                "RGTFLDUSR" : `H202404010`, // req.session.user.USERID로 담아 보낼 것. 테스트 단계에서만 하드코딩 된 데이터 전송
                "RGTFLDPWR" : '!Ekdzhd123', // req.session.user.USERPW
            },
            "data" : {
                "REQSTATUS" : "D" // 상품화를 의미하는 STATUS값 - 문서(3000) 참조
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
            data: JSON.parse(decryptedresponse).data.REPT,
        })

    } catch (error) {
        console.error('통신 에러: ', error.message);
        res.status(500).send('통신 에러');
    }
});

router.post('/com-test/dev/CompQC/:ASSETNO', async (req, res, next) => { // multerS3를 통한 이미지 업로드는 INQC에서 참조하여 구성할 것.
    try {
        const { ASSETNO }= req.params;
        // const { MILEAGE, ENTRYLOCATION, DETAILLOCATION, KEYQUANT, KEYTOTAL, KEYLOCATION, BIGO } = req.body; // 프론트가 구현되면 바디에서 받아올 것.
        const { year, month, day, hour, minute, second } = getCurrentDateTime();

        const uploadedFilesInfo = uploadImages();

        const sendingdata = JSON.stringify({
            "request" : {
                "DOCTRDCDE" : "3100",
                "DOCPORTAL" : "M",
                "DOCSNDDAT" :  `${year}${month}${day}`,
                "DOCSNDTIM" : `${hour}24${minute}${second}`,
                "RGTFLDUSR" : `H202404010`, // req.session.user.USERID로 담아 보낼 것. 테스트 단계에서만 하드코딩 된 데이터 전송
                "RGTFLDPWR" : '!Ekdzhd123', // req.session.user.USERPW
            },
            "data" : {
                "ASSETNO" : ASSETNO,
                "MILEAGE" : "100",
                "ENTRYLOCATION" : "HR580001", // 로그인 할 때 받아 온 코드값을 통해, 프론트에서 text로 전달받은 입고위치를 코드로 치환해서 전달 (프론트에서는 드랍다운 메뉴에서 선택하는 형식)
                "DETAILLOCATION" : "차량상세위치value",
                "KEYQUANT" : "2", // 이 값도 전달받은 값으로 전달. (일관되게 string datatype으로 전달)
                "KEYTOTAL" : "3", // 프론트와 백에서 (보유수량 =< 총수량) 조건에 맞는 값인지 validate
                "KEYLOCATION" : "차키보관위치value",
                "BIGO" : "",
                "IMGLIST" : uploadedFilesInfo
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

        /* 프론트에 데이터를 보내는 부분. stringify 되었던 데이터를 parse 해서 json형식으로 보내줌 */
        res.send({
            data: JSON.parse(decryptedresponse).data,
        })
        

    } catch (error) {
        console.error('통신에러: ', error.message);
        await rollbackUploadedFiles(); // 중간에 에러가 발생하여 router가 모든 작업을 마무리하지 못했을 경우, 버켓에 업로드한 데이터 롤백
        res.status(500).send('통신 에러');
    }
})


























///////////////////////////


/* 렌더링으로 화면 표시 */
router.get('/CompQC', async (req, res, next) => {
    try {
        const CompQC = await prisma.CompQC.findMany({
            where : { UpdatedAt : null },
            orderBy : { CompQCId : "desc" }
        })

        if (!CompQC.length) {
            return res.status(404).json({ message : " 존재하는 상품화완료QC 데이터가 없습니다 "})
        }

        if (req.query.carNo) {                                  //차량번호로 검색이 req.query로 들어올 경우, 차량번호로 조회.
            const { carNo } = req.query
            const result = await prisma.CompQC.findMany({
                where : { carNo: { contains: carNo 
                }}
            })
            return res.status(200).render('CompQC', { data: result })
        }

        return res.status(200).render('CompQC', { data: CompQC })

    } catch (error) {
        console.error(error);
        res.status(500).json({ message : error })
    }
})

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
router.get('/editCompQC/:carNo', async (req, res, next) => {
    try {
        const  carNo  = req.params.carNo

        const data = await prisma.CompQC.findFirst({
            where : { 
                carNo : carNo,
                UpdatedAt : null
             }
        })

        if (!data) {
            return res.status(400).json({ message : "실행번호로 검색된 데이터가 없습니다"})
        }

        return res.status(200).json({GUBUN:data.GUBUN, carNo:data.carNo, modelName:data.modelName, mainTstatus:data.mainTstatus})
    } catch(error) {
        console.error(error);
        return res.status(500).json({ message: error })
    }
})

/* 실행번호 기반 리다이렉팅 된 페이지로 넘어가는 라우터 */
router.get('/editCompQC', (req, res) => {
    const { GUBUN, carNo, modelName, mainTstatus } = req.query;

    res.render('editCompQC', { GUBUN, carNo, modelName, mainTstatus })
})

/* 전송버튼을 눌렀을 때, 데이터와 이미지 전송 */
router.post('/submitCompQC', upload.array('images', 50), async(req, res, next) => {
    try {
        const { mileage, entryLocation, detailLocation, remark, KeyAmountPres, KeyAmountTot, KeyLocation, carNo } = req.body;
        const imageURLs = req.files.map(file => {
        const decodedFilename = decodeURIComponent(file.originalname);

        return { filename: decodedFilename, location: file.location}
    })

    const CompQCdata = await prisma.CompQC.findFirst({
        where: { carNo },
    })

    const CompQCId = CompQCdata.CompQCId    
    
    const updateData = await prisma.CompQC.updateMany({  // updatefirst 로 진행했지만, 사실은 findfirst등을 한 이후에 해당 정보를 바꾸고 commit 하거나 rawquery를 사용하는게 더 바람직할 것.
        where : { carNo },
        data : {
            Mileage : +mileage,
            EntryLocation : entryLocation,
            DetailLocation : detailLocation,
            KeyAmountPres : +KeyAmountPres,
            KeyAmountTot : +KeyAmountTot,
            KeyLocation : KeyLocation,
            Remark : remark
        }
    })
    
    /* 이용자가 이미지를 추가했을 때에만 동작하도록 (아닐경우 에러가 발생함으로) */
    if (req.files || req.files.length !==0) {
        
        const saveImageURLs = await Promise.all(imageURLs.map(async imageURL => 
            await prisma.CompQCIMG.create({
                data : { 
                    ImgURL : imageURL.location,
                    carNo : carNo,
                    CompQCId : CompQCId
                }
            })
        ))
    }
    
    /* req.body 데이터 중 필수데이터가 있다면 이곳에서 if(!mileague)... 등으로 예외처리하고 메세지로 리턴해줄 것. 
    
        schema에는 nullable로 설정되어 있는데이터들 (입력 전에는 null값일 수밖에 없는)이기 때문에, 이곳에서 입력 예외처리 해주거나,
        front에서 전송하기 전 예외처리가 필요함.

        front에서 처리해주는쪽이 더 깔끔하고, 백앤드에서는 데이터 유실확인 목적으로 예외처리할 것.
    */



    if (!updateData) {
        return res.status(400).json({ message : "데이터가 존재하지 않습니다. 실행번호를 확인해주세요"})
    }

    return res.status(201).json({ data : updateData, message: "업로드 성공" })
} catch (error) {
    console.error(error)
    return res.status(500).json({ message: error})
}
})




module.exports = router;