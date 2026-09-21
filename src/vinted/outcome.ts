// A service answers with the value and with how it got there. The tools need
// the second half to say, in the log, whether a call cost Vinted anything.
export type Outcome<T> = {
  value: T;
  cached: boolean;
};
