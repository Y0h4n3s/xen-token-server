var solanaWeb3 = require('@solana/web3.js')
var PublicKey = solanaWeb3.PublicKey
var Keypair = solanaWeb3.Keypair
var Transaction = solanaWeb3.Transaction
var Connection = solanaWeb3.Connection
var splToken = require("@solana/spl-token")
var Token = splToken.Token
const TOKEN_PROGRAM_ID = new PublicKey(splToken.TOKEN_PROGRAM_ID)
var BN = require('bn.js')

// change this to mainnet
const CLUSTER_URL = "https://api.devnet.solana.com"
const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID = new PublicKey(
    'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
);


const XEN_TOKEN_MINT_ADDRESS = new PublicKey("35WesFD8V2grcczvJMFvD88MvKTfsLjkaBpxtNjj6hkD")
const PERA_TOKEN_MINT_ADDRESS = new PublicKey("EdnAnrrvnS42MZNrj4wpDqE6XAJMg3sADPEcqgyAzJ9H")
const QIA_TOKEN_MINT_ADDRESS = new PublicKey("J4TYCGMWfEUJCg3PmYn6KTjksai6cv45JP3AitYxpRY5")

// the feepayers keypair
const feePayer = Keypair.fromSecretKey(new Uint8Array(Array.from([227, 139, 220, 233, 57, 200, 118, 150, 232, 169, 207, 228, 164, 29, 52, 137, 239, 88, 87, 85, 19, 156, 194, 178, 7, 54, 183, 144, 172, 114, 28, 158, 9, 157, 203, 244, 142, 196, 12, 52, 30, 111, 152, 101, 2, 120, 156, 11, 12, 54, 214, 6, 131, 18, 222, 139, 237, 9, 52, 229, 128, 208, 203, 84])));

module.exports.TransferHelper = function (){

    // Build and return a signed Solana transaction that
    // Has two instructions:
    // Instruction 1: Burn at a minimum 0.01 xen or 1% of the transferred token as tax
    // Instruction 2: Transfer the rest to the receiver
    this.createTransferTx = async function (walletPubkey, targetAddress, transferAmount, token) {
        let transferedMint = token === "XEN" ? XEN_TOKEN_MINT_ADDRESS : token === "PERA" ? PERA_TOKEN_MINT_ADDRESS : QIA_TOKEN_MINT_ADDRESS;
        let associatedAccountSource = await this.getAssociatedAccount(walletPubkey, transferedMint)
        let associatedAccountReceiver = await this.getAssociatedAccount(new PublicKey(targetAddress), transferedMint)
        let transferAmountLamports = this.tokenToLamports(transferAmount)
        try {
            let connection = new Connection(CLUSTER_URL)
            let t = new Token(connection, transferedMint, TOKEN_PROGRAM_ID, feePayer)
            let transaction = new Transaction()

            // Check if the sender Has a token account
            try {
                console.log(associatedAccountSource.toBase58())
                let info = await t.getAccountInfo(associatedAccountSource);
            } catch (e) {
                // stop and return: the sender has insufficient/No balance
                console.error(e)
                return {Error: "Sender Does Not Have " + transferedMint + " Tokens"}
            }

            // check if the receiver has an address to store the tokens
            // create one if he doesn't
            try {
                let info = await t.getAccountInfo(associatedAccountReceiver)
                console.log(info.owner.toBase58(), info.mint.toBase58())
            } catch (e) {
                console.error(e)
                // create an associated account for the receiver
                if (e.message === "Failed to find account") {
                    try {
                        associatedAccountReceiver = await t.createAssociatedTokenAccount(targetAddress)
                    } catch (e) {
                        console.error(e)
                        return {"Error": e.message}
                    }
                } else {
                    return {"Error": e.message}
                }
            }

            // calculate token tax
            let taxCut = transferAmountLamports / 100 > this.tokenToLamports(0.01) ? transferAmountLamports / 100 : this.tokenToLamports(0.01)

            // Initialize burn instruction
            let taxBurnInstruction = Token.createBurnInstruction(
                TOKEN_PROGRAM_ID,
                transferedMint,
                associatedAccountSource,
                walletPubkey,
                [],
                taxCut
            )

            // Initialize transfer instruction
            let transactionInstruction = Token.createTransferInstruction(
                TOKEN_PROGRAM_ID,
                associatedAccountSource,
                associatedAccountReceiver,
                walletPubkey,
                [feePayer],
                transferAmountLamports - taxCut,
            )

            // Sign with the fee-payer account and return the transaction object
            transaction.feePayer = feePayer.publicKey;
            transaction.recentBlockhash = (
                await connection.getRecentBlockhash()
            ).blockhash;
            transaction.add(taxBurnInstruction)
            transaction.add(transactionInstruction)
            transaction.sign(feePayer)
            return transaction
        } catch (e) {
            return {"Error": e.message}
        }



    }
    //Utility functions

    this.bnToPubkey = function (bn) {
        let bigno = new BN(bn, 16);
        return new PublicKey(bigno.toArray())
    }

    this.tokenToLamports = function (amount) {
        return amount * 1000000000
    }

    this.getAssociatedAccount = async function  (walletAddress, mint) {
        return (await PublicKey.findProgramAddress(
            [
                walletAddress.toBuffer(),
                TOKEN_PROGRAM_ID.toBuffer(),
                mint.toBuffer(),
            ],
            SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID
        ))[0];
    }


}
