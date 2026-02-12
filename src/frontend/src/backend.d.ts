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
    image?: ExternalBlob;
    roomId: RoomId;
}
export interface Server {
    id: ServerId;
    owner: User;
    name: string;
    createdAt: Time;
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
export type MessageId = bigint;
export interface ChatMessage {
    id: MessageId;
    content: string;
    sender: User;
    timestamp: Time;
    image?: ExternalBlob;
    roomId: RoomId;
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
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    blockUser(user: User): Promise<void>;
    createRoom(name: string): Promise<RoomId>;
    createServer(name: string): Promise<{
        id: ServerId;
        owner: User;
        name: string;
        createdAt: Time;
    }>;
    endVoiceSession(roomId: RoomId): Promise<void>;
    fetchMessages(roomId: RoomId, afterId: MessageId, limit: bigint): Promise<Array<ChatMessage>>;
    getCallerFriends(): Promise<Array<User>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getLinkedAltAccounts(): Promise<Array<Principal>>;
    getPendingAltRequests(): Promise<{
        incoming: Array<AltAccountRequest>;
        outgoing: Array<AltAccountRequest>;
    }>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getUserServers(user: User): Promise<Array<Server>>;
    getVoiceSessionState(roomId: RoomId): Promise<VoiceSessionState | null>;
    isCallerAdmin(): Promise<boolean>;
    linkAltAccount(altPrincipal: Principal): Promise<void>;
    listRooms(): Promise<Array<Room>>;
    postMessage(message: NewChatMessage): Promise<MessageId>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    searchUsersByName(searchText: string): Promise<Array<UserProfile>>;
    sendFriendRequest(to: User): Promise<void>;
    sendSdpAnswer(roomId: RoomId, answer: SdpAnswer): Promise<void>;
    sendSdpOffer(roomId: RoomId, offer: SdpOffer): Promise<void>;
    startVoiceSession(roomId: RoomId): Promise<void>;
    unblockUser(user: User): Promise<void>;
    unlinkAltAccount(altPrincipal: Principal): Promise<void>;
}
