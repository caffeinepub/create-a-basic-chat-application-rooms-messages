import Time "mo:core/Time";
import Text "mo:core/Text";
import List "mo:core/List";
import Map "mo:core/Map";
import Set "mo:core/Set";
import Nat "mo:core/Nat";
import Order "mo:core/Order";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";

import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";



actor {
  include MixinStorage();

  // Initialize the user system state
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  type User = Principal;

  public type UserProfile = {
    name : Text;
    bio : Text;
    avatarType : Text;
    color : Text;
    backgroundColor : Text;
    textOverlays : Text;
    profilePicture : ?Storage.ExternalBlob;
  };

  // Persistent Map for Storing User Profiles
  let userProfiles = Map.empty<Principal, UserProfile>();

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Social Features

  public type FriendshipStatus = {
    #none;
    #pending;
    #accepted;
    #blocked;
  };

  public type FriendRequest = {
    from : User;
    to : User;
    status : FriendshipStatus;
    requestedAt : Time.Time;
    updatedAt : Time.Time;
  };

  module FriendRequest {
    public func compare(f1 : (User, User), f2 : (User, User)) : Order.Order {
      switch (Principal.compare(f1.0, f2.0)) {
        case (#less) { #less };
        case (#greater) { #greater };
        case (#equal) { Principal.compare(f1.1, f2.1) };
      };
    };
  };

  let friendRequests = Map.empty<(User, User), FriendRequest>();
  let friends = Map.empty<User, Set.Set<User>>(); // Persistent Friends List

  // Profile Search and Friend Request Handling
  public query ({ caller }) func searchUsersByName(searchText : Text) : async [UserProfile] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can search for other users");
    };
    userProfiles.values().toArray().filter(
      func(profile) {
        profile.name.contains(#text searchText);
      }
    );
  };

  public shared ({ caller }) func sendFriendRequest(to : User) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can send friend requests");
    };

    let from = caller;
    // Check for existing/reverse relationship
    switch (friendRequests.get((to, from))) {
      case (?reverseRequest) {
        switch (reverseRequest.status) {
          case (#pending) {
            updateFriendshipStatus((to, from), #accepted);
            addFriend(from, to);
            return;
          };
          case (#accepted) {
            Runtime.trap("Already friends");
          };
          case (#blocked) {
            Runtime.trap("User has blocked you");
          };
          case (_) {};
        };
      };
      // Check duplicate requests
      case (null) {
        if (isFriend(from, to)) {
          Runtime.trap("Already friends");
        };
      };
    };

    switch (friendRequests.get((from, to))) {
      case (?existingRequest) {
        switch (existingRequest.status) {
          case (#pending) {
            Runtime.trap("Friend request already sent");
          };
          case (#accepted) {
            Runtime.trap("Already friends");
          };
          case (#blocked) {
            Runtime.trap("Cannot send request, user is blocked");
          };
          case (_) {};
        };
      };
      case (null) {};
    };

    let newRequest : FriendRequest = {
      from;
      to;
      status = #pending;
      requestedAt = Time.now();
      updatedAt = Time.now();
    };

    friendRequests.add((from, to), newRequest);
  };

  public shared ({ caller }) func acceptFriendRequest(from : User) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can accept friend requests");
    };
    let to = caller;

    // Verify the friend request exists and is pending
    switch (friendRequests.get((from, to))) {
      case (?request) {
        if (request.status != #pending) {
          Runtime.trap("No pending friend request from this user");
        };
      };
      case (null) {
        Runtime.trap("No friend request found from this user");
      };
    };

    updateFriendshipStatus((from, to), #accepted);
    addFriend(from, to);
  };

  public shared ({ caller }) func blockUser(user : User) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can block other users");
    };
    updateFriendshipStatus((caller, user), #blocked);
    removeFriendReference(caller, user); // Persistent Friends List Cleanup
    removeFriendReference(user, caller);
  };

  public shared ({ caller }) func unblockUser(user : User) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can unblock other users");
    };
    if (not isBlocked(caller, user)) {
      Runtime.trap("User was not blocked");
    };
    friendRequests.remove((caller, user));
    removeFriendReference(caller, user);
  };

  // Friendship and Relationship Utilities
  func updateFriendshipStatus(key : (User, User), status : FriendshipStatus) {
    switch (friendRequests.get(key)) {
      case (?existing) {
        friendRequests.add(
          key,
          {
            from = existing.from;
            to = existing.to;
            status;
            requestedAt = existing.requestedAt;
            updatedAt = Time.now();
          },
        );
      };
      case (null) {
        friendRequests.add(
          key,
          {
            from = key.0;
            to = key.1;
            status;
            requestedAt = Time.now();
            updatedAt = Time.now();
          },
        );
      };
    };
  };

  func isFriend(user1 : User, user2 : User) : Bool {
    switch (friends.get(user1)) {
      case (?friendsSet) {
        friendsSet.contains(user2);
      };
      case (null) { false };
    };
  };

  func addFriend(user1 : User, user2 : User) {
    let friendsSet1 = switch (friends.get(user1)) {
      case (?existing) { existing };
      case (null) { Set.empty<User>() };
    };
    let friendsSet2 = switch (friends.get(user2)) {
      case (?existing) { existing };
      case (null) { Set.empty<User>() };
    };

    friendsSet1.add(user2);
    friendsSet2.add(user1);

    friends.add(user1, friendsSet1);
    friends.add(user2, friendsSet2);
  };

  func removeFriendReference(user : User, friend : User) {
    switch (friends.get(user)) {
      case (?friendsSet) {
        friendsSet.remove(friend);
        if (friendsSet.isEmpty()) {
          friends.remove(user); // Persistent List Cleanup for Empty Sets
        };
      };
      case (null) {};
    };
  };

  func isBlocked(from : User, to : User) : Bool {
    switch (friendRequests.get((from, to))) {
      case (?request) {
        request.status == #blocked;
      };
      case (null) { false };
    };
  };

  public query ({ caller }) func getCallerFriends() : async [User] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view their friends list");
    };
    switch (friends.get(caller)) {
      case (null) { [] };
      case (?friendsSet) { friendsSet.toArray() };
    };
  };

  // Chat Application Types
  type RoomId = Text;
  type MessageId = Nat;

  public type ChatMessage = {
    id : MessageId;
    roomId : RoomId;
    sender : User;
    content : Text;
    timestamp : Time.Time;
    image : ?Storage.ExternalBlob;
  };

  module ChatMessage {
    public func compare(a : ChatMessage, b : ChatMessage) : Order.Order {
      Nat.compare(a.id, b.id);
    };
  };

  type Room = {
    id : RoomId;
    name : Text;
    creator : User;
    createdAt : Time.Time;
  };

  public type NewChatMessage = {
    roomId : RoomId;
    content : Text;
    image : ?Storage.ExternalBlob;
  };

  let rooms = Map.empty<RoomId, Room>();
  let roomMembers = Map.empty<RoomId, Set.Set<User>>(); // Persistent Room Memberships
  let messages = Map.empty<RoomId, List.List<ChatMessage>>();
  var nextMessageId : MessageId = 1;

  // Room Membership and Messaging Functions
  func isRoomMember(roomId : RoomId, user : User) : Bool {
    switch (roomMembers.get(roomId)) {
      case (null) { false };
      case (?members) { members.contains(user) };
    };
  };

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
    messages.add(id, List.empty<ChatMessage>());

    let creatorOnly = Set.empty<User>();
    creatorOnly.add(caller);
    roomMembers.add(id, creatorOnly);
    id;
  };

  public shared ({ caller }) func addUserToRoom(roomId : RoomId, user : User) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add members to rooms");
    };

    // Verify caller is a member of the room
    if (not isRoomMember(roomId, caller)) {
      Runtime.trap("You are not a member of this room");
    };

    // Verify the user being added is a friend
    if (not isFriend(caller, user)) {
      Runtime.trap("Only friends can be added to room");
    };

    switch (roomMembers.get(roomId)) {
      case (null) { Runtime.trap("Room does not exist") };
      case (?members) {
        members.add(user);
      };
    };
  };

  public query ({ caller }) func listRooms() : async [Room] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can list rooms");
    };

    // Only return rooms where the caller is a member
    rooms.values().toArray().filter(
      func(room : Room) : Bool {
        isRoomMember(room.id, caller);
      }
    );
  };

  public shared ({ caller }) func postMessage(message : NewChatMessage) : async MessageId {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can post messages");
    };

    switch (roomMembers.get(message.roomId)) {
      case (null) { Runtime.trap("Room does not exist") };
      case (?members) {
        if (not members.contains(caller)) {
          Runtime.trap("You are not a member of this room");
        };
        let chatMessage : ChatMessage = {
          id = nextMessageId;
          roomId = message.roomId;
          sender = caller;
          content = message.content;
          timestamp = Time.now();
          image = message.image;
        };

        switch (messages.get(message.roomId)) {
          case (null) { Runtime.trap("Message list not found") };
          case (?msgList) {
            msgList.add(chatMessage);
            nextMessageId += 1;
          };
        };

        nextMessageId - 1;
      };
    };
  };

  public query ({ caller }) func fetchMessages(roomId : RoomId, afterId : MessageId, limit : Nat) : async [ChatMessage] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can fetch messages");
    };

    // Verify caller is a member of the room
    if (not isRoomMember(roomId, caller)) {
      Runtime.trap("You are not a member of this room");
    };

    switch (messages.get(roomId)) {
      case (null) { [] };
      case (?msgs) {
        let filtered = msgs.toArray().filter(
          func(msg : ChatMessage) : Bool {
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
