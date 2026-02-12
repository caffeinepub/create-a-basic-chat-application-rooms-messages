import Time "mo:core/Time";
import Text "mo:core/Text";
import List "mo:core/List";
import Map "mo:core/Map";
import Set "mo:core/Set";
import Nat "mo:core/Nat";
import Order "mo:core/Order";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Iter "mo:core/Iter";

import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";

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
      Runtime.trap("Unauthorized: Only users can view other profiles");
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
  let roomMembers = Map.empty<RoomId, Set.Set<User>>();
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

    if (not isRoomMember(roomId, caller)) {
      Runtime.trap("You are not a member of this room");
    };

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

  // --- DisCal Server Management ---

  public type ServerId = Text;

  public type Server = {
    id : ServerId;
    owner : User;
    name : Text;
    createdAt : Time.Time;
  };

  let servers = Map.empty<ServerId, Server>();

  func generateServerId(owner : User) : ServerId {
    owner.toText() # "_" # Time.now().toText();
  };

  public shared ({ caller }) func createServer(name : Text) : async {
    id : ServerId;
    owner : User;
    name : Text;
    createdAt : Time.Time;
  } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create servers");
    };

    let ownedCount = servers.keys().toArray().foldLeft(
      0,
      func(acc, id) {
        switch (servers.get(id)) {
          case (?server) { if (server.owner == caller) { acc + 1 } else { acc } };
          case (null) { acc };
        };
      },
    );

    if (ownedCount >= 100) {
      Runtime.trap("Maximum of 100 servers allowed");
    };

    let newServer : Server = {
      id = generateServerId(caller);
      owner = caller;
      name;
      createdAt = Time.now();
    };

    servers.add(newServer.id, newServer);
    newServer;
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

    if (not isRoomMember(roomId, caller)) {
      Runtime.trap("Not a member of the room");
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

    if (not isRoomMember(roomId, caller)) {
      Runtime.trap("Not a member of the room");
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

    if (not isRoomMember(roomId, caller)) {
      Runtime.trap("Not a member of the room");
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

    if (not isRoomMember(roomId, caller)) {
      Runtime.trap("Not a member of the room");
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

    if (not isRoomMember(roomId, caller)) {
      Runtime.trap("Not a member of the room");
    };

    voiceSessionStates.get(roomId);
  };

  public shared ({ caller }) func endVoiceSession(roomId : RoomId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated apps can end a voice session");
    };

    if (not isRoomMember(roomId, caller)) {
      Runtime.trap("Not a member of the room");
    };

    voiceSessionStates.remove(roomId);
  };
};
