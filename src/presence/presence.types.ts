export type PresenceUserState = {
  userId: string;
  isOnline: boolean;
  lastSeenAt: string | null;
};

export type PresenceSnapshotPayload = {
  users: PresenceUserState[];
  serverTime: string;
};

export type PresenceUpdatePayload = {
  userId: string;
  isOnline: boolean;
  lastSeenAt: string;
  serverTime: string;
};