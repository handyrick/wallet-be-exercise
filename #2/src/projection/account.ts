import { AccountEvents, AggregateType, Event } from '../../../events';
import EventStore from '../library/eventstore';
import Projection from '../library/projection';
import mongoose from 'mongoose';
import * as crypto from 'crypto';
import R from 'ramda';

function generateId(): string {
  const buffer = crypto.randomBytes(16);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export const AccountSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  aggregateId: { type: String, required: true },
  username: { type: String, required: true },
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true},
  balance: { type: Number, required: true },
  totalApprovedWithdrawalAmount: { type: Number, required: true },
  totalApprovedDepositAmount: { type: Number, required: true },
},{
  capped: { size: 1024 },
  bufferCommands: false,
  autoCreate: false
});

export default class AccountProjection extends Projection {
  public constructor(eventStore: EventStore) {
    super(
      eventStore,
      [
        { aggregateType: AggregateType.Account },
        { aggregateType: AggregateType.Deposit },
        { aggregateType: AggregateType.Withdrawal },
      ],
    );
  }

  protected async apply(event: Event) {
    // TODO: Implement this method, to maintain a state in your database.
    // You can choose any database of your own, but suggested is MongoDB.
  
  const Account =  mongoose.model('Account', AccountSchema);
   switch(event.type){
    case 'AccountCreated':
      const { username, fullName, password, email} = event.body;
      const account = { 
        _id: generateId(),
        aggregateId: event.aggregateId,
        username, 
        fullName, 
        password, 
        email,
        balance: 0,
        totalApprovedWithdrawalAmount: 0,
        totalApprovedDepositAmount: 0
      };
      
      await Account.create(account);
      break;
    case 'AccountUpdated':
      await Account.updateOne({ aggregateId: event.aggregateId }, event.body);
      break;
    case 'BalanceCredited':
      await Account.updateOne({ aggregateId: event.aggregateId }, { $inc: { balance: event.body.amount } });
      break;
    case 'BalanceDebited':
      await Account.updateOne({ aggregateId: event.aggregateId }, { $inc: { balance: -event.body.amount } });
      break;
    case 'DepositCreated':{
      const { account, amount: depAmount } = event.body;
      const accountFind = await Account.findOne({aggregateId:account})

      if(!accountFind) return;

      await Account.updateOne({ aggregateId: account }, { $inc: { totalApprovedDepositAmount: depAmount } });
      break;
    }
    case 'WithdrawalCreated':{
      const { account, amount } = event.body;
      R.map(async (accountEvent)=>{
        if(accountEvent.aggregateId === event.aggregateId && accountEvent.type === 'WithdrawalApproved'){
          const accountExist = await Account.findOne({aggregateId:account});

          if(!accountExist) return;

          await Account.updateOne({ aggregateId: account }, { $inc: { totalApprovedWithdrawalAmount: accountExist.totalApprovedDepositAmount-amount } });
        }
      }, AccountEvents)
      
      break;
    }
   }
   
  }
}