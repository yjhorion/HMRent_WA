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
const Memorystore = require('memorystore')(session)
const RedisStore = require('connect-redis').default;
const { createClient } = require('redis');
const cookieParser = require('cookie-parser');

const crypto= require('crypto');
const iconv = require('iconv-lite');

const retrievalRouter = require('./routes/retrieval.js')
const INQCRouter = require('./routes/INQC.js')
const compQCRouter = require('./routes/compQC.js')
const reservationRouter = require('./routes/reservation.js')
const loginRouter = require('./routes/login.js')


const app = express();
const PORT = 3000;

app.use(cookieParser());

const generateSecret = () => {
    return crypto.randomBytes(32).toString('hex');
};

/* 쿠키를 로깅하기 위한 미들웨어 function */

const secret = generateSecret();
console.log('Generated secret:', secret)

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

app.get('/', (req,res) => {
        res.send('Hello World!') // '/' 경로에서 잘 받아오는지 확인
        });
    
    /* 세션 설정 */
    const maxAge = 60 * 60 * 1000 * 15 // 세션 유효기간 15시간 (1일)

    // redis 클라이언트 설정
    const redisClient = createClient();
    redisClient.connect().catch(console.error)

    // RedisStore 설정
    const redisStore = new RedisStore({
        client: redisClient,
        prefix: 'myapp', // (옵션) Redis 키의 접두사
    });

    const sessionObj = {
        store: redisStore,
        secret: secret,
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: maxAge, // 15 hours
            httpOnly: true, // 클라이언트에서 쿠키에 접근하지 못하도록 설정
            secure: true, // HTTPS를 사용하는 경우 true로 설정
            sameSite: 'lax' // CSRF 방지를 위해 설정 (strict 또는 none도 사용 가능)
        }
    };

    /* 세션 생성 미들웨어 */
    app.use(session(sessionObj));

            

    /* 라우터 설정 */
    app.use('/', retrievalRouter, INQCRouter, compQCRouter, reservationRouter, loginRouter)

    /* swagger 세팅 */

    const swaggerDocument = YAML.load('./src/swagger/swagger.yaml');

    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));



app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
  });