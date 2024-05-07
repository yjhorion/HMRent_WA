/* 랜딩페이지 
1. 입고 QC
1-a. 입고처리 정보입력 페이지로 연결 ('/StoreInInfo')
1-b. 정비/상품차 선택 ('/StoreInInfo/MaintainOrGoods')

2. 상품화완료 QC
2-a. 차량관리(물류)
2-b. 상품화 완료 ('/CommerceDone')
2-c. ERP에서 완료 QC버튼을 누르면, 입력 가능한 내용 입력 => 완료 ('/CommerceDone/QCComplete')

3. 회수대상 리스트
3-a. 회수대상 리스트에 대한 조회 요청 ('/Retrievals')

*/

const express = require('express')
const path = require('path');
const { prisma } = require('../utils/prisma/index.js')

router = express.Router()

/* 랜딩페이지 */

// 각 icon은 '/main/' 이후의 엔드포인트 url값을 담고있으므로, '/main/
router.get('/main', async (req, res, next) => {
    try{

        const mainPagePath = path.join(__dirname, '../main.html');

        res.sendFile(mainPagePath)
    } catch (error) {
        console.log(error);
        next(error);
    }
})

module.exports = router;