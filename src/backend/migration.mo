import Map "mo:core/Map";
import Set "mo:core/Set";
import List "mo:core/List";
import Storage "blob-storage/Storage";
import Principal "mo:core/Principal";

module {
  type OldUserProfile = {
    name : Text;
    bio : Text;
    avatar : {
      avatarType : Text;
      color : Text;
      backgroundColor : Text;
      textOverlays : Text;
    };
  };

  type OldPreferences = {
    theme : {
      #light;
      #dark;
      #systemDefault;
    };
    chatRefresh : {
      pollingIntervalMs : Nat;
    };
  };

  type OldRoom = {
    id : Text;
    name : Text;
    creator : Principal;
    createdAt : Int;
  };

  type OldMessage = {
    id : Nat;
    roomId : Text;
    sender : Principal;
    content : Text;
    timestamp : Int;
  };

  type OldActor = {
    userProfiles : Map.Map<Principal, OldUserProfile>;
    userPreferences : Map.Map<Principal, OldPreferences>;
    rooms : Map.Map<Text, OldRoom>;
    messages : Map.Map<Text, List.List<OldMessage>>;
    nextMessageId : Nat;
  };

  type FriendshipStatus = {
    #none;
    #pending;
    #accepted;
    #blocked;
  };

  type FriendRequest = {
    from : Principal;
    to : Principal;
    status : FriendshipStatus;
    requestedAt : Int;
    updatedAt : Int;
  };

  type NewUserProfile = {
    name : Text;
    bio : Text;
    avatarType : Text;
    color : Text;
    backgroundColor : Text;
    textOverlays : Text;
    profilePicture : ?Storage.ExternalBlob;
  };

  type NewRoom = {
    id : Text;
    name : Text;
    creator : Principal;
    createdAt : Int;
  };

  type NewMessage = {
    id : Nat;
    roomId : Text;
    sender : Principal;
    content : Text;
    timestamp : Int;
    image : ?Storage.ExternalBlob;
  };

  type NewActor = {
    userProfiles : Map.Map<Principal, NewUserProfile>;
    rooms : Map.Map<Text, NewRoom>;
    roomMembers : Map.Map<Text, Set.Set<Principal>>;
    messages : Map.Map<Text, List.List<NewMessage>>;
    nextMessageId : Nat;
    friendRequests : Map.Map<(Principal, Principal), FriendRequest>;
    friends : Map.Map<Principal, Set.Set<Principal>>;
  };

  public func run(old : OldActor) : NewActor {
    let newUserProfiles = old.userProfiles.map<Principal, OldUserProfile, NewUserProfile>(
      func(_p, oldProfile) {
        {
          oldProfile with
          avatarType = oldProfile.avatar.avatarType;
          color = oldProfile.avatar.color;
          backgroundColor = oldProfile.avatar.backgroundColor;
          textOverlays = oldProfile.avatar.textOverlays;
          profilePicture = null;
        };
      }
    );

    let newMessages = old.messages.map<Text, List.List<OldMessage>, List.List<NewMessage>>(
      func(_roomId, oldMessageList) {
        oldMessageList.map<OldMessage, NewMessage>(
          func(oldMsg) {
            {
              oldMsg with
              image = null;
            };
          }
        );
      }
    );

    let roomMembers = Map.empty<Text, Set.Set<Principal>>();
    let friendRequests = Map.empty<(Principal, Principal), FriendRequest>();
    let friends = Map.empty<Principal, Set.Set<Principal>>();

    {
      old with
      userProfiles = newUserProfiles;
      messages = newMessages;
      roomMembers;
      friendRequests;
      friends;
    };
  };
};

