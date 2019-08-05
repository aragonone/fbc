const {
  SALE_STATE
} = require('./common/constants')
const { sendTransaction, daiToProjectTokens, assertExternalEvent } = require('./common/utils')
const { deployDefaultSetup } = require('./common/deploy')
const { assertRevert } = require('@aragon/test-helpers/assertThrow')

const BUYER_DAI_BALANCE = 100
const INIFINITE_ALLOWANCE = 100000000000000000

contract('Buy', ([anyone, appManager, buyer, anotherBuyer]) => {

  before(() => deployDefaultSetup(this, appManager))

  describe('When using other tokens', () => {

    it('Does not accept ETH', async () => {
      await assertRevert(
        sendTransaction({ from: anyone, to: this.presale.address, value: web3.toWei(1, 'ether') })
      )
    })

  })

  describe('When using dai', () => {

    before(async () => {
      await this.daiToken.generateTokens(buyer, BUYER_DAI_BALANCE)
      await this.daiToken.generateTokens(anotherBuyer, BUYER_DAI_BALANCE)
      await this.daiToken.approve(this.presale.address, INIFINITE_ALLOWANCE, { from: buyer })
      await this.daiToken.approve(this.presale.address, INIFINITE_ALLOWANCE, { from: anotherBuyer })
    })

    it('Reverts if the user attempts to buy tokens before the sale has started', async () => {
      await assertRevert(
        this.presale.buy(BUYER_DAI_BALANCE, { from: buyer })
      )
    })

    describe('When the sale has started', () => {

      before(async () => {
        await this.presale.start({ from: appManager })
      })

      it('App state should be Funding', async () => {
        expect((await this.presale.currentSaleState()).toNumber()).to.equal(SALE_STATE.FUNDING)
      })

      it('A user can query how many tokens would be obtained for a given amount of dai', async () => {
        const amount = (await this.presale.daiToProjectTokens(BUYER_DAI_BALANCE)).toNumber()
        const expectedAmount = daiToProjectTokens(BUYER_DAI_BALANCE)
        expect(amount).to.equal(expectedAmount)
      })

      describe('When a user buys project tokens', () => {

        before(async () => {
          await this.presale.buy(BUYER_DAI_BALANCE, { from: buyer })
        })

        it('The dai are transferred from the user to the app', async () => {
          const userBalance = (await this.daiToken.balanceOf(buyer)).toNumber()
          const appBalance = (await this.daiToken.balanceOf(this.presale.address)).toNumber()
          expect(userBalance).to.equal(0)
          expect(appBalance).to.equal(BUYER_DAI_BALANCE)
        })

        it('Vested tokens are assigned to the buyer', async () => {
          const userBalance = (await this.projectToken.balanceOf(buyer)).toNumber()
          const expectedAmount = daiToProjectTokens(BUYER_DAI_BALANCE)
          expect(userBalance).to.equal(expectedAmount)
        })

        it.skip('An event is emitted', async () => {
          // TODO
        })

        it.skip('The purchase produces a valid purchase id for the buyer', async () => {
          // const receipt = await this.presale.buy(1, { from: anotherBuyer })
          // console.log( JSON.stringify(receipt, null, 2) )
          // console.log(await this.presale.buy(1, { from: anotherBuyer }))
        })
      })
    })
  })
})
