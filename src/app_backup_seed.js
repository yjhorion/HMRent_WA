const express = require('express');
const multer = require('multer');
const morgan = require('morgan');
const path = require('path');
const AWS = require('aws-sdk');
const multerS3 = require('multer-s3');
const { v4: uuidv4 } = require('uuid');
const bodyParser = require('body-parser');
const axios = require('axios');
const getCurrentDateTime = require('./utils/Time/DateTime.js')
const { KISA_SEED_CBC } = require('kisa-seed')

const listRouter = require('./routes/list.js')
const landingRouter = require('./routes/landing.js')
const retrievalRouter = require('./routes/retrieval.js')
const INCQRouter = require('./routes/INQC.js')
const compQCRouter = require('./routes/compQC.js')
const RetVehicleRouter = require('./routes/RetVehicle.js')
const reservationRouter = require('./routes/reservation.js')
const dismissedRouter = require('./routes/dismissed.js')

require('dotenv').config();

const { prisma } = require('./utils/prisma/index.js');
const { resolvePtr } = require('dns');
// router = express.Router()

const app = express();
const PORT = 3000;

const { S3ACCESS, S3SECRET, S3BUCKETNAME } = process.env;

app.use(morgan('combined'));
/* multer 부분 주석처리 (중복업로드됨) 

// AWS SDK configuration
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

// S3 configuration
const s3 = new AWS.S3({
    accessKeyId: S3ACCESS,
    secretAccessKey: S3SECRET,
    region: 'us-east-1'         // 전역 설정을 무시하고 s3객체 생성시에 명시된 설정을 우선시해서, 서비스를 특정할 때 사용할 수 있음. (명시적 구분을 위해 다시 설정)
});

// S3 configuration 
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
            const shortUUID = uuidv4().split('-')[0]
            cb(null,  `${shortUUID}-${carNumber}-${currentDate}${ext}`)
        }
    })
});

// 이미지 업로드를 라우트
app.post('/upload', upload.array('images', 50), async (req, res, next) => {
    
    try{
        console.log('업로드된 파일 정보:', req.files);
        
        const VehicleNumber = req.body.carNumber
        console.log("차량번호 콘솔 여기 >>>>>>>>>>" + VehicleNumber)

        const RecentPost = await prisma.vehicles.create({ 
            data : { VehicleNumber }
        })

        const imageURLs = req.files.map(file => {
            const decodedFilename = decodeURIComponent(file.originalname);
            const vehicleNumber = decodedFilename.split('-')[1]
            
            return { filename: decodedFilename, location: file.location, vehicleNumber };
        }); 
        
        const VehicleId = RecentPost.VehicleId

        // 차량 이미지에 대한 데이터를 저장하는 곳. VehicleId 값을 어떻게 가져올지 미구현. 
        for (i = 0; i < imageURLs.length; i++) {
            await prisma.vehicleImages.create({
            data : { VehicleId, ImgURL: imageURLs[i].location, VehicleNumber}
        })

        }

        
        res.json({ imageURLs });
    } catch (error) {
        console.log(error);
        next(error)
    }
 
});
*/

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true}));
app.use(bodyParser.json());
app.set('view engine', 'ejs');          // ejs 템플릿 엔진 세팅부분.
app.set('views', path.join(__dirname, '../views')) // views 디렉토리에 파일이 있다고 가정. 디렉토리 위치수정 필요

app.use('/', listRouter, landingRouter, retrievalRouter, INCQRouter, compQCRouter, RetVehicleRouter, reservationRouter, dismissedRouter)

app.get('/', (req,res) => {
    res.sendFile('index.html', { root: __dirname });
});



// 이미지 delete를 라우트


/** 구현부 s3.deleteObject를 이용해서 delete를 구현.
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 */

/* ERP 통신이 되는지 확인 (개발)*/

app.get('/com-test/dev', async (req, res, next) => {
    try {
        const { year, month, day, hour, minute, second } = getCurrentDateTime();
        const testServerUrl = 'http://192.168.0.80:8080/OnlineWebAppServlet';

        // .env에서 암호화 키 가져오고 정의
        const secret_key = btoa(process.env.CRYPTO_SECRET_KEY)
        const IV         = btoa(process.env.IV)

        console.log("Encoded secret key : ", secret_key) // Base64 encoded key
        console.log("Encoded Initial Vector : ", IV) // Base64 encoded IV

        if (!secret_key) {
            console.log("No Secret Key.");
            return res.status(500).send('No Secret Key.');
        }

        /* 전송할 데이터 (obj 전체를 암호화 하는 function) */

        // const encryptObject = (obj, secretKey) => {
        //     // obj가 string 일 경우
        //     if (typeof obj === 'string') {
        //         return encrypt(obj, secretKey)
        //     }
        
        //     // obj가 array 일 경우 각각을 암호화
        //     if (Array.isArray(obj)) {
        //         return obj.map(item => encryptObject(item, secretKey));
        //     }

        //     // obj가 object인 경우, 각각의 값을 암호화
        //     if(typeof obj === 'object' && obj !==null) {
        //         const encryptedObj = {};
        //         for (const key in obj) {
        //             encryptedObj[key] = encryptObject(obj[key], secretKey);
        //         }
        //         return encryptedObj;
        //     }

        //     return obj;
        // };





        // body에 포함할 데이터
        const requestBody = {
            "request" : {
                "DOCREQNBR" : "전문번호",
                "DOCTRDCDE" : "거래구분코드",
                "DOCPORTAL" : "M",
                "DOCSNDDAT" : `${year}${month}${day}`,
                "DOCSNDTIM" : `${hour}24${minute}${second}`,
                //'msgkey' : encrypt('msgvalue', secret_key)
            },
            "data": {
                "testkey1": "testvalue1"
            }
        };

        // 전체 암호화를 위해 requestBody를 stringify
        const serializedRequestBody = JSON.stringify(requestBody);

        console.log(serializedRequestBody)


        const sendingdata = "xxxxxxx"

        /* base64의 format을 가지고 있는지 확인하기위한 툴 */
        // const isBase64 = (str) => {
        //     try {
        //       return btoa(atob(str)) === str;
        //     } catch (error) {
        //       return false;
        //     }
        //   };

        // console.log("iv 인코딩 : ", isBase64(iv))
        // console.log("key 인코딩 : ", isBase64(secret_key))
        // console.log(isBase64(sendingdata))
        

        //stringify된 requestBody 전체를 Encrypt
        //const encryptedRequestBody = encrypt(serializedRequestBody, secret_key)
        const encryptedRequestBody = KISA_SEED_CBC.encrypt(secret_key, IV, sendingdata) //Encrypt한 이후에 Encoding하여 전송

        const decryptedRequestBody = KISA_SEED_CBC.decrypt(secret_key, IV, encryptedRequestBody)//encryptedRequestBody)
        
        console.log("암호화 값 : ", encryptedRequestBody);

        console.log("복호화 값 : ", decryptedRequestBody)

        const response = await axios.post(testServerUrl, encryptedRequestBody, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        // 응답값 복호화. **응답값이 정해지지않아 일단 주석처리**
        // const decryptedResponseData = {
        //     someMessage: decrypt(response.data.someMessgae, secret_key),
        //     sendData : {
        //         testKey1: decrypt(response.data.sendData.testkey1, secret_key),
        //         testkey2: decrypt(response.data.sendData.testkey2, secret_key)
        //     }
        // };

        // console.log("Received response data:", decryptedResponseData);

        res.send({
            message: "Request sent successfully",
            sentData: requestBody,
            // responseData: decryptedResponseData
        });

    } catch (error) {
        console.error('통신 에러: ', error.message);
        res.status(500).send('통신 에러');
    }
});


// app.get('/com-test/dev', async (req, res, next) => {
//     try {
//         // 테스트 하려는 서버의 url
//         const testServerUrl = 'http://192.168.0.80:8080/OnlineWebAppServlet';

//         const response = await axios.get(`${testServerUrl}`);

//         res.send(response.data);
 
//         console.log( ">>>>>>>>>" + response.data)

//     } catch (error) {
//         console.error('통신 에러: ', error);
//         res.status(500).send('통신 에러');
//     }
// })

/* ERP 통신이 되는지 확인 (운영)*/
app.get('/com-test/main', async (req, res, next) => {
    try {
        // 테스트 하려는 서버의 url
        const testServerUrl = 'http://101.101.218.134:8080';

        const response = await axios.get(`${testServerUrl}`);

        res.send(response.data);

    } catch (error) {
        console.error('통신 에러: ', error);
        res.status(500).send('통신 에러');
    }
})

app.use(express.static('public'));

app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
  });



































  /**기존 데이터 유실이 나오던 업로드 코드. 원인 분석이 되지 않아 남겨둠.
require('dotenv').config();

const {S3ACCESS, S3SECRET, S3BUCKETNAME, //SQSQUEUEURL
} = process.env;

const app = express();
const PORT = 3000;
// const router = express.Router() //라우터 아직 미사용중

app.use(morgan('combined'));

// 랜딩페이지
app.get('/', (req,res) => {
    
    res.sendFile('index.html', { root: __dirname });
});


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