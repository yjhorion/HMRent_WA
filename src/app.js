const express = require('express');
const multer = require('multer');
const morgan = require('morgan');
const path = require('path');
const AWS = require('aws-sdk');
const multerS3 = require('multer-s3');
const { v4: uuidv4 } = require('uuid');
const bodyParser = require('body-parser');
const axios = require('axios');
const fs = require('fs')
const getCurrentDateTime = require('./utils/Time/DateTime.js');
const cors = require('cors')
const session = require('express-session')

const crypto= require('crypto');
const iconv = require('iconv-lite');

const retrievalRouter = require('./routes/retrieval.js')
const INQCRouter = require('./routes/INQC.js')
const compQCRouter = require('./routes/compQC.js')
const reservationRouter = require('./routes/reservation.js')
const loginRouter = require('./routes/login.js')

const app = express();
const PORT = 3000;

const generateSecret = () => {
    return crypto.randomBytes(32).toString('hex');
};

const secret = generateSecret();
console.log('Generated secret:', secret)

/* cors */
// const corsOptions = {
//     origin: 'https://admin.yjhorion.co.kr',
//     credentials : true,
//     methods: ["GET", "POST", "PUT", "DELETE"],
//     allowedHeaders: ["Content-Type", "Authorization"]
// };

// app.use(cors(corsOptions));

/* swagger module */
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs')

require('dotenv').config();

const { prisma } = require('./utils/prisma/index.js');
const { resolvePtr } = require('dns');
// router = express.Router()

const { S3ENDPOINT, S3ACCESS, S3SECRET, S3BUCKETNAME, S3DIRECTORY, testServerUrl } = process.env;


// app.use(express.static(path.join(__dirname, 'public')));
app.use(morgan('combined'));
app.use(bodyParser.urlencoded({ extended: true}));
app.use(bodyParser.json());
// app.set('view engine', 'ejs');          // ejs 템플릿 엔진 세팅부분.
// app.set('views', path.join(__dirname, '../views')) // views 디렉토리에 파일이 있다고 가정. 디렉토리 위치수정 필요



app.get('/', (req,res) => {
        res.send('Hello World!') // '/' 경로에서 잘 받아오는지 확인
        });
    
    /* 세션 설정 */
    app.use(session({
        secret: secret,
        resave: false,
        saveUninitialized: true,
        cookie: {
            maxAge: 60 * 60 * 1000 * 10,
            sameSite: 'Lax'
            },
            name: 'session_id'
            }))
            

    /* 라우터 설정 */
    app.use('/', retrievalRouter, INQCRouter, compQCRouter, reservationRouter, loginRouter)
/* swagger 세팅 */
const swaggerDocument = YAML.load('./src/swagger/swagger.yaml');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));



app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
  });
/* ERP 통신이 되는지 확인 (개발)*/
// app.get('/com-test/dev', async (req, res, next) => {
//     try {
//         const { year, month, day, hour, minute, second } = getCurrentDateTime();

//         // .env에서 암호화 키 가져오고 정의
//         const secret_key = Buffer.from(process.env.CRYPTO_SECRET_KEY, 'utf8')
//         const IV         = Buffer.from(process.env.IV, 'utf8')

//         const sendingdata = "Eng한글123!@#길이를길게늘리면가끔에러가발생하던데깨지는지확인이필요함"
//         // const encodeddata = btoa(sendingdata)

//         console.log("Encoded secret key : ", secret_key) // Base64 encoded key
//         console.log("Encoded Initial Vector : ", IV) // Base64 encoded IV

//         if (!secret_key) {
//             console.log("No Secret Key.");
//             return res.status(500).send('No Secret Key.');
//         }

//         // body에 포함할 데이터
//         const requestBody = {
//             "request" : {
//                 "DOCREQNBR" : "전문번호",
//                 "DOCTRDCDE" : "거래구분코드",
//                 "DOCPORTAL" : "M",
//                 "DOCSNDDAT" : `${year}${month}${day}`,
//                 "DOCSNDTIM" : `${hour}24${minute}${second}`,
//                 //'msgkey' : encrypt('msgvalue', secret_key)
//             },
//             "data": {
//                 "testkey1": "testvalue1"
//             }
//         };

//         // 전체 암호화를 위해 requestBody를 stringify
//         const serializedRequestBody = JSON.stringify(requestBody);
//         console.log(serializedRequestBody)

//         function encrypt(text, key, iv) {
//             const encodedText = iconv.encode(text, 'euc-kr'); // encode into 'euc-kr first before encrypting'
//             const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
//             let encrypted = cipher.update(encodedText, 'euc-kr', 'base64');
//             encrypted += cipher.final('base64'); 
//             return encrypted;
//         }
    
//         function decrypt(encrypted, key, iv) {
//             const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
//             let decrypted = decipher.update(Buffer.from(encrypted, 'base64'));
//             decrypted = Buffer.concat([decrypted, decipher.final()]);
//             return iconv.decode(decrypted, 'euc-kr');
//         }

//         // function decrypt(encrypted, key, iv) {
//         //     const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
//         //     let decrypted = decipher.update(encrypted, 'base64', 'utf8');
//         //     decrypted += decipher.final('utf8');
//         //     return decrypted;
//         // }

//         const encryptedData = encrypt(sendingdata, secret_key, IV);
//         const decryptedData = decrypt(encryptedData, secret_key, IV);

//         console.log("암호화 값 : ", encryptedData);
//         console.log("복호화 값 : ", decryptedData)

//         const response = await axios.post(testServerUrl, encryptedData, {
//             headers: {
//                 'Content-Type': 'text/plain'
//             }
//         }).then(response => {
//             // const decryptedresponse = decrypt(response.data, secret_key, IV)
//             console.log("Response received:", response.data);
//             // console.log("복호화 된 응답값 :", decryptedresponse)
//         })

//         // 응답값 복호화. **응답값이 정해지지않아 일단 주석처리**
//         // const decryptedResponseData = {
//         //     someMessage: decrypt(response.data.someMessgae, secret_key),
//         //     sendData : {
//         //         testKey1: decrypt(response.data.sendData.testkey1, secret_key),
//         //         testkey2: decrypt(response.data.sendData.testkey2, secret_key)
//         //     }
//         // };

//         // console.log("Received response data:", decryptedResponseData);

//         res.send({
//             message: "Request sent successfully",
//             sentData: requestBody,
//             // responseData: decryptedResponseData
//         });

//     } catch (error) {
//         console.error('통신 에러: ', error.message);
//         res.status(500).send('통신 에러');
//     }
// });

// app.use(express.static('public'));




































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