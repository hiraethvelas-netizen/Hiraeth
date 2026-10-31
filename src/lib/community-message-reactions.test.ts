import { describe, expect, it } from "vitest";
import { getMessageReactionOperation } from "@/lib/community-message-reactions";

describe("community chat message reactions", () => {
  it("inserts a reaction when the member has not reacted yet", () => {
    expect(getMessageReactionOperation(null, "heart")).toBe("insert");
    expect(getMessageReactionOperation(null, "fire")).toBe("insert");
  });

  it("removes the reaction when the member selects the same reaction again", () => {
    expect(getMessageReactionOperation("heart", "heart")).toBe("delete");
    expect(getMessageReactionOperation("fire", "fire")).toBe("delete");
  });

  it("updates the existing reaction when the member chooses the other reaction", () => {
    expect(getMessageReactionOperation("heart", "fire")).toBe("update");
    expect(getMessageReactionOperation("fire", "heart")).toBe("update");
  });
});
