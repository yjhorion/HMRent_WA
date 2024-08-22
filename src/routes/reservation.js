/*  차량예약 리스트 (5000, 5001) */
const express = require('express')
const path = require('path');
const { prisma } = require('../utils/prisma/index.js');
const axios = require('axios');
const crypto= require('crypto');
const iconv = require('iconv-lite');
const getCurrentDateTime = require('../utils/Time/DateTime.js');
const jwt = require('jsonwebtoken');


require('dotenv').config();

const router = express.Router()

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


/* (5000) 예약해제대상<차량> 조회  */
router.get('/reservation', authenticateToken, async (req, res, next) => {
    try {
        const { year, month, day, hour, minute, second } = getCurrentDateTime()
        // const { USERID, USERPW } = req.session.user

        console.log('reservation 전체조회');
        console.log('로그인한 유저아이디' + req.user.USERID);
        console.log('로그인한 유저비밀번호' + req.user.USERPW);

        const sendingdata = JSON.stringify({
            "request" : {
                "DOCTRDCDE" : "5000",
                "DOCPORTAL" : "M",
                "DOCSNDDAT" : `${year}${month}${day}`,
                "DOCSNDTIM" : `${hour}${minute}${second}`,
                "RGTFLDUSR" : req.user.USERID,
                "RGTFLDPWR" : req.user.USERPW
            },
            "data" : {

            }
            
        })

        console.log("Encoded secret key : ", secret_key) // Base64 encoded key
        console.log("Encoded Initial Vector : ", IV) // Base64 encoded IV

        if(!secret_key) {
            console.log("No Secret Key.");
            return res.status(500).send('No Secret Key.');
        }

        const encryptedData = encrypt(sendingdata, secret_key, IV);
        const decryptedData = decrypt(encryptedData, secret_key, IV);

        console.log("암호화 값 : ", encryptedData);
        console.log("복호화 값 : ", decryptedData);

        /* ERP에 암호화 된 데이터를 보내는 부분 */

        let decryptedresponse

        const response = await axios.post(testServerUrl, encryptedData, {
            headers: {
                'Content-Type': 'text/plain'
            }
        });

        decryptedresponse = decrypt(response.data, secret_key, IV);
        console.log("Response recieved:", response.data);
        console.log("복호화 된 응답값 :", decryptedresponse);

        /* 프론트에 데이터를 보내는 부분. stringify 되었던 데이터를 parse해서 json형식으로 보내줌 */
        res.send({
            data: JSON.parse(decryptedresponse)
        })


    } catch (error) {
        console.error(error);
        res.status(500).json({ message : error })
    }
})

/* (5001) 예약해제 집행 */
router.post('/reservation/:ASSETNO', authenticateToken, async (req, res, next) => {
    try {
        const { year, month, day, hour, minute, second } = getCurrentDateTime();
        // const { USERID, USERPW } = req.session.user;

        const { ASSETNO } = req.params;

        console.log('INQCNEW 전체조회');
        console.log('로그인한 유저아이디' + req.user.USERID);
        console.log('로그인한 유저비밀번호' + req.user.USERPW);

        const sendingdata = JSON.stringify({
            "request" : {
                "DOCTRDCDE" : "5001",
                "DOCPORTAL" : "M",
                "DOCSNDDAT" : `${year}${month}${day}`,
                "DOCSNDTIM" : `${hour}${minute}${second}`,
                "RGTFLDUSR" : req.user.USERID,
                "RGTFLDPWR" : req.user.USERPW 
            },
            "data" : {
                "ASSETNO" : ASSETNO
            }
            
        })

        console.log("Encoded secret key : ", secret_key) // Base64 encoded key
        console.log("Encoded Initial Vector : ", IV) // Base64 encoded IV

        if(!secret_key) {
            console.log("No Secret Key.");
            return res.status(500).send('No Secret Key.');
        }

        const encryptedData = encrypt(sendingdata, secret_key, IV);
        const decryptedData = decrypt(encryptedData, secret_key, IV);

        console.log("암호화 값 : ", encryptedData);
        console.log("복호화 값 : ", decryptedData);

        /* ERP에 암호화 된 데이터를 보내는 부분 */

        let decryptedresponse

        const response = await axios.post(testServerUrl, encryptedData, {
            headers: {
                'Content-Type': 'text/plain'
            }
        });

        decryptedresponse = decrypt(response.data, secret_key, IV);
        console.log("Response recieved:", response.data);
        console.log("복호화 된 응답값 :", decryptedresponse);

        /* 프론트에 데이터를 보내는 부분. stringify 되었던 데이터를 parse해서 json형식으로 보내줌 */
        res.send({
            data: JSON.parse(decryptedresponse)
        })


    } catch (error) {
        console.error(error);
        res.status(500).json({ message : error })
    }
})



module.exports = router;