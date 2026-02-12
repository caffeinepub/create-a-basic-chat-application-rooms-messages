import Time "mo:core/Time";
import Text "mo:core/Text";
import List "mo:core/List";
import Map "mo:core/Map";
import Set "mo:core/Set";
import Nat "mo:core/Nat";
import Iter "mo:core/Iter";
import Order "mo:core/Order";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";

import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import Migration "migration";

// Apply migration on upgrade (with-clause)
(with migration = Migration.run)
actor {
  include MixinStorage();

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

  // --- Social Features ---
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
  let friends = Map.empty<User, Set.Set<User>>();

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
    removeFriendReference(caller, user);
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
          friends.remove(user);
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
    video : ?Storage.ExternalBlob;
    isPinned : Bool;
    isDeleted : Bool;
  };

  module ChatMessage {
    public func compare(a : ChatMessage, b : ChatMessage) : Order.Order {
      Nat.compare(a.id, b.id);
    };
  };

  public type RoomMemberRole = {
    #owner;
    #admin;
    #moderator;
    #member;
  };

  type Room = {
    id : RoomId;
    name : Text;
    creator : User;
    createdAt : Time.Time;
  };

  public type RoomMember = {
    user : User;
    role : RoomMemberRole;
  };

  public type NewChatMessage = {
    roomId : RoomId;
    content : Text;
    image : ?Storage.ExternalBlob;
    video : ?Storage.ExternalBlob;
  };

  let rooms = Map.empty<RoomId, Room>();
  let roomMembers = Map.empty<RoomId, Map.Map<User, RoomMemberRole>>();
  let messages = Map.empty<RoomId, List.List<ChatMessage>>();
  var nextMessageId : MessageId = 1;

  // Alternate Account Linking Logic

  public type AltAccountRequest = {
    requester : User;
    altAccount : User;
    createdAt : Time.Time;
    status : AltLinkStatus;
  };

  public type AltLinkStatus = {
    #pending;
    #accepted;
    #revoked;
  };

  let altAccountRequests = Map.empty<(User, User), AltAccountRequest>();

  public shared ({ caller }) func linkAltAccount(altPrincipal : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can link alternate accounts");
    };

    if (caller == altPrincipal) {
      Runtime.trap("Cannot link to self as an alternate account");
    };

    switch (altAccountRequests.get((caller, altPrincipal))) {
      case (?existingRequest) {
        if (existingRequest.status == #accepted) {
          Runtime.trap("Alternate accounts already linked");
        };
      };
      case (null) {};
    };

    switch (altAccountRequests.get((altPrincipal, caller))) {
      case (?reverseRequest) {
        if (reverseRequest.status == #pending) {
          acceptAltAccountLink(caller, altPrincipal);
          return;
        };
      };
      case (null) {};
    };

    let newRequest : AltAccountRequest = {
      requester = caller;
      altAccount = altPrincipal;
      createdAt = Time.now();
      status = #pending;
    };

    altAccountRequests.add((caller, altPrincipal), newRequest);
  };

  public shared ({ caller }) func acceptAltAccount(requester : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can accept alternate account links");
    };

    switch (altAccountRequests.get((requester, caller))) {
      case (?request) {
        if (request.status != #pending) {
          Runtime.trap("No pending request found");
        };
        acceptAltAccountLink(requester, caller);
      };
      case (null) {
        Runtime.trap("No matching request found");
      };
    };
  };

  func acceptAltAccountLink(user : User, alt : User) {
    switch (altAccountRequests.get((user, alt))) {
      case (?userRequest) {
        let updatedUserRequest = {
          userRequest with
          status = #accepted;
        };
        altAccountRequests.add((user, alt), updatedUserRequest);
      };
      case (null) {
        let newUserRequest : AltAccountRequest = {
          requester = user;
          altAccount = alt;
          createdAt = Time.now();
          status = #accepted;
        };
        altAccountRequests.add((user, alt), newUserRequest);
      };
    };

    switch (altAccountRequests.get((alt, user))) {
      case (?altRequest) {
        let updatedAltRequest = {
          altRequest with
          status = #accepted;
        };
        altAccountRequests.add((alt, user), updatedAltRequest);
      };
      case (null) {
        let newAltRequest : AltAccountRequest = {
          requester = alt;
          altAccount = user;
          createdAt = Time.now();
          status = #accepted;
        };
        altAccountRequests.add((alt, user), newAltRequest);
      };
    };
  };

  public shared ({ caller }) func unlinkAltAccount(altPrincipal : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can unlink alternate accounts");
    };

    switch (altAccountRequests.get((caller, altPrincipal))) {
      case (?request) {
        if (request.status == #accepted or request.status == #pending) {
          let updatedRequest = {
            request with
            status = #revoked;
          };
          altAccountRequests.add((caller, altPrincipal), updatedRequest);
        };
      };
      case (null) {};
    };

    switch (altAccountRequests.get((altPrincipal, caller))) {
      case (?reverseRequest) {
        if (reverseRequest.status == #accepted or reverseRequest.status == #pending) {
          let updatedReverseRequest = {
            reverseRequest with
            status = #revoked;
          };
          altAccountRequests.add((altPrincipal, caller), updatedReverseRequest);
        };
      };
      case (null) {};
    };
  };

  public query ({ caller }) func getLinkedAltAccounts() : async [Principal] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view linked alternate accounts");
    };

    let allKeys = altAccountRequests.keys().toArray();

    let filteredKeys = allKeys.filter(func(k) { k.0 == caller or k.1 == caller });

    let acceptedKeys = filteredKeys.filter(
      func(key) {
        switch (altAccountRequests.get(key)) {
          case (?request) {
            request.status == #accepted;
          };
          case (null) { false };
        };
      }
    );

    let mappedAltAccounts = acceptedKeys.map(
      func(key) {
        if (key.0 == caller) { key.1 } else { key.0 };
      }
    );
    mappedAltAccounts;
  };

  public query ({ caller }) func getPendingAltRequests() : async {
    outgoing : [AltAccountRequest];
    incoming : [AltAccountRequest];
  } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view pending alternate account requests");
    };

    let outgoingArray = altAccountRequests.toArray().filter(
      func((k, v)) {
        k.0 == caller and v.status == #pending;
      }
    );

    let outgoingRequests = outgoingArray.map(func((_, v)) { v });

    let incomingArray = altAccountRequests.toArray().filter(
      func((k, v)) {
        k.1 == caller and v.status == #pending;
      }
    );
    let incomingRequests = incomingArray.map(func((_, v)) { v });

    {
      outgoing = outgoingRequests;
      incoming = incomingRequests;
    };
  };

  func isRoomMember(roomId : RoomId, user : User) : Bool {
    switch (roomMembers.get(roomId)) {
      case (null) { false };
      case (?members) { members.get(user) != null };
    };
  };

  func getRoomMemberRole(roomId : RoomId, user : User) : RoomMemberRole {
    switch (roomMembers.get(roomId)) {
      case (null) { Runtime.trap("No room with id: " # roomId) };
      case (?members) {
        if (not isRoomMember(roomId, user)) {
          Runtime.trap("User " # user.toText() # " does not have the required permissions to perform this action in room " # roomId);
        };

        switch (members.get(user)) {
          case (null) { #member };
          case (?role) { role };
        };
      };
    };
  };

  func requireAtLeastRole(roomId : RoomId, user : User, required : RoomMemberRole) {
    switch (roomMembers.get(roomId)) {
      case (null) {
        Runtime.trap("No room with id: " # roomId);
      };
      case (?members) {
        if (not isRoomMember(roomId, user)) {
          Runtime.trap("User " # user.toText() # " does not have the required permissions to perform this action in room " # roomId);
        };

        let role = switch (members.get(user)) {
          case (null) { #member };
          case (?r) { r };
        };

        switch (role, required) {
          case (#owner, _) { () };
          case (#admin, #admin or #moderator or #member) { () };
          case (#moderator, #moderator or #member) { () };
          case (#member, #member) { () };
          case (_) {
            Runtime.trap("User " # user.toText() # " does not have the required permissions to perform this action in room " # roomId);
          };
        };
      };
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

    let memberRoles = Map.empty<User, RoomMemberRole>();
    memberRoles.add(caller, #owner);
    roomMembers.add(id, memberRoles);
    id;
  };

  public shared ({ caller }) func addUserToRoom(roomId : RoomId, user : User) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add members to rooms");
    };

    // App-level admins can add users to any room
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      requireAtLeastRole(roomId, caller, #moderator);

      if (not isFriend(caller, user)) {
        Runtime.trap("Only friends can be added to room");
      };
    };

    switch (roomMembers.get(roomId)) {
      case (null) { Runtime.trap("Room does not exist") };
      case (?members) {
        members.add(user, #member);
      };
    };
  };

  public shared ({ caller }) func assignRoomMemberRole(roomId : RoomId, member : User, role : RoomMemberRole) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can manage room roles");
    };

    // App-level admins can assign any role
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      // Only owner can assign owner role
      switch (role) {
        case (#owner) {
          requireAtLeastRole(roomId, caller, #owner);
        };
        case (_) {
          requireAtLeastRole(roomId, caller, #admin);
        };
      };

      switch (roomMembers.get(roomId)) {
        case (null) { Runtime.trap("Room does not exist") };
        case (?members) {
          if (not isRoomMember(roomId, member)) {
            Runtime.trap("User is not a member of this room");
          };

          // Get target member's current role
          let targetRole = switch (members.get(member)) {
            case (null) { #member };
            case (?r) { r };
          };

          // Prevent admins from modifying owner roles
          let callerRole = getRoomMemberRole(roomId, caller);
          switch (callerRole, targetRole) {
            case (#admin, #owner) {
              Runtime.trap("Admins cannot modify owner roles");
            };
            case (_) {};
          };
        };
      };
    };

    switch (roomMembers.get(roomId)) {
      case (null) { Runtime.trap("Room does not exist") };
      case (?members) {
        if (not isRoomMember(roomId, member)) {
          Runtime.trap("User is not a member of this room");
        };
        members.add(member, role);
      };
    };
  };

  public shared ({ caller }) func kickRoomMember(roomId : RoomId, member : User) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can kick members");
    };

    switch (roomMembers.get(roomId)) {
      case (null) {
        Runtime.trap("No room with id: " # roomId);
      };
      case (?members) {
        if (not isRoomMember(roomId, member)) {
          Runtime.trap("Cannot kick: " # member.toText() # " is not a member of the room");
        };

        // App-level admins can kick anyone
        if (not AccessControl.isAdmin(accessControlState, caller)) {
          // Get roles
          let targetRole = switch (members.get(member)) {
            case (null) { #member };
            case (?r) { r };
          };

          let callerRole = getRoomMemberRole(roomId, caller);

          // Authorization rules:
          // - Cannot kick owner
          // - Only owner can kick admin
          // - Admin can kick moderator/member
          // - Moderator can kick member
          switch (targetRole) {
            case (#owner) {
              Runtime.trap("Cannot kick the room owner");
            };
            case (#admin) {
              if (callerRole != #owner) {
                Runtime.trap("Only the owner can kick admins");
              };
            };
            case (#moderator) {
              requireAtLeastRole(roomId, caller, #admin);
            };
            case (#member) {
              requireAtLeastRole(roomId, caller, #moderator);
            };
          };
        };

        members.remove(member);
      };
    };
  };

  public query ({ caller }) func listRooms() : async [Room] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can list rooms");
    };

    // App-level admins can see all rooms
    if (AccessControl.isAdmin(accessControlState, caller)) {
      return rooms.values().toArray();
    };

    rooms.values().toArray().filter(
      func(room : Room) : Bool {
        isRoomMember(room.id, caller);
      }
    );
  };

  public query ({ caller }) func getRoom(roomId : RoomId) : async ?Room {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get rooms");
    };
    rooms.get(roomId);
  };

  public query ({ caller }) func getRoomMembers(roomId : RoomId) : async [RoomMember] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get rooms");
    };

    switch (roomMembers.get(roomId)) {
      case (null) { [] };
      case (?members) {
        members.toArray().map(
          func((user, role)) {
            {
              user;
              role;
            };
          }
        );
      };
    };
  };

  public shared ({ caller }) func postMessage(message : NewChatMessage) : async MessageId {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can post messages");
    };

    switch (roomMembers.get(message.roomId)) {
      case (null) { Runtime.trap("Room does not exist") };
      case (?members) {
        // App-level admins can post to any room
        if (not AccessControl.isAdmin(accessControlState, caller)) {
          if (not isRoomMember(message.roomId, caller)) {
            Runtime.trap("You are not a member of this room");
          };
        };

        let chatMessage : ChatMessage = {
          id = nextMessageId;
          roomId = message.roomId;
          sender = caller;
          content = message.content;
          timestamp = Time.now();
          image = message.image;
          video = message.video;
          isPinned = false;
          isDeleted = false;
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

  public shared ({ caller }) func editMessage(roomId : RoomId, messageId : MessageId, newContent : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Must be authenticated to edit messages");
    };

    switch (messages.get(roomId)) {
      case (null) {
        Runtime.trap(
          "No message list exists for this room. This is likely not an internal server error. In this case, the given roomId cannot be found. Please check if the room exists and try again with the correct room id."
        );
      };
      case (?msgList) {
        let existingMsgArray = msgList.toArray();
        
        // App-level admins can edit any message
        let isAppAdmin = AccessControl.isAdmin(accessControlState, caller);
        
        let targetMsg = if (isAppAdmin) {
          existingMsgArray.find(func(msg) { msg.id == messageId })
        } else {
          existingMsgArray.find(func(msg) { msg.id == messageId and msg.sender == caller })
        };

        switch (targetMsg) {
          case (null) {
            if (isAppAdmin) {
              Runtime.trap("Cannot find the message with id: " # messageId.toText());
            } else {
              Runtime.trap(
                "Cannot find the message that you want to update! Please check if the message exists and try again with the correct message id. Message id: " # messageId.toText() # ". If you did find it, make sure that you are the original author, as you may only edit messages that you created yourself. "
              );
            };
          };
          case (?_) {
            msgList.clear();
            let newMsgArray = existingMsgArray.map(func(msg) { if (msg.id == messageId) { { msg with content = newContent } } else { msg } });
            for (msg in newMsgArray.values()) {
              msgList.add(msg);
            };
          };
        };
      };
    };
  };

  public query ({ caller }) func fetchMessages(roomId : RoomId, afterId : MessageId, limit : Nat) : async [ChatMessage] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can fetch messages");
    };

    // App-level admins can fetch messages from any room
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      if (not isRoomMember(roomId, caller)) {
        Runtime.trap("You are not a member of this room");
      };
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

  // --- DisCal Server Management ---

  public type ServerId = Text;

  public type Server = {
    id : ServerId;
    owner : User;
    name : Text;
    createdAt : Time.Time;
    icon : ?Storage.ExternalBlob;

    // New fields for v2
    bio : Text;
    banner : ?Storage.ExternalBlob;
    accentColor : Text;
  };

  let servers = Map.empty<ServerId, Server>();
  let serverMembers = Map.empty<ServerId, Set.Set<User>>();

  func generateServerId(owner : User) : ServerId {
    owner.toText() # "_" # Time.now().toText();
  };

  func isServerMember(serverId : ServerId, user : User) : Bool {
    switch (serverMembers.get(serverId)) {
      case (null) { false };
      case (?members) { members.contains(user) };
    };
  };

  // Server-wide chat
  type ServerAnnouncement = {
    id : Nat;
    author : User;
    content : Text;
    timestamp : Time.Time;
    image : ?Storage.ExternalBlob;
    video : ?Storage.ExternalBlob;
    isPinned : Bool;
    isDeleted : Bool;
  };

  var nextAnnouncementId = 1;

  // Now persistent map
  let serverAnnouncements = Map.empty<ServerId, List.List<ServerAnnouncement>>();

  public shared ({ caller }) func createServer(name : Text) : async {
    id : ServerId;
    owner : User;
    name : Text;
    createdAt : Time.Time;
    icon : ?Storage.ExternalBlob;
    bio : Text;
    banner : ?Storage.ExternalBlob;
    accentColor : Text;
  } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create servers");
    };

    let newServer : Server = {
      id = generateServerId(caller);
      owner = caller;
      name;
      createdAt = Time.now();
      icon = null;
      bio = "";
      banner = null;
      accentColor = "#404eed";
    };

    servers.add(newServer.id, newServer);

    // Add creator as first member
    let members = Set.empty<User>();
    members.add(caller);
    serverMembers.add(newServer.id, members);

    newServer;
  };

  public shared ({ caller }) func deleteServer(serverId : ServerId) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete servers");
    };
    switch (servers.get(serverId)) {
      case (null) { false };
      case (?server) {
        // App-level admins can delete any server
        if (not AccessControl.isAdmin(accessControlState, caller)) {
          if (server.owner != caller) {
            Runtime.trap("Unauthorized: Only server owners can delete their own servers");
          };
        };
        servers.remove(serverId);
        serverMembers.remove(serverId);
        serverAnnouncements.remove(serverId);
        true;
      };
    };
  };

  public query ({ caller }) func getUserServers(user : User) : async [Server] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view servers");
    };

    let filteredServers = servers.values().toArray().filter(
      func(server) { server.owner == user }
    );
    filteredServers;
  };

  public shared ({ caller }) func setServerIcon(serverId : ServerId, icon : ?Storage.ExternalBlob) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only server owners can set icons");
    };

    switch (servers.get(serverId)) {
      case (null) { Runtime.trap("Server not found") };
      case (?server) {
        // App-level admins can modify any server
        if (not AccessControl.isAdmin(accessControlState, caller)) {
          if (server.owner != caller) {
            Runtime.trap("Unauthorized: Only server owners can modify their own servers");
          };
        };

        let updatedServer : Server = {
          server with icon
        };

        servers.add(serverId, updatedServer);
      };
    };
  };

  public shared ({ caller }) func setServerBio(serverId : ServerId, bio : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only server owners can set bio");
    };

    switch (servers.get(serverId)) {
      case (null) { Runtime.trap("Server not found") };
      case (?server) {
        // App-level admins can modify any server
        if (not AccessControl.isAdmin(accessControlState, caller)) {
          if (server.owner != caller) {
            Runtime.trap("Unauthorized: Only server owners can modify their own servers");
          };
        };

        let updatedServer : Server = {
          server with bio
        };

        servers.add(serverId, updatedServer);
      };
    };
  };

  public shared ({ caller }) func setServerBanner(serverId : ServerId, banner : ?Storage.ExternalBlob) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only server owners can set banner");
    };

    switch (servers.get(serverId)) {
      case (null) { Runtime.trap("Server not found") };
      case (?server) {
        // App-level admins can modify any server
        if (not AccessControl.isAdmin(accessControlState, caller)) {
          if (server.owner != caller) {
            Runtime.trap("Unauthorized: Only server owners can modify their own servers");
          };
        };

        let updatedServer : Server = {
          server with banner
        };

        servers.add(serverId, updatedServer);
      };
    };
  };

  public shared ({ caller }) func setServerAccentColor(serverId : ServerId, accentColor : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only server owners can set accent color");
    };

    switch (servers.get(serverId)) {
      case (null) { Runtime.trap("Server not found") };
      case (?server) {
        // App-level admins can modify any server
        if (not AccessControl.isAdmin(accessControlState, caller)) {
          if (server.owner != caller) {
            Runtime.trap("Unauthorized: Only server owners can modify their own servers");
          };
        };

        let updatedServer : Server = {
          server with accentColor
        };

        servers.add(serverId, updatedServer);
      };
    };
  };

  public query ({ caller }) func getServerIcon(serverId : ServerId) : async ?Storage.ExternalBlob {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access server icons");
    };

    switch (servers.get(serverId)) {
      case (null) { null };
      case (?server) { server.icon };
    };
  };

  public query ({ caller }) func getServerBio(serverId : ServerId) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access server bio");
    };

    switch (servers.get(serverId)) {
      case (null) { Runtime.trap("Server not found") };
      case (?server) { server.bio };
    };
  };

  public query ({ caller }) func getServerBanner(serverId : ServerId) : async ?Storage.ExternalBlob {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access server banner");
    };

    switch (servers.get(serverId)) {
      case (null) { Runtime.trap("Server not found") };
      case (?server) { server.banner };
    };
  };

  public query ({ caller }) func getServerAccentColor(serverId : ServerId) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access server accent color");
    };

    switch (servers.get(serverId)) {
      case (null) { Runtime.trap("Server not found") };
      case (?server) { server.accentColor };
    };
  };

  public shared ({ caller }) func deleteRoom(roomId : RoomId) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete rooms");
    };
    switch (rooms.get(roomId)) {
      case (null) { false };
      case (?room) {
        // App-level admins can delete any room
        if (not AccessControl.isAdmin(accessControlState, caller)) {
          requireAtLeastRole(roomId, caller, #owner);
        };
        rooms.remove(roomId);
        roomMembers.remove(roomId);
        messages.remove(roomId);
        true;
      };
    };
  };

  public query ({ caller }) func getServerAnnouncements(serverId : ServerId, afterId : Nat, limit : Nat) : async [ServerAnnouncement] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view announcements");
    };

    // Verify server exists
    switch (servers.get(serverId)) {
      case (null) { Runtime.trap("Server not found") };
      case (?_) {};
    };

    // App-level admins can view announcements from any server
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      // Verify caller is a member of the server
      if (not isServerMember(serverId, caller)) {
        Runtime.trap("Unauthorized: Only server members can view announcements");
      };
    };

    switch (serverAnnouncements.get(serverId)) {
      case (null) { [] };
      case (?announcements) {
        let filtered = announcements.toArray().filter(
          func(a) { a.id > afterId }
        );
        let limited = if (filtered.size() > limit) {
          filtered.sliceToArray(0, limit);
        } else {
          filtered;
        };
        limited;
      };
    };
  };

  public shared ({ caller }) func postServerAnnouncement(serverId : ServerId, content : Text, image : ?Storage.ExternalBlob, video : ?Storage.ExternalBlob) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can post announcements");
    };

    switch (servers.get(serverId)) {
      case (null) { Runtime.trap("Server not found") };
      case (?_) {
        // App-level admins can post to any server
        if (not AccessControl.isAdmin(accessControlState, caller)) {
          // Verify caller is a member of the server
          if (not isServerMember(serverId, caller)) {
            Runtime.trap("Unauthorized: Only server members can post announcements");
          };
        };

        let announcement : ServerAnnouncement = {
          id = nextAnnouncementId;
          author = caller;
          content;
          timestamp = Time.now();
          image;
          video;
          isPinned = false;
          isDeleted = false;
        };

        let announcementList = switch (serverAnnouncements.get(serverId)) {
          case (null) { List.empty<ServerAnnouncement>() };
          case (?existing) { existing };
        };

        announcementList.add(announcement);
        serverAnnouncements.add(serverId, announcementList);
        nextAnnouncementId += 1;
      };
    };
  };

  public shared ({ caller }) func editServerAnnouncement(serverId : ServerId, announcementId : Nat, newContent : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Must be authenticated to edit announcements");
    };

    switch (serverAnnouncements.get(serverId)) {
      case (null) {
        Runtime.trap(
          "No announcement list exists for this server. This is likely not an internal server error. In this case, the given serverId cannot be found. Please check if the server exists and try again with the correct server id. "
        );
      };
      case (?announcementList) {
        let existingAnnouncements = announcementList.toArray();
        
        // App-level admins can edit any announcement
        let isAppAdmin = AccessControl.isAdmin(accessControlState, caller);
        
        let targetAnnouncement = if (isAppAdmin) {
          existingAnnouncements.find(func(a) { a.id == announcementId })
        } else {
          existingAnnouncements.find(func(a) { a.id == announcementId and a.author == caller })
        };

        switch (targetAnnouncement) {
          case (null) {
            if (isAppAdmin) {
              Runtime.trap("Announcement not found for the given id: " # announcementId.toText());
            } else {
              Runtime.trap(
                "Announcement not found for the given id! Please check if the announcement exists and try again with the correct id. Id: " # announcementId.toText() # ". If it does exist, please make sure that you are the original author as you may only edit your own announcements."
              );
            };
          };
          case (?_) {
            announcementList.clear();
            let newAnnouncements = existingAnnouncements.map(func(a) { if (a.id == announcementId) { { a with content = newContent } } else { a } });
            for (a in newAnnouncements.values()) {
              announcementList.add(a);
            };
          };
        };
      };
    };
  };

  public shared ({ caller }) func addUserToServer(serverId : ServerId, user : User) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add members to servers");
    };

    switch (servers.get(serverId)) {
      case (null) { Runtime.trap("Server not found") };
      case (?server) {
        // App-level admins can add members to any server
        if (not AccessControl.isAdmin(accessControlState, caller)) {
          if (server.owner != caller) {
            Runtime.trap("Unauthorized: Only server owners can add members");
          };
        };

        switch (serverMembers.get(serverId)) {
          case (null) {
            let members = Set.empty<User>();
            members.add(user);
            serverMembers.add(serverId, members);
          };
          case (?members) {
            members.add(user);
          };
        };
      };
    };
  };

  public shared ({ caller }) func deleteMessage(roomId : RoomId, messageId : MessageId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete messages");
    };

    switch (messages.get(roomId)) {
      case (null) {
        Runtime.trap(
          "Message list does not exist for this room. It is likely that the room is not present anymore. Check if the room exists and try again with correct roomId. RoomId: " # roomId
        );
      };
      case (?msgList) {
        let existingMsgArray = msgList.toArray();
        
        // App-level admins can delete any message
        let isAppAdmin = AccessControl.isAdmin(accessControlState, caller);
        
        let targetMsg = if (isAppAdmin) {
          existingMsgArray.find(func(msg) { msg.id == messageId })
        } else {
          existingMsgArray.find(func(msg) { msg.id == messageId and msg.sender == caller })
        };

        switch (targetMsg) {
          case (null) {
            if (isAppAdmin) {
              Runtime.trap("Could not find message with id: " # messageId.toText());
            } else {
              Runtime.trap("Could not find message with id: " # messageId.toText() # " for sender: " # caller.toText() # ". It could be that didn't send the message. ");
            };
          };
          case (?_) {
            msgList.clear();
            let newMsgArray = existingMsgArray.map(func(msg) { if (msg.id == messageId) { { msg with isDeleted = true } } else { msg } });
            for (msg in newMsgArray.values()) {
              msgList.add(msg);
            };
          };
        };
      };
    };
  };

  public shared ({ caller }) func deleteServerAnnouncement(serverId : ServerId, announcementId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete announcements");
    };

    switch (serverAnnouncements.get(serverId)) {
      case (null) { Runtime.trap("Announcement list does not exist for this server") };
      case (?announcements) {
        let existingAnnounces = announcements.toArray();
        
        // App-level admins can delete any announcement
        let isAppAdmin = AccessControl.isAdmin(accessControlState, caller);
        
        let targetAnnouncement = if (isAppAdmin) {
          existingAnnounces.find(func(a) { a.id == announcementId })
        } else {
          existingAnnounces.find(func(a) { a.id == announcementId and a.author == caller })
        };

        switch (targetAnnouncement) {
          case (null) {
            if (isAppAdmin) {
              Runtime.trap("Cannot find announcement with id: " # announcementId.toText());
            } else {
              Runtime.trap("Cannot find this announcement");
            };
          };
          case (?_) {
            announcements.clear();
            let newAnnounces = existingAnnounces.map(func(a) { if (a.id == announcementId) { { a with isDeleted = true } } else { a } });
            for (a in newAnnounces.values()) {
              announcements.add(a);
            };
          };
        };
      };
    };
  };

  public shared ({ caller }) func togglePin(roomId : RoomId, messageId : MessageId, pin : Bool) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can pin/unpin messages");
    };

    switch (messages.get(roomId)) {
      case (null) { Runtime.trap("Message list does not exist for this room") };
      case (?msgList) {
        let existingMsgArray = msgList.toArray();
        
        // App-level admins can pin any message
        let isAppAdmin = AccessControl.isAdmin(accessControlState, caller);
        
        let targetMsg = if (isAppAdmin) {
          existingMsgArray.find(func(msg) { msg.id == messageId })
        } else {
          existingMsgArray.find(func(msg) { msg.id == messageId and msg.sender == caller })
        };

        switch (targetMsg) {
          case (null) {
            if (isAppAdmin) {
              Runtime.trap("Cannot find message with id: " # messageId.toText());
            } else {
              Runtime.trap("Cannot find this message");
            };
          };
          case (?_) {
            msgList.clear();
            let newMsgArray = existingMsgArray.map(func(msg) { if (msg.id == messageId) { { msg with isPinned = pin } } else { msg } });
            for (msg in newMsgArray.values()) {
              msgList.add(msg);
            };
          };
        };
      };
    };
  };

  public shared ({ caller }) func toggleServerPin(serverId : ServerId, announcementId : Nat, pin : Bool) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can pin/unpin announcements");
    };

    switch (serverAnnouncements.get(serverId)) {
      case (null) { Runtime.trap("Announcement list does not exist for this server") };
      case (?announcements) {
        let existingAnnounces = announcements.toArray();
        
        // App-level admins can pin any announcement
        let isAppAdmin = AccessControl.isAdmin(accessControlState, caller);
        
        let targetAnnouncement = if (isAppAdmin) {
          existingAnnounces.find(func(a) { a.id == announcementId })
        } else {
          existingAnnounces.find(func(a) { a.id == announcementId and a.author == caller })
        };

        switch (targetAnnouncement) {
          case (null) {
            if (isAppAdmin) {
              Runtime.trap("Cannot find announcement with id: " # announcementId.toText());
            } else {
              Runtime.trap("Cannot find this announcement");
            };
          };
          case (?_) {
            announcements.clear();
            let newAnnounces = existingAnnounces.map(func(a) { if (a.id == announcementId) { { a with isPinned = pin } } else { a } });
            for (a in newAnnounces.values()) {
              announcements.add(a);
            };
          };
        };
      };
    };
  };

  // --- Voice Chat Signaling

  public type SdpOffer = Text;
  public type SdpAnswer = Text;
  public type IceCandidate = {
    candidate : Text;
    sdpMLineIndex : Nat;
  };

  public type VoiceSessionState = {
    offer : ?SdpOffer;
    answer : ?SdpAnswer;
    iceCandidates : [IceCandidate];
  };

  let voiceSessionStates = Map.empty<RoomId, VoiceSessionState>();

  public shared ({ caller }) func startVoiceSession(roomId : RoomId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Must be authenticated to create a voice session");
    };

    // App-level admins can start voice sessions in any room
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      if (not isRoomMember(roomId, caller)) {
        Runtime.trap("Not a member of the room");
      };
    };

    if (voiceSessionStates.get(roomId) != null) {
      Runtime.trap("Session already exists");
    };

    let session : VoiceSessionState = {
      offer = null;
      answer = null;
      iceCandidates = [];
    };

    voiceSessionStates.add(roomId, session);
  };

  public shared ({ caller }) func sendSdpOffer(roomId : RoomId, offer : SdpOffer) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Application must be authenticated for voice signaling");
    };

    // App-level admins can send offers to any room
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      if (not isRoomMember(roomId, caller)) {
        Runtime.trap("Not a member of the room");
      };
    };

    let currentState = switch (voiceSessionStates.get(roomId)) {
      case (null) { Runtime.trap("Session not found") };
      case (?current) { current };
    };

    let updatedState : VoiceSessionState = {
      currentState with
      offer = ?offer;
    };

    voiceSessionStates.add(roomId, updatedState);
  };

  public shared ({ caller }) func sendSdpAnswer(roomId : RoomId, answer : SdpAnswer) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated apps can send SDP answers");
    };

    // App-level admins can send answers to any room
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      if (not isRoomMember(roomId, caller)) {
        Runtime.trap("Not a member of the room");
      };
    };

    let currentState = switch (voiceSessionStates.get(roomId)) {
      case (null) { Runtime.trap("Session not found") };
      case (?current) { current };
    };

    let updatedState : VoiceSessionState = {
      currentState with
      answer = ?answer;
    };

    voiceSessionStates.add(roomId, updatedState);
  };

  public shared ({ caller }) func addIceCandidate(roomId : RoomId, candidate : IceCandidate) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated apps can send ICE candidates");
    };

    // App-level admins can add ICE candidates to any room
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      if (not isRoomMember(roomId, caller)) {
        Runtime.trap("Not a member of the room");
      };
    };

    let currentState = switch (voiceSessionStates.get(roomId)) {
      case (null) { Runtime.trap("Session not found") };
      case (?current) { current };
    };

    let updatedCandidates = currentState.iceCandidates.concat([candidate]);
    let updatedState : VoiceSessionState = {
      currentState with
      iceCandidates = updatedCandidates;
    };

    voiceSessionStates.add(roomId, updatedState);
  };

  public query ({ caller }) func getVoiceSessionState(roomId : RoomId) : async ?VoiceSessionState {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Must be authenticated to join a voice session");
    };

    // App-level admins can view voice sessions in any room
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      if (not isRoomMember(roomId, caller)) {
        Runtime.trap("Not a member of the room");
      };
    };

    voiceSessionStates.get(roomId);
  };

  public shared ({ caller }) func endVoiceSession(roomId : RoomId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated apps can end a voice session");
    };

    // App-level admins can end voice sessions in any room
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      if (not isRoomMember(roomId, caller)) {
        Runtime.trap("Not a member of the room");
      };
    };

    voiceSessionStates.remove(roomId);
  };

  // Presence tracking

  type PresenceUpdate = {
    lastSeen : Time.Time;
    isActive : Bool;
  };

  // Now persistent map
  let userPresence = Map.empty<User, PresenceUpdate>();

  public shared ({ caller }) func updatePresence(isActive : Bool) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update presence");
    };
    let update : PresenceUpdate = {
      lastSeen = Time.now();
      isActive;
    };
    userPresence.add(caller, update);
  };

  public query ({ caller }) func getActiveMembers(serverId : ServerId) : async [User] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view active members");
    };

    // Verify server exists
    switch (servers.get(serverId)) {
      case (null) { Runtime.trap("Server not found") };
      case (?_) {};
    };

    // App-level admins can view active members of any server
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      // Verify caller is a member of the server
      if (not isServerMember(serverId, caller)) {
        Runtime.trap("Unauthorized: Only server members can view active members");
      };
    };

    // Get all server members
    let members = switch (serverMembers.get(serverId)) {
      case (null) { return [] };
      case (?m) { m };
    };

    // Only consider users active if lastSeen was in the last 5 minutes
    let fiveMinutes : Int = 5 * 60 * 1000000000;
    let now = Time.now();

    let activeUsers = members.toArray().filter(
      func(userId) {
        switch (userPresence.get(userId)) {
          case (null) { false };
          case (?presence) {
            presence.isActive or (now - presence.lastSeen < fiveMinutes);
          };
        };
      }
    );

    activeUsers;
  };

  // --- Room Presence Tracking (New) ---

  type RoomPresence = {
    roomId : RoomId;
    lastUpdate : Time.Time;
  };
  let roomPresence = Map.empty<User, RoomPresence>();

  public shared ({ caller }) func updateRoomPresence(roomId : RoomId) : async () {
    // App-level admins can update presence in any room
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      if (not isRoomMember(roomId, caller)) {
        Runtime.trap("Unauthorized: Only room members can update presence for a room");
      };
    };
    let presence : RoomPresence = {
      roomId;
      lastUpdate = Time.now();
    };
    roomPresence.add(caller, presence);
  };

  public query ({ caller }) func getRoomMembersWithPresence(roomId : RoomId) : async [(User, Bool)] {
    // App-level admins can view presence in any room
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      if (not isRoomMember(roomId, caller)) {
        Runtime.trap("Unauthorized: Only room members can view room presence");
      };
    };

    let members = switch (roomMembers.get(roomId)) {
      case (null) { return [] };
      case (?m) { m };
    };

    let fiveMinutes : Int = 5 * 60 * 1000000000;
    let now = Time.now();

    let memberPresence = members.toArray().map(
      func((userId, _role)) {
        let isActive = switch (roomPresence.get(userId)) {
          case (null) { false };
          case (?presence) {
            presence.roomId == roomId and (now - presence.lastUpdate < fiveMinutes);
          };
        };
        (userId, isActive);
      }
    );

    memberPresence;
  };
};
