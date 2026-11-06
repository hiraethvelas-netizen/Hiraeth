import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PortalIntro } from "@/components/PortalIntro";
import { PortalChristmasDecor } from "@/components/PortalChristmasDecor";
import {
  carouselFromTheme,galleryDraftFromTheme,isSafePortalUrl,
  magicWorldTitle,portalCatalogDestination,spotifyPlaylistUrl,updatePortalGallery,
} from "@/lib/portal-experience";

afterEach(()=>cleanup());

describe("Portal NFC: vídeo de abertura obrigatório",()=>{
  it("revela o título e o botão só nos segundos finais, sem cobrir o início do vídeo",()=>{
    const enter=vi.fn();
    const {container}=render(<PortalIntro title="O Mundo da Magia" christmas
      videoUrl="/video-da-colecao.mp4" onEnter={enter}/>);
    const video=container.querySelector("video")!;
    Object.defineProperty(video,"duration",{configurable:true,value:8});
    expect(screen.queryByRole("heading",{name:"O Mundo da Magia"})).toBeNull();
    expect(screen.queryByRole("button",{name:/atravesse o portal/i})).toBeNull();

    Object.defineProperty(video,"currentTime",{configurable:true,value:3});
    fireEvent.timeUpdate(video);
    expect(screen.queryByRole("button",{name:/atravesse o portal/i})).toBeNull();
    expect(enter).not.toHaveBeenCalled();

    Object.defineProperty(video,"currentTime",{configurable:true,value:5});
    fireEvent.timeUpdate(video);
    expect(screen.getByRole("heading",{name:"O Mundo da Magia"})).toBeTruthy();
    expect(screen.queryByRole("button",{name:/atravesse o portal/i})).toBeNull();

    Object.defineProperty(video,"currentTime",{configurable:true,value:6.5});
    fireEvent.timeUpdate(video);
    fireEvent.click(screen.getByRole("button",{name:/atravesse o portal/i}));
    expect(enter).toHaveBeenCalledTimes(1);
  });
  it("mantém o botão visível ao terminar o vídeo, mesmo sem metadados de duração",()=>{
    const enter=vi.fn();
    const {container}=render(<PortalIntro title="O Mundo da Magia" videoUrl="/video.mp4" onEnter={enter}/>);
    const video=container.querySelector("video")!;
    fireEvent.timeUpdate(video);
    expect(screen.queryByRole("button",{name:/atravesse o portal/i})).toBeNull();
    fireEvent.ended(video);
    fireEvent.click(screen.getByRole("button",{name:/atravesse o portal/i}));
    expect(enter).toHaveBeenCalledTimes(1);
  });
  it("não permite pular a abertura em caso de erro no vídeo",()=>{
    const enter=vi.fn();
    const {container}=render(<PortalIntro title="O Mundo da Magia" videoUrl="/video.mp4" onEnter={enter}/>);
    const video=container.querySelector("video")!;
    fireEvent.error(video);
    expect(screen.getByRole("alert").textContent).toContain("Não foi possível");
    expect(screen.queryByRole("button",{name:/atravesse o portal/i})).toBeNull();
    expect(enter).not.toHaveBeenCalled();
  });
  it("sem vídeo configurado exige conteúdo, em vez de liberar a passagem",()=>{
    render(<PortalIntro title="O Mundo da Magia" videoUrl={null} onEnter={vi.fn()}/>);
    expect(screen.getByText(/ainda está sendo preparado/i)).toBeTruthy();
    expect(screen.queryByRole("button",{name:/atravesse o portal/i})).toBeNull();
  });
});

describe("Portal NFC: botões e catálogo",()=>{
  it("leva diretamente à subcategoria de magia na loja",()=>{
    expect(portalCatalogDestination("o-mundo-de-magia","/loja")).toBe("/loja?categoria=harry-potter");
    expect(magicWorldTitle("o-mundo-de-magia","Nome antigo")).toBe("O Mundo da Magia");
    expect(portalCatalogDestination("outra-colecao","/loja?categoria=outra")).toBe("/loja?categoria=outra");
  });
  it("só habilita playlist autêntica do Spotify",()=>{
    expect(spotifyPlaylistUrl("https://open.spotify.com/playlist/123abc?si=xyz"))
      .toBe("https://open.spotify.com/playlist/123abc");
    expect(spotifyPlaylistUrl("https://evil.com/playlist/123abc")).toBeNull();
    expect(spotifyPlaylistUrl("javascript:alert(1)")).toBeNull();
    expect(spotifyPlaylistUrl("")).toBeNull();
  });
  it("nunca publica links javascript ou imagens HTTP inseguras",()=>{
    expect(isSafePortalUrl("javascript:alert(1)")).toBe(false);
    expect(isSafePortalUrl("http://inseguro.example/foto.png")).toBe(false);
    expect(isSafePortalUrl("//outro-site.example")).toBe(false);
    expect(isSafePortalUrl("/loja?categoria=harry-potter")).toBe(true);
    expect(isSafePortalUrl("https://example.com/foto.png")).toBe(true);
  });
});

describe("Portal NFC: fotos de Natal configuráveis",()=>{
  const theme={palette:{background:"#10251d"},layout:"legacy",carousel_items:[]};
  it("mantém a paleta e outras configurações enquanto adiciona fotos",()=>{
    const photos=[{id:"a",title:"Natal entre as páginas",
      image_url:"https://example.com/natal.jpg",description:"Coleção natalina",url:"/loja"}];
    const updated=updatePortalGallery(theme,photos);
    expect(updated["palette"]).toEqual(theme.palette);
    expect(updated["layout"]).toBe("legacy");
    expect(galleryDraftFromTheme(updated)).toEqual(photos);
    expect(carouselFromTheme(updated)).toEqual(photos);
  });
  it("permite cadastrar rascunho de foto antes da URL definitiva",()=>{
    const edited=updatePortalGallery(theme,[{id:"b",title:"",description:"",image_url:"https://",url:""}]);
    expect(galleryDraftFromTheme(edited)[0]?.image_url).toBe("https://");
    expect(carouselFromTheme(edited)[0]?.image_url).toBe("");
  });
});


describe("Natal no portal mágico: decoração isolada e interativa",()=>{
  it("usa ornamentos sem carregar fotografias como fundos de página",()=>{
    const {container}=render(<PortalChristmasDecor scene="hero"/>);
    expect(container.querySelector(".portal-xmas-photographic-scene")).toBeNull();
    expect(container.querySelectorAll(".portal-xmas-bauble").length).toBeGreaterThan(3);
    expect(container.querySelectorAll(".portal-xmas-bulb").length).toBeGreaterThan(10);
  });

  it("distribui luzes, enfeites e velas sem bloquear o conteúdo",()=>{
    const {container}=render(<PortalChristmasDecor scene="hero"/>);
    expect(container.querySelectorAll(".portal-xmas-bulb")).toHaveLength(16);
    expect(container.querySelectorAll(".portal-xmas-bauble")).toHaveLength(10);
    expect(container.querySelectorAll(".portal-xmas-candle")).toHaveLength(7);
    expect(container.querySelector(".portal-xmas-atmosphere")?.getAttribute("aria-hidden")).toBe("true");
  });
  it("permite aumentar ou suavizar o brilho da decoração",()=>{
    const {container}=render(<PortalChristmasDecor scene="hero"/>);
    const toggle=screen.getByRole("button",{name:/intensificar as luzes mágicas/i});
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(toggle);
    expect(container.querySelector(".portal-xmas-decor--bright")).not.toBeNull();
    const pressed=screen.getByRole("button",{name:/suavizar as luzes mágicas/i});
    expect(pressed.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(pressed);
    expect(container.querySelector(".portal-xmas-decor--bright")).toBeNull();
  });
  it("posiciona coruja e vassoura como elementos fotográficos de seções diferentes",()=>{
    const {container:inspiration}=render(<PortalChristmasDecor scene="inspirations"/>);
    expect(inspiration.querySelector(".portal-xmas-owl-photo")).not.toBeNull();
    expect(inspiration.querySelector(".portal-xmas-broom-photo")).toBeNull();
    cleanup();
    const {container:gallery}=render(<PortalChristmasDecor scene="gallery"/>);
    expect(gallery.querySelector(".portal-xmas-broom-photo")).not.toBeNull();
    expect(gallery.querySelector(".portal-xmas-owl-photo")).toBeNull();
  });
});
