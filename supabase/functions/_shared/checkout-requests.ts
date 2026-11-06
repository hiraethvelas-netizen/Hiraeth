/**
 * Customer requests are private operational notes and not shipping/fiscal
 * instructions. Keep arbitrary user input bounded and preserve only booleans.
 */
export function normalizeCustomerRequests(note: unknown, videoRequest: unknown): {
  customer_note: string;
  packing_video_requested: boolean;
} {
  return {
    customer_note: typeof note === "string" ? note.trim().slice(0, 800) : "",
    packing_video_requested: videoRequest === true,
  };
}
