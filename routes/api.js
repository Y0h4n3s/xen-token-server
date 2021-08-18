var express = require('express');
var router = express.Router();
const solanaWeb3 = require('@solana/web3.js')
var PublicKey = solanaWeb3.PublicKey
const {TransferHelper} = require('../helpers/transferHelper')
const BN = require('bn.js')

router.get('/', function (req, res, next) {
    res.send('No Route');
});


/*
  request-parameters:
    wallet: the address of the sender,
    transferAmount: how many tokens will be transfered,
    targetAddress: the receiver's address
  POST returns a Transaction class object signed with a feepayer
 */
router.post("/signedTransfer", async (req, res, next) => {
console.log(TransferHelper)
  let {wallet, transferAmount, targetAddress} = req.body
    let result = await new TransferHelper().createTransferIx(new PublicKey(wallet), new PublicKey(targetAddress), new BN(transferAmount))
    res.send(result)
})

module.exports = router;
