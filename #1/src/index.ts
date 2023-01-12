import { AccountEvents, CreditedEvent, DebitEvent, } from '../../events';
import R from 'ramda';

export function calculateAccountBalance(events: typeof AccountEvents, accountId: string): number {
  let balance = 0;
  balance = R.reduce((acc, event: CreditedEvent | DebitEvent) => {
    if (event.aggregateId === accountId) {
      if(event.body.amount){
        if (event.type === 'BalanceCredited') {
          return acc+=event.body.amount;
        } else {
          return acc-=event.body.amount;
        }
      }
    }
    return acc;
  }, 0, events as (CreditedEvent | DebitEvent)[]);
  return balance;
}

export function getAccountInformation(events: typeof AccountEvents, accountId: string) {
  let accountInfo:any= {};

  const acc = AccountEvents.find(event => event.aggregateId === accountId);
  if(!acc) return null;

  R.map((event)=>{
    const amount = event.body.amount ? event.body.amount:0;
    
    if ((event.aggregateId === accountId) && (event.type === 'AccountCreated' || event.type === 'AccountUpdated')) {
      accountInfo = {
        ...accountInfo,
        ...event.body,
      };
    }

    if( accountId === event.body.account &&(event.type === 'DepositCreated' || event.type === 'WithdrawalCreated')){
      if(!accountInfo.totalApprovedDepositAmount) accountInfo.totalApprovedDepositAmount = 0 ;
      if(!accountInfo.totalApprovedWithdrawalAmount) accountInfo.totalApprovedWithdrawalAmount = 0;

      let eventId = event.aggregateId;

      R.map((event)=>{
        if(event.aggregateId === eventId && (event.type === 'DepositApproved' || event.type === 'WithdrawalApproved') ){
          if (!accountInfo.totalApprovedDepositAmount) accountInfo.totalApprovedDepositAmount = 0;
          if (!accountInfo.totalApprovedWithdrawalAmount) accountInfo.totalApprovedWithdrawalAmount = 0;
          accountInfo[event.type === 'DepositApproved' ? 'totalApprovedDepositAmount' : 'totalApprovedWithdrawalAmount'] += amount;
        }
      },events);
    }
    
    accountInfo.totalApprovedWithdrawalAmount = accountInfo.totalApprovedDepositAmount - accountInfo.totalApprovedWithdrawalAmount;
    return accountInfo;
  },events)
  
  return accountInfo;
}