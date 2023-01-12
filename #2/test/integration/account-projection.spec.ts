import waitForExpect from 'wait-for-expect';

import AccountProjection, { AccountSchema } from '../../src/projection/account';

import { AccountEvents, AggregateType } from '../../../events';
import EventStore from '../../src/library/eventstore';
import { expect } from 'chai';
import mongoose from 'mongoose';
import R from 'ramda';


async function findById(id: string): Promise<{
  username: string;
  fullName: string;
  email: string;
  balance: number;
} | null> {
  // TODO: Implement this function to retrieve the account information by account id.
  const Account = mongoose.model('Account', AccountSchema);
  const account = await Account.findOne({aggregateId:id});
  
  return account ? R.omit(['password', 'aggregateId', '_id', '__v'], account.toObject()) : null;

}

describe('AccountProjection', function () {
  describe('#start', function () {
    before(async function () {
      await mongoose.connect('mongodb+srv://wallet-be:wallet123@cluster0.1nhk94p.mongodb.net/?retryWrites=true&w=majority')
      this.eventStore = new EventStore(AccountEvents);
      this.projection = new AccountProjection(this.eventStore);
      this.aggregateId = '60329145-ba86-44fb-8fc8-519e1e427a60';

      await this.projection.start();

      this.account = await findById(this.aggregateId);
    });

    after(async function () {
      // TODO: Destroy test data/models 
      const Account = mongoose.model('Account', AccountSchema);
      await Account.deleteMany();
    });

    it('SHOULD project the data to the correctly to the database', function () {
      expect(this.account).to.deep.equal({
        username: 'jdoe',
        fullName: 'johndoe',
        email: 'email@ml.com',
        balance: 23,
        totalApprovedWithdrawalAmount: 3,
        totalApprovedDepositAmount: 10,
      });
    });

    describe('WHEN there is a new event', function () {
      before(async function () {
        await this.eventStore.createEvent({
          aggregateType: AggregateType.Account,
          type: 'BalanceDebited',
          aggregateId: this.aggregateId,
          body: { amount: 7 },
        });
      });

      it('SHOULD be able to apply new events to the model', async function () {
        await waitForExpect(async () => {
          const account = await findById(this.aggregateId);
          expect(account).to.have.property('balance', 16);
        });
      });
    });
  });
});
