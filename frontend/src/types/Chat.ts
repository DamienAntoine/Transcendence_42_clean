


export interface DmMessage {
  id: number;
  roomId: string;
  senderId: number;
  senderDisplayName: string;
  content: string;
  timestamp: string;
}


export interface ChatMessage {
  userId: number;
  displayName: string;
  content: string;
  timestamp: string;
}


export interface SaveDmResult {
  id: number;
  success: boolean;
}


export interface FriendStatus {
  userId: number;
  displayName: string;
  online: boolean;
  status?: 'online' | 'offline' | 'in_game';
}


export interface FriendRequest {
  id: number;
  senderId: number;
  senderDisplayName: string;
  receiverId: number;
  receiverDisplayName: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}


export interface FriendsList {
  friends: FriendStatus[];
  pendingRequests: FriendRequest[];
  sentRequests: FriendRequest[];
}


export interface BlockedUser {
  id: number;
  blockedUserId: number;
  blockedUserDisplayName: string;
  blockedAt: string;
}


export interface MarkReadBody {
  lastReadId: number;
}


export interface UnreadCount {
  peerId: number;
  peerDisplayName: string;
  unreadCount: number;
}


export type ChatWSMessage =
  | { type: 'CHAT_MESSAGE'; userId: number; displayName: string; content: string; timestamp: string }
  | { type: 'HISTORY'; messages: Array<{ userId: number; displayName: string; content: string; timestamp: string }> }
  | { type: 'INVITE_PONG'; fromUserId: number; fromDisplayName: string; gameId: string }
  | { type: 'USER_JOINED'; userId: number; displayName: string }
  | { type: 'USER_LEFT'; userId: number; displayName: string }
  | { type: 'ERROR'; message: string };


export type DmWSMessage =
  | { type: 'HISTORY'; roomId: string; messages: DmMessage[]; lastReadId: number }
  | { type: 'DM_MESSAGE'; message: DmMessage }
  | { type: 'READ_RECEIPT'; peerId: number; lastReadId: number }
  | { type: 'ERROR'; message: string };


export type DmWSAction =
  | { type: 'REQUEST_HISTORY' }
  | { type: 'MARK_READ'; lastReadId: number }
  | { type: 'SEND_MESSAGE'; message: string };
