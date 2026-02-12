import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export type SdpAnswer = string;
export interface RoomMember {
    role: RoomMemberRole;
    user: User;
}
export type Time = bigint;
export type User = Principal;
export interface VoiceSessionState {
    offer?: SdpOffer;
    answer?: SdpAnswer;
    iceCandidates: Array<IceCandidate>;
}
export type RoomId = string;
export interface Room {
    id: RoomId;
    creator: User;
    name: string;
    createdAt: Time;
}
export interface NewChatMessage {
    content: string;
    video?: ExternalBlob;
    image?: ExternalBlob;
    roomId: RoomId;
}
export interface Server {
    id: ServerId;
    bio: string;
    owner: User;
    icon?: ExternalBlob;
    name: string;
    createdAt: Time;
    banner?: ExternalBlob;
    accentColor: string;
}
export type SdpOffer = string;
export interface IceCandidate {
    candidate: string;
    sdpMLineIndex: bigint;
}
export interface AltAccountRequest {
    status: AltLinkStatus;
    requester: User;
    altAccount: User;
    createdAt: Time;
}
export interface ServerAnnouncement {
    id: bigint;
    isDeleted: boolean;
    content: string;
    video?: ExternalBlob;
    author: User;
    timestamp: Time;
    image?: ExternalBlob;
    isPinned: boolean;
}
export type MessageId = bigint;
export interface ChatMessage {
    id: MessageId;
    isDeleted: boolean;
    content: string;
    video?: ExternalBlob;
    sender: User;
    timestamp: Time;
    image?: ExternalBlob;
    roomId: RoomId;
    isPinned: boolean;
}
export type ServerId = string;
export interface UserProfile {
    bio: string;
    backgroundColor: string;
    avatarType: string;
    name: string;
    color: string;
    textOverlays: string;
    profilePicture?: ExternalBlob;
}
export enum AltLinkStatus {
    revoked = "revoked",
    pending = "pending",
    accepted = "accepted"
}
export enum RoomMemberRole {
    member = "member",
    admin = "admin",
    moderator = "moderator",
    owner = "owner"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    acceptAltAccount(requester: Principal): Promise<void>;
    acceptFriendRequest(from: User): Promise<void>;
    addIceCandidate(roomId: RoomId, candidate: IceCandidate): Promise<void>;
    addUserToRoom(roomId: RoomId, user: User): Promise<void>;
    addUserToServer(serverId: ServerId, user: User): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    assignRoomMemberRole(roomId: RoomId, member: User, role: RoomMemberRole): Promise<void>;
    blockUser(user: User): Promise<void>;
    createRoom(name: string): Promise<RoomId>;
    createServer(name: string): Promise<{
        id: ServerId;
        bio: string;
        owner: User;
        icon?: ExternalBlob;
        name: string;
        createdAt: Time;
        banner?: ExternalBlob;
        accentColor: string;
    }>;
    deleteMessage(roomId: RoomId, messageId: MessageId): Promise<void>;
    deleteRoom(roomId: RoomId): Promise<boolean>;
    deleteServer(serverId: ServerId): Promise<boolean>;
    deleteServerAnnouncement(serverId: ServerId, announcementId: bigint): Promise<void>;
    editMessage(roomId: RoomId, messageId: MessageId, newContent: string): Promise<void>;
    editServerAnnouncement(serverId: ServerId, announcementId: bigint, newContent: string): Promise<void>;
    endVoiceSession(roomId: RoomId): Promise<void>;
    fetchMessages(roomId: RoomId, afterId: MessageId, limit: bigint): Promise<Array<ChatMessage>>;
    getActiveMembers(serverId: ServerId): Promise<Array<User>>;
    getCallerFriends(): Promise<Array<User>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getLinkedAltAccounts(): Promise<Array<Principal>>;
    getPendingAltRequests(): Promise<{
        incoming: Array<AltAccountRequest>;
        outgoing: Array<AltAccountRequest>;
    }>;
    getRoom(roomId: RoomId): Promise<Room | null>;
    getRoomMembers(roomId: RoomId): Promise<Array<RoomMember>>;
    getRoomMembersWithPresence(roomId: RoomId): Promise<Array<[User, boolean]>>;
    getServerAccentColor(serverId: ServerId): Promise<string>;
    getServerAnnouncements(serverId: ServerId, afterId: bigint, limit: bigint): Promise<Array<ServerAnnouncement>>;
    getServerBanner(serverId: ServerId): Promise<ExternalBlob | null>;
    getServerBio(serverId: ServerId): Promise<string>;
    getServerIcon(serverId: ServerId): Promise<ExternalBlob | null>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getUserServers(user: User): Promise<Array<Server>>;
    getVoiceSessionState(roomId: RoomId): Promise<VoiceSessionState | null>;
    isCallerAdmin(): Promise<boolean>;
    kickRoomMember(roomId: RoomId, member: User): Promise<void>;
    linkAltAccount(altPrincipal: Principal): Promise<void>;
    listRooms(): Promise<Array<Room>>;
    postMessage(message: NewChatMessage): Promise<MessageId>;
    postServerAnnouncement(serverId: ServerId, content: string, image: ExternalBlob | null, video: ExternalBlob | null): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    searchUsersByName(searchText: string): Promise<Array<UserProfile>>;
    sendFriendRequest(to: User): Promise<void>;
    sendSdpAnswer(roomId: RoomId, answer: SdpAnswer): Promise<void>;
    sendSdpOffer(roomId: RoomId, offer: SdpOffer): Promise<void>;
    setServerAccentColor(serverId: ServerId, accentColor: string): Promise<void>;
    setServerBanner(serverId: ServerId, banner: ExternalBlob | null): Promise<void>;
    setServerBio(serverId: ServerId, bio: string): Promise<void>;
    setServerIcon(serverId: ServerId, icon: ExternalBlob | null): Promise<void>;
    startVoiceSession(roomId: RoomId): Promise<void>;
    togglePin(roomId: RoomId, messageId: MessageId, pin: boolean): Promise<void>;
    toggleServerPin(serverId: ServerId, announcementId: bigint, pin: boolean): Promise<void>;
    unblockUser(user: User): Promise<void>;
    unlinkAltAccount(altPrincipal: Principal): Promise<void>;
    updatePresence(isActive: boolean): Promise<void>;
    updateRoomPresence(roomId: RoomId): Promise<void>;
}
