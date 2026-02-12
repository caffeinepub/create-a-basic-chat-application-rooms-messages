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
export interface ChatMessage {
    id: MessageId;
    content: string;
    sender: User;
    timestamp: Time;
    image?: ExternalBlob;
    roomId: RoomId;
}
export type Time = bigint;
export type MessageId = bigint;
export type User = Principal;
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
export interface UserProfile {
    bio: string;
    backgroundColor: string;
    avatarType: string;
    name: string;
    color: string;
    textOverlays: string;
    profilePicture?: ExternalBlob;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    acceptFriendRequest(from: User): Promise<void>;
    addUserToRoom(roomId: RoomId, user: User): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    blockUser(user: User): Promise<void>;
    createRoom(name: string): Promise<RoomId>;
    fetchMessages(roomId: RoomId, afterId: MessageId, limit: bigint): Promise<Array<ChatMessage>>;
    getCallerFriends(): Promise<Array<User>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    listRooms(): Promise<Array<Room>>;
    postMessage(message: NewChatMessage): Promise<MessageId>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    searchUsersByName(searchText: string): Promise<Array<UserProfile>>;
    sendFriendRequest(to: User): Promise<void>;
    unblockUser(user: User): Promise<void>;
}
