import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PortalReadingMusicNote } from "@/components/PortalReadingMusicNote";

type ReadyCallback = () => void;
type UpdateCallback = (event: { data: { isPaused: boolean } }) => void;

afterEach(cleanup);

describe("Trilha sonora das inspirações NFC", () => {
  it("usa o player oficial de Runaway e toca/pausa apenas com interação", async () => {
    const play = vi.fn();
    const pause = vi.fn();
    const destroy = vi.fn();
    let ready: ReadyCallback | undefined;
    let update: UpdateCallback | undefined;

    const createController = vi.fn((_element: HTMLElement, options: {
      width: string; height: number; uri: string;
    }, callback: (controller: unknown) => void) => {
      expect(options).toEqual({
        width: "100%", height: 152, uri: "spotify:track:6Lv7cJFhuQYRmjeI3QqaWp",
      });
      callback({
        play, pause, destroy,
        addListener: (event: string, listener: ReadyCallback | UpdateCallback) => {
          if (event === "ready") ready = listener as ReadyCallback;
          if (event === "playback_update") update = listener as UpdateCallback;
        },
      });
    });

    const { unmount } = render(<PortalReadingMusicNote />);
    const button = screen.getByRole("button", { name: "Tocar Runaway — AURORA" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByText("Sinta-se em casa.")).not.toBeInTheDocument();
    expect(play).not.toHaveBeenCalled();

    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Sinta-se em casa.")).toBeInTheDocument();
    expect(screen.getByText(/Deixe/)).toHaveTextContent("Runaway — AURORA");
    expect(screen.getByRole("link", { name: "Abrir Runaway no Spotify" }))
      .toHaveAttribute("href", "https://open.spotify.com/track/6Lv7cJFhuQYRmjeI3QqaWp");

    const spotifyWindow = window as Window & {
      onSpotifyIframeApiReady?: (api: { createController: typeof createController }) => void;
    };
    expect(document.querySelector('script[src="https://open.spotify.com/embed/iframe-api/v1"]'))
      .not.toBeNull();
    await act(async () => {
      spotifyWindow.onSpotifyIframeApiReady?.({ createController });
    });
    await waitFor(() => expect(createController).toHaveBeenCalledOnce());
    act(() => { ready?.(); });
    expect(play).toHaveBeenCalledTimes(1);

    fireEvent.click(button);
    expect(pause).toHaveBeenCalledTimes(1);
    expect(button).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(button);
    expect(play).toHaveBeenCalledTimes(2);
    act(() => { update?.({ data: { isPaused: false } }); });
    expect(button).toHaveAttribute("aria-pressed", "true");

    unmount();
    expect(pause).toHaveBeenCalledTimes(2);
    expect(destroy).toHaveBeenCalledOnce();
  });
});
