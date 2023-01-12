import { AccountCreatedEvent, AccountUpdatedEvent, AggregateType, CreditedEvent, DebitEvent } from '../../../events';
import EventStore from '../library/eventstore';
import Aggregate from '../library/aggregate';
import { AccountAlreadyExistsError, AccountNotFoundError, InsufficientFundError } from '../library/errors';

export type Account = {
  username: string;
  fullName: string;
  password: string;
  email: string;
  balance: number;
};

export type AccountState = Account | null;

type AccountAggregateEvents = AccountCreatedEvent | AccountUpdatedEvent | CreditedEvent | DebitEvent;

export default class AccountAggregate extends Aggregate<AccountState> {

  public static findById(id: string, eventStore: EventStore): AccountAggregate {
    const account = new AccountAggregate(id, eventStore);
    account.fold();
    return account;
  }

  public get aggregateType() {
    return AggregateType.Account;
  }

  constructor (id: string, eventStore: EventStore) {
    super(id, null, eventStore);
  }

  /**
   * This method will be called for each event that will be processed by the aggregate
   * that is from the eventstore.
   * @param event 
   * @returns 
   */
  protected apply(event: AccountAggregateEvents): AccountState {
    // TODO: Implement this method
    switch(event.type) {
      case 'AccountCreated':
        return {
          ...event.body,
          balance:0,
        };
      case 'AccountUpdated':
        if(!this.state){
          return null;
        }
        return {
          username: event.body.username || this.state.username,
          fullName: event.body.fullName || this.state.fullName,
          password: event.body.password || this.state.password,
          email: event.body.email || this.state.email,
          balance: this.state.balance,
      };
      case 'BalanceCredited':
        if(!this.state){
          return null;
        }
        return {
          ...this.state,
          balance: this.state.balance + event.body.amount,
        };
      case 'BalanceDebited':
        if(!this.state){
          return null;
        }
        return {
          ...this.state,
          balance: this.state.balance - event.body.amount,
        };
      default:
        return this.state;
    }
  }
 
  public static createAccount(id: string, info: Omit<Account, 'balance'>, eventStore: EventStore)
  {
    const account = this.findById(id, eventStore);
    if(account.state){
      throw new AccountAlreadyExistsError(id);
    }
    account.createEvent('AccountCreated', info);
    return id;
  }

  public updateAccount(info: Partial<Omit<Account, 'balance'>>) {
    if(!this.state){
      throw new AccountNotFoundError(this.id);
    }
    this.createEvent('AccountUpdated', info);
    return true;
  }

  public creditBalance(amount: number) {
    if(!this.state){
      throw new AccountNotFoundError(this.id);
    }
    this.createEvent('BalanceCredited', { amount });
    return true;
  }

  public debitBalance(amount: number) {
    if(!this.state){
      throw new AccountNotFoundError(this.id)
    }
    if(amount>this.state.balance){
      throw new InsufficientFundError(this.id);
    }
    this.createEvent('BalanceDebited', { amount });
    return true;
  }
}
