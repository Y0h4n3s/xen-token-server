var solanaWeb3 = require('@solana/web3.js')
var PublicKey = solanaWeb3.PublicKey
var Keypair = solanaWeb3.Keypair
var Transaction = solanaWeb3.Transaction
var TransactionInstruction = solanaWeb3.TransactionInstruction
var Connection = solanaWeb3.Connection
var splToken = require("@solana/spl-token")
var Token = splToken.Token
const TOKEN_PROGRAM_ID = new PublicKey(splToken.TOKEN_PROGRAM_ID)
var BN = require('bn.js')
const CLUSTER_URL = "https://api.devnet.solana.com"
const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID = new PublicKey(
    'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
);


const XEN_TOKEN_MINT_ADDRESS = new PublicKey("35WesFD8V2grcczvJMFvD88MvKTfsLjkaBpxtNjj6hkD")
const feePayer = Keypair.fromSecretKey(new Uint8Array(Array.from([227, 139, 220, 233, 57, 200, 118, 150, 232, 169, 207, 228, 164, 29, 52, 137, 239, 88, 87, 85, 19, 156, 194, 178, 7, 54, 183, 144, 172, 114, 28, 158, 9, 157, 203, 244, 142, 196, 12, 52, 30, 111, 152, 101, 2, 120, 156, 11, 12, 54, 214, 6, 131, 18, 222, 139, 237, 9, 52, 229, 128, 208, 203, 84])));


module.exports.TransferHelper = function (){
    this.createTransferIx = async function (walletPubkey, targetAddress, transferAmount) {
        let associatedAccountSource = await this.getAssociatedAccount(walletPubkey)
        let associatedAccountReceiver = await this.getAssociatedAccount(new PublicKey(targetAddress))
        let transferAmountLamports = this.xenToLamports(transferAmount)
        try {
            let connection = new Connection(CLUSTER_URL)
            let t = new Token(connection, XEN_TOKEN_MINT_ADDRESS, TOKEN_PROGRAM_ID, feePayer)
            let transaction = new Transaction()
            var info;
            try {
                await t.getAccountInfo(associatedAccountSource);
            } catch (e) {
                console.error(e)
                return e
            }

            try {
                await t.getAccountInfo(associatedAccountReceiver)
            } catch (e) {
                console.error(e)
                // create an associated account for the receiver
                try {
                    associatedAccountReceiver = await t.createAssociatedTokenAccount(targetAddress)
                } catch (e) {
                    console.error(e)
                    return e
                }
            }
            let taxCut = transferAmountLamports / 100
            let taxBurnInstruction = Token.createBurnInstruction(
                TOKEN_PROGRAM_ID,
                XEN_TOKEN_MINT_ADDRESS,
                associatedAccountSource,
                walletPubkey,
                [],
                taxCut
            )
            let transactionInstruction = Token.createTransferInstruction(
                TOKEN_PROGRAM_ID,
                associatedAccountSource,
                associatedAccountReceiver,
                walletPubkey,
                [feePayer],
                transferAmountLamports - taxCut,
            )
            transaction.feePayer = feePayer.publicKey;
            transaction.recentBlockhash = (
                await connection.getRecentBlockhash()
            ).blockhash;
            transaction.add(taxBurnInstruction)
            transaction.add(transactionInstruction)
            console.log("Signing Transaction...")
            transaction.sign(feePayer)
            console.log(transaction)
            return transaction
        } catch (e) {
            return {"Error": e}
        }



    }


    this.bnToPubkey = function (bn) {
        let bigno = new BN(bn, 16);
        return new PublicKey(bigno.toArray())
    }

    this.xenToLamports = function (amount) {
        return amount * 1000000000
    }

    this.getAssociatedAccount = async function  (walletAddress) {
        return (await PublicKey.findProgramAddress(
            [
                walletAddress.toBuffer(),
                TOKEN_PROGRAM_ID.toBuffer(),
                XEN_TOKEN_MINT_ADDRESS.toBuffer(),
            ],
            SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID
        ))[0];
    }


}