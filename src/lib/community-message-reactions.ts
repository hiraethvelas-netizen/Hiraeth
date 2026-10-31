export type MessageReactionType = "heart" | "fire";
export type MessageReactionOperation = "insert" | "update" | "delete";

/** Chooses the database mutation for one member's reaction on a chat message. */
export function getMessageReactionOperation(
  currentReaction: MessageReactionType | null,
  nextReaction: MessageReactionType,
): MessageReactionOperation {
  if (currentReaction === nextReaction) return "delete";
  if (currentReaction) return "update";
  return "insert";
}
