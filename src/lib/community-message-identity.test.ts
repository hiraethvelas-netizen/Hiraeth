import { describe, expect, it } from "vitest";
import { getCommunityMessageIdentity } from "@/lib/community-message-identity";

describe("community message identity", () => {
  it("marks administrator messages as official Hiraeth messages", () => {
    expect(getCommunityMessageIdentity(true)).toEqual({
      label: "Hiraeth oficial",
      bubbleClassName: "community-message-bubble--official",
    });
  });

  it("does not apply official branding to member messages", () => {
    expect(getCommunityMessageIdentity(false)).toEqual({
      label: null,
      bubbleClassName: "",
    });
  });
});
