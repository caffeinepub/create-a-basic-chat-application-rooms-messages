import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface UserPreferences {
    theme: ThemePreference;
    chatRefresh: ChatRefreshPreference;
}
export type Time = bigint;
export type MessageId = bigint;
export interface ChatRefreshPreference {
    pollingIntervalMs: bigint;
}
export type RoomId = string;
export interface Room {
    id: RoomId;
    creator: Principal;
    name: string;
    createdAt: Time;
}
export interface Message {
    id: MessageId;
    content: string;
    sender: Principal;
    timestamp: Time;
    roomId: RoomId;
}
export interface AvatarConfig {
    backgroundColor: string;
    avatarType: string;
    color: string;
    textOverlays: string;
}
export interface UserProfile {
    bio: string;
    name: string;
    avatar: AvatarConfig;
}
export enum ThemePreference {
    dark = "dark",
    systemDefault = "systemDefault",
    light = "light"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createRoom(name: string): Promise<RoomId>;
    fetchMessages(roomId: RoomId, afterId: MessageId, limit: bigint): Promise<Array<Message>>;
    getCallerUserPreferences(): Promise<UserPreferences | null>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    listRooms(): Promise<Array<Room>>;
    postMessage(roomId: RoomId, content: string): Promise<MessageId>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    setCallerUserPreferences(preferences: UserPreferences): Promise<void>;
}
