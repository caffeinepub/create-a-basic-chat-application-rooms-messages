import Time "mo:core/Time";
import Text "mo:core/Text";
import Array "mo:core/Array";
import List "mo:core/List";
import Map "mo:core/Map";
import Order "mo:core/Order";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Iter "mo:core/Iter";
import Migration "migration";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

// Use with-clause to enable state migration after upgrade
(with migration = Migration.run)
actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // User Profile Customization Type
  public type UserProfile = {
    name : Text;
    bio : Text;
    avatar : AvatarConfig;
  };

  public type AvatarConfig = {
    avatarType : Text;
    color : Text;
    backgroundColor : Text;
    textOverlays : Text;
  };

  // Theme Preference Type
  public type ThemePreference = {
    #light;
    #dark;
    #systemDefault; // Changed from .system to .systemDefault
  };

  // Messaging Refresh Preference Type
  public type ChatRefreshPreference = {
    pollingIntervalMs : Nat; // 0 disables automatic refresh
  };

  // User Preferences - new feature
  public type UserPreferences = {
    theme : ThemePreference;
    chatRefresh : ChatRefreshPreference;
  };

  // Store user preferences (new feature)
  let userPreferences = Map.empty<Principal, UserPreferences>();

  // Existing userProfiles map
  let userProfiles = Map.empty<Principal, UserProfile>();

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
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
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // User preferences functions
  public query ({ caller }) func getCallerUserPreferences() : async ?UserPreferences {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access preferences");
    };
    userPreferences.get(caller);
  };

  public shared ({ caller }) func setCallerUserPreferences(preferences : UserPreferences) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can set preferences");
    };
    userPreferences.add(caller, preferences);
  };

  // Chat Application Types
  type RoomId = Text;
  type MessageId = Nat;

  type Room = {
    id : RoomId;
    name : Text;
    creator : Principal;
    createdAt : Time.Time;
  };

  type Message = {
    id : MessageId;
    roomId : RoomId;
    sender : Principal;
    content : Text;
    timestamp : Time.Time;
  };

  module Message {
    public func compare(m1 : Message, m2 : Message) : Order.Order {
      Nat.compare(m1.id, m2.id);
    };
  };

  let rooms = Map.empty<RoomId, Room>();
  let messages = Map.empty<RoomId, List.List<Message>>();
  var nextMessageId : MessageId = 1;

  public shared ({ caller }) func createRoom(name : Text) : async RoomId {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create rooms");
    };

    let id = name.concat(Time.now().toText());
    let room : Room = {
      id;
      name;
      creator = caller;
      createdAt = Time.now();
    };

    rooms.add(id, room);
    messages.add(id, List.empty<Message>());
    id;
  };

  public query ({ caller }) func listRooms() : async [Room] {
    rooms.values().toArray();
  };

  public shared ({ caller }) func postMessage(roomId : RoomId, content : Text) : async MessageId {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can post messages");
    };

    switch (rooms.get(roomId)) {
      case (null) { Runtime.trap("Room does not exist") };
      case (?_) {
        let message : Message = {
          id = nextMessageId;
          roomId;
          sender = caller;
          content;
          timestamp = Time.now();
        };

        switch (messages.get(roomId)) {
          case (null) { Runtime.trap("Message list not found") };
          case (?msgs) {
            msgs.add(message);
            nextMessageId += 1;
          };
        };

        nextMessageId - 1;
      };
    };
  };

  public query ({ caller }) func fetchMessages(roomId : RoomId, afterId : MessageId, limit : Nat) : async [Message] {
    switch (messages.get(roomId)) {
      case (null) { [] };
      case (?msgs) {
        let filtered = msgs.toArray().filter(
          func(msg : Message) : Bool {
            msg.id > afterId
          }
        );
        let sorted = filtered.sort();
        let limited = if (sorted.size() > limit) {
          sorted.sliceToArray(0, limit);
        } else {
          sorted;
        };
        limited;
      };
    };
  };
};
