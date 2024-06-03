const express = require('express')
const axios = require('axios');
const crypto= require('crypto');
const iconv = require('iconv-lite');
const session = require('express-session')

require('dotenv').config();

const router = express.Router()
const getCurrentDateTime = require('../utils/Time/DateTime.js');

router.use(session({
    secret: crypto.randomBytes(32).toString('hex'), //crypto 함수를 이용하여, 랜덤한 세션 secret값 부여
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 60 * 60 * 1000 * 10 // 세션 수명을 10시간으로 설정
    }
}));

// .env에서 ERP서버 주소, 암호화 키 가져오고 정의
const testServerUrl = process.env.testServerUrl;
const secret_key = Buffer.from(process.env.CRYPTO_SECRET_KEY, 'utf8')
const IV         = Buffer.from(process.env.IV, 'utf8')



/* 로그인 요청값을 보내는 endpoint. POST요청 */
router.post('/login', async (req, res, next) => {
    try {
        const {USERID, USERPW} = req.body
        const { year, month, day, hour, minute, second } = getCurrentDateTime();

        const sendingdata = JSON.stringify({
            "request" : {
                "DOCTRDCDE" : "1000",
                "DOCPORTAL" : "M",
                "DOCSNDDAT" : `${year}${month}${day}`,
                "DOCSNDTIM" : `${hour}${minute}${second}`,
                "RGTFLDUSR" : "",
                "RGTFLDPWR" : "",
            },
            "data" : {
        "USERID" : USERID,
        "USERPW" : USERPW
            }
        })
        // const encodeddata = btoa(sendingdata)


        if (!secret_key) {
            console.log("No Secret Key.");
            return res.status(500).send('No Secret Key.');
        }        

        function encrypt(text, key, iv) {
            const encodedText = iconv.encode(text, 'euc-kr'); // encode into 'euc-kr first before encrypting'
            const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
            let encrypted = cipher.update(encodedText, 'euc-kr', 'base64');
            encrypted += cipher.final('base64'); 
            return encrypted;
        }
        
        function decrypt(encrypted, key, iv) {
            const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
            let decrypted = decipher.update(Buffer.from(encrypted, 'base64'));
            decrypted = Buffer.concat([decrypted, decipher.final()]);
            return iconv.decode(decrypted, 'euc-kr');
            
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

        decryptedresponse = JSON.parse(decrypt(response.data, secret_key, IV));
        console.log("Response received:", response.data);
        console.log("복호화 된 응답값 :", decryptedresponse);

        const sessioninfo = {"USERID" : USERID, "USERPW" : USERPW}
        
        /* 세션에 유저 정보 저장 */
        req.session.user = sessioninfo;
        console.log("세션에 담을 유저 정보 : ", req.session.user);

        // 로그인 성공, 실패여부에 상관없이 입력받고 전달한 값을 세션에 저장. 전달한 정보에 대한 검수와 응답처리는 ERP에서 처리 될 예정이기 때문에 올바른 값만 저장할 필요가 없음. 검수를 받을 값을 세션에 저장해놓고 전송.
        if (decryptedresponse.result.CODE === '0000') // 로그인 성공시
        {
            // 추가적인 코드값을 받아오는 부분
            const additionalData = JSON.stringify({
                "request" : {
                    "DOCTRDCDE" : "1100",
                    "DOCPORTAL" : "M",
                    "DOCSNDDAT" : `${year}${month}${day}`,
                    "DOCSNDTIM" : `${hour}24${minute}${second}`,
                    "RGTFLDUSR" : req.session.user.USERID, 
                    "RGTFLDPWR" : req.session.user.USERPW, 
                },
                "data" : 
            ["HR58", "HR65"]    // "HR58 : 차량입고위치, HR65: 1차탁송출고지"
                
            })

            const additionalencryptedData = encrypt(additionalData, secret_key, IV);

            const additionalResponse = await axios.post(testServerUrl, additionalencryptedData, {
                headers: {
                    'Content-Type': 'text/plain'
                }
            });
    
            const additionalDecryptedresponse = JSON.parse(decrypt(additionalResponse.data, secret_key, IV));
            console.log("Response received:", additionalResponse.data);
            console.log("복호화 된 코드값 :", additionalDecryptedresponse);

            // 코드값에 대해 전달받은 데이터를 세션에 저장. 다른페이지에서 req.session.reqCode를 호출하여 필요한 값 사용.
            req.session.reqCode = additionalDecryptedresponse.data;
            console.log("세션에 저장될 코드값", req.session.reqCode)

            /* 프론트에 데이터를 보내는 부분. stringify 되었던 데이터를 parse 해서 json형식으로 보내줌 */

                res.status(200).send({
                    message : decryptedresponse.result.MSGE,
                    data: decryptedresponse.data,
            })
            
    } else { // 로그인 실패시
        req.session.regenerate((err) => {
            if (err) {
                console.error('세션 재생성 오류:', err);
                res.status(500).send('세션 재생성 오류');
            } else {

                /* 실패시에도 마찬가지로 세션에 유저 정보 저장 */
                req.session.user = sessioninfo;
                console.log("세션에 담을 정보 : ", req.session.user);

                res.status(400).send({
                    message : decryptedresponse.result.MSGE,
                    data: null, // 실패시 데이터는 보내주지 않지만, 혹시나 다시 로그인 시도를 할 때, 입력했던 사번으로 다시 로그인 할 수 있도록, 아이디 정보를 채운채로 보여주고싶다면 받은 데이터를 전달해줄 것 (받은 데이터에 접속을 시도한 USERID값이 입력되어있음.)
                })
            }
        })
    }

    } catch (error) {
        console.error('통신 에러: ', error.message);
        res.status(500).send('통신 에러');
    }
});

/*보안을 위한 수정 예정 사항
* HTTPS로 배포
* 로그인할 때, ERP 서버로부터 USERID, USERPW 값을 전달받고, SESSION에 저장. 
* 이후 ERP에 요청을 보낼 때 마다, 저장해둔 USERID, USERPW 값을 authmiddleware를 통해 ERP에 전달하고, 응답값이 OK일 경우 요청 진행.
* 그 외의 경우 세션을 파괴하고, 로그아웃을 진행하고, 로그인 페이지로 강제이동. '로그인이 필요한 기능입니다' 메세지 출력.
* 궁금한건, 이렇게하고 '뒤로가기' 등을 사용하였을 때에도 로그인 페이지로 강제이동이 되는지.
*/ 

module.exports = router;



/* 현재 req.session.reqCode에 저장되는 데이터

[
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

*/