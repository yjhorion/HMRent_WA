/* 회수차량 조회 라우터 (4000) */

const express = require('express');
const path = require('path');
const { prisma } = require('../utils/prisma/index.js');
const getCurrentDateTime = require('../utils/Time/DateTime.js');
const crypto= require('crypto');
const iconv = require('iconv-lite');
const axios = require('axios');
// const { getDeviceType } = require('../utils/DEVICEDETECTOR/devicedetector.js');

router = express.Router()

require('dotenv').config();

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



/* 회수차량 조회 */

router.get('/retrieval', async (req, res, next) => {
    try{
        const { year, month, day, hour, minute, second } = getCurrentDateTime();
        // const userAgent = req.headers['user-agent']; 
        // const deviceType = getDeviceType(userAgent);

        /* (QRDATBEG =< QRDATEND) 조건으로 validation 필요 */

        const QRDATBEG = req.params.QRDATBEG || `${year}${month}${day}`;
        const QRDATEND = req.params.QRDATND || `${year}${month}${day}`;

        console.log('시작일',QRDATBEG)
        console.log('종료일',QRDATEND)

        const sendingdata = JSON.stringify({
            "request" : {
                "DOCTRDCDE" : "4000",
                "DOCPORTAL" : "M",
                "DOCSNDDAT" : `${year}${month}${day}`,
                "DOCSNDTIM" : `${hour}24${minute}${second}`,
                "RGTFLDUSR" : "H202404010",//req.session.user.USERID,
                "RGTFLDPWR" : "!Ekdzhd123" //req.session.user.USERPW
            },
            "data" : {
                "RETSTS" : "", // 회수완료여부 null - 전체 , "A" - 회수완료 , "B" - 회수요청
                "QRCRTRA" : "A", // 조회조건 "A" - 요청일자, "B" - 지급일자, "C" - 완료일자 -- 프론트에서 값을 전달받아 전달.
                "QRDATBEG" : "11111111",//QRDATBEG, // 조회일자시작일 - YYYYMMDD 포멧으로 프론트에서 값을 받아서 전달. reqbody에 해당  값이 빈 string 혹은 null 일경우, 현재날자 값
                "QRDATEND" : QRDATEND, // 조회일자종료일 - YYYYMMDD 포멧으로 프론트에서 값을 받아서 전달. reqbody에 해당  값이 빈 string 혹은 null 일경우, 현재날자 값
            }
        })

        if (!secret_key) {
            console.log("No Secret Key.")
            return res.status(500).send('No Secret Key. 암호화 문제')
        }

        const encryptedData = encrypt(sendingdata, secret_key, IV);
        const decryptedData = decrypt(encryptedData, secret_key, IV);

        console.log("암호화 값 : ", encryptedData);
        console.log("복호화 값 : ", decryptedData);

        /* ERP에 암호화된 데이터를 보내는 부분 */

        const response = await axios.post(testServerUrl, encryptedData, {
            headers: {
                'Content-Type' : 'text/plain'
            }
        });

        const decryptedresponse = decrypt(response.data, secret_key, IV);
        console.log("Response received:", response.data);
        console.log("복호화 된 응답값 :", decryptedresponse);

        /* 프론트에 데이터를 보내는 부분. stringify 되었던 데이터를 parse 해서 json로 치환한 후 보내줌 */
        res.send({
            data : JSON.parse(decryptedresponse),
        });

    } catch (error) {
        console.log(error);
        next(error);
    }
})

module.exports = router;