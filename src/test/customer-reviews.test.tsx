import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type PublicReview = {
  id: string;
  rating: number;
  message: string;
  display_name: string;
  created_at: string;
  media_urls: string[];
};

const mock = vi.hoisted(() => ({
  reviews: [] as PublicReview[],
  userId: "customer-test" as string | null,
  insert: vi.fn(async (_payload: Record<string, unknown>): Promise<{ error: Error | null }> => ({
    error: null,
  })),
  upload: vi.fn(
    async (
      _path: string,
      _file: File,
      _options: { contentType: string; upsert: boolean },
    ): Promise<{ error: Error | null }> => ({ error: null }),
  ),
  getPublicUrl: vi.fn((path: string) => ({
    data: { publicUrl: `https://example.test/review-media/${path}` },
  })),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => {
      const query = {
        select: () => query,
        eq: () => query,
        order: () => query,
        limit: async () => ({ data: mock.reviews, error: null }),
        insert: mock.insert,
      };
      return query;
    },
    auth: {
      getUser: async () => ({ data: { user: mock.userId ? { id: mock.userId } : null } }),
    },
    storage: {
      from: () => ({ upload: mock.upload, getPublicUrl: mock.getPublicUrl }),
    },
  },
}));

import { CustomerReviews } from "@/components/CustomerReviews";

beforeEach(() => {
  mock.reviews = [
    {
      id: "review-test",
      rating: 4,
      message: "Aroma acolhedor e embalagem cuidadosa.",
      display_name: "Cliente Ana",
      created_at: "2026-11-01T12:00:00Z",
      media_urls: ["https://example.test/candle.jpg", "https://example.test/candle.mp4"],
    },
  ];
  mock.userId = "customer-test";
  mock.insert.mockReset().mockResolvedValue({ error: null });
  mock.upload.mockReset().mockResolvedValue({ error: null });
  mock.getPublicUrl.mockClear();
  let sequence = 0;
  vi.stubGlobal("crypto", { randomUUID: () => `review-file-${++sequence}` });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function openForm() {
  render(<CustomerReviews />);
  await screen.findByText(/Aroma acolhedor e embalagem cuidadosa/);
  fireEvent.click(screen.getByRole("button", { name: "Escrever avaliação" }));
  return screen.getByRole("dialog", { name: "Sua avaliação" });
}

function fillReview() {
  fireEvent.change(screen.getByLabelText("Seu nome"), { target: { value: "  Maria  " } });
  fireEvent.change(screen.getByLabelText("Sua experiência"), {
    target: { value: "  Gostei muito do aroma.  " },
  });
  fireEvent.click(screen.getByRole("button", { name: "3 foguinhos" }));
}

describe("Customer reviews after copy simplification", () => {
  it("keeps a single invitation heading and preserves the complete approved review and media", async () => {
    const { container } = render(<CustomerReviews />);
    await screen.findByText(/Aroma acolhedor e embalagem cuidadosa/);
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "Avaliações dos clientes" })).toBeInTheDocument();
    expect(screen.queryByText("A chama continua acesa")).not.toBeInTheDocument();
    expect(screen.queryByText("Sua história também faz parte da Hiraeth")).not.toBeInTheDocument();
    expect(screen.queryByText(/Seu carinho ajuda nossa chama/)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Avaliação de 4 de 5 foguinhos")).toBeInTheDocument();
    expect(screen.getByText("Cliente Ana")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Registro compartilhado por cliente da Hiraeth" }),
    ).toHaveAttribute("src", "https://example.test/candle.jpg");
    expect(container.querySelector("video")).toHaveAttribute(
      "src",
      "https://example.test/candle.mp4",
    );
    expect(container.querySelector("video")).toHaveAttribute("controls");
  });

  it("opens and closes the form without submitting a review", async () => {
    const dialog = await openForm();
    expect(within(dialog).getAllByRole("heading")).toHaveLength(1);
    expect(within(dialog).getByRole("heading", { name: "Sua avaliação" })).toBeInTheDocument();
    expect(within(dialog).getByText(/revisão/i)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Fechar formulário" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mock.insert).not.toHaveBeenCalled();
  });

  it("submits the selected rating and optional photo/video for moderation with the signed-in identity", async () => {
    await openForm();
    fillReview();
    expect(screen.getByRole("button", { name: "3 foguinhos" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const photo = new File(["photo"], "vela.jpg", { type: "image/jpeg" });
    const video = new File(["video"], "vela.mp4", { type: "video/mp4" });
    fireEvent.change(screen.getByLabelText(/^Fotos e vídeos/), {
      target: { files: [photo, video] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar avaliação" }));
    await waitFor(() =>
      expect(mock.insert).toHaveBeenCalledWith({
        order_id: null,
        user_id: "customer-test",
        display_name: "Maria",
        rating: 3,
        message: "Gostei muito do aroma.",
        media_urls: [
          "https://example.test/review-media/public/review-file-1.jpg",
          "https://example.test/review-media/public/review-file-2.mp4",
        ],
        approved: false,
      }),
    );
    expect(mock.upload).toHaveBeenNthCalledWith(1, "public/review-file-1.jpg", photo, {
      contentType: "image/jpeg",
      upsert: false,
    });
    expect(mock.upload).toHaveBeenNthCalledWith(2, "public/review-file-2.mp4", video, {
      contentType: "video/mp4",
      upsert: false,
    });
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Avaliação recebida! Ela aparecerá após a revisão.",
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("preserves guest submissions without requiring media or assigning another user's identity", async () => {
    mock.userId = null;
    await openForm();
    fillReview();
    fireEvent.click(screen.getByRole("button", { name: "Enviar avaliação" }));
    await waitFor(() =>
      expect(mock.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: null,
          order_id: null,
          media_urls: [],
          approved: false,
        }),
      ),
    );
    expect(mock.upload).not.toHaveBeenCalled();
  });

  it("keeps the form, selected rating and entered text when saving fails", async () => {
    mock.insert.mockResolvedValue({ error: new Error("Falha de gravação para teste.") });
    const dialog = await openForm();
    fillReview();
    const photo = new File(["photo"], "vela-mantida.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText(/^Fotos e vídeos/), { target: { files: [photo] } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar avaliação" }));
    expect(await within(dialog).findByRole("status")).toHaveTextContent(
      "Falha de gravação para teste.",
    );
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByRole("dialog", { name: "Sua avaliação" })).toBeInTheDocument();
    expect(screen.getByLabelText("Seu nome")).toHaveValue("  Maria  ");
    expect(screen.getByLabelText("Sua experiência")).toHaveValue("  Gostei muito do aroma.  ");
    expect(screen.getByRole("button", { name: "3 foguinhos" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Enviar avaliação" })).toBeEnabled();
    expect(within(dialog).getByText(/vela-mantida.jpg/)).toBeInTheDocument();
    expect(screen.queryByText(/Avaliação recebida/)).not.toBeInTheDocument();
  });

  it.each(["unsupported", "oversized"])(
    "rejects an %s attachment before any upload or review is saved",
    async (kind) => {
      await openForm();
      fillReview();
      const file = new File(["attachment"], kind === "unsupported" ? "arquivo.txt" : "vela.jpg", {
        type: kind === "unsupported" ? "text/plain" : "image/jpeg",
      });
      if (kind === "oversized") Object.defineProperty(file, "size", { value: 26 * 1024 * 1024 });
      fireEvent.change(screen.getByLabelText(/^Fotos e vídeos/), { target: { files: [file] } });
      fireEvent.click(screen.getByRole("button", { name: "Enviar avaliação" }));
      expect(await screen.findByRole("status")).toHaveTextContent(
        "Envie imagens ou vídeos de até 25 MB cada.",
      );
      expect(mock.upload).not.toHaveBeenCalled();
      expect(mock.insert).not.toHaveBeenCalled();
      expect(screen.getByRole("dialog", { name: "Sua avaliação" })).toBeInTheDocument();
    },
  );

  it("limits optional uploads to five files while preserving the review submission", async () => {
    await openForm();
    fillReview();
    const files = Array.from(
      { length: 6 },
      (_, index) => new File(["photo"], `vela-${index + 1}.jpg`, { type: "image/jpeg" }),
    );
    fireEvent.change(screen.getByLabelText(/^Fotos e vídeos/), { target: { files } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar avaliação" }));
    await waitFor(() => expect(mock.insert).toHaveBeenCalled());
    expect(mock.upload).toHaveBeenCalledTimes(5);
    expect(mock.upload.mock.calls.map((call) => call[1].name)).toEqual(
      files.slice(0, 5).map((file) => file.name),
    );
    expect(mock.insert.mock.calls[0]?.[0]["media_urls"]).toHaveLength(5);
  });
});
