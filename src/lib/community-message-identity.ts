export type CommunityMessageIdentity = {
  label: "Hiraeth oficial" | null;
  bubbleClassName: string;
};

export function getCommunityMessageIdentity(isAdmin: boolean): CommunityMessageIdentity {
  return isAdmin
    ? { label: "Hiraeth oficial", bubbleClassName: "community-message-bubble--official" }
    : { label: null, bubbleClassName: "" };
}
