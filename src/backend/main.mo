import Map "mo:core/Map";
import List "mo:core/List";
import Iter "mo:core/Iter";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import Principal "mo:core/Principal";

actor {
  // Initialize the access control system
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  type Transaction = {
    id : Nat;
    txType : Text;
    token : Text;
    amount : Text;
    counterparty : Text;
    timestamp : Time.Time;
    status : Text;
    memo : Text;
  };

  public type UserProfile = {
    name : Text;
  };

  var nextTransactionId = 0;

  let transactions = Map.empty<Principal, List.List<Transaction>>();
  let userProfiles = Map.empty<Principal, UserProfile>();

  func getNextTransactionId() : Nat {
    let id = nextTransactionId;
    nextTransactionId += 1;
    id;
  };

  // User profile functions - available to any authenticated (non-anonymous) caller
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Must be authenticated");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Must be authenticated");
    };
    userProfiles.add(caller, profile);
  };

  // Transaction functions - available to any authenticated (non-anonymous) caller
  public shared ({ caller }) func recordTransaction(txType : Text, token : Text, amount : Text, counterparty : Text, status : Text, memo : Text) : async Nat {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Must be authenticated");
    };

    let id = getNextTransactionId();
    let tx : Transaction = {
      id;
      txType;
      token;
      amount;
      counterparty;
      timestamp = Time.now();
      status;
      memo;
    };

    let txList = switch (transactions.get(caller)) {
      case (null) {
        List.singleton<Transaction>(tx);
      };
      case (?existingList) {
        existingList.add(tx);
        existingList;
      };
    };

    transactions.add(caller, txList);
    id;
  };

  public query ({ caller }) func getTransactionHistory() : async [Transaction] {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Must be authenticated");
    };

    switch (transactions.get(caller)) {
      case (null) { [] };
      case (?txList) {
        txList.reverse().values().toArray();
      };
    };
  };

  public query ({ caller }) func getCallerPrincipal() : async Text {
    caller.toText();
  };
};
