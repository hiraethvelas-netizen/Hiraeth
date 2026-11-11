import { useId, useRef, useState } from "react";
import { MailOpen, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  groupMagicInspirations,
  magicHouseNames,
  type InspirationFragment,
} from "@/lib/magic-inspirations";
import "./MagicInspirations.css";

function FragmentText({
  fragment,
  hideTitle = false,
}: {
  fragment: InspirationFragment;
  hideTitle?: boolean;
}) {
  return (
    <div className="magic-fragment">
      {!hideTitle && <h4>{fragment.title}</h4>}
      {fragment.reference && <small>{fragment.reference}</small>}
      {fragment.body && <p>{fragment.body}</p>}
      {fragment.context && <p className="italic">{fragment.context}</p>}
    </div>
  );
}

function FragmentList({ fragments }: { fragments: InspirationFragment[] }) {
  return fragments.length ? (
    fragments.map((fragment) => <FragmentText key={fragment.id} fragment={fragment} />)
  ) : (
    <p className="magic-empty">Esta história será revelada em breve.</p>
  );
}

export function MagicInspirations({ fragments }: { fragments: InspirationFragment[] }) {
  const { chapters, houses } = groupMagicInspirations(fragments);
  const [open, setOpen] = useState(false);
  const letterId = useId();
  const openButton = useRef<HTMLButtonElement>(null);
  const letter = useRef<HTMLDivElement>(null);
  const letterText = chapters.letter
    .map((fragment) => `${fragment.body}\n${fragment.context ?? ""}`)
    .join("\n");
  const signed = /A Guardiã da Chama/i.test(letterText);
  const hasSlogan = /Onde a Chama Acesa te Espera/i.test(letterText);
  return (
    <div className="magic-inspirations">
      <section className="magic-chapter" aria-labelledby={`${letterId}-origin`}>
        <p className="magic-chapter-number" aria-hidden="true">
          I
        </p>
        <h3 id={`${letterId}-origin`}>Como nasceu a coleção inspirada no universo Harry Potter</h3>
        <FragmentList fragments={chapters.origin} />
      </section>
      <section className="magic-chapter" aria-labelledby={`${letterId}-selector`}>
        <p className="magic-chapter-number" aria-hidden="true">
          II
        </p>
        <h3 id={`${letterId}-selector`}>Vela Seletora</h3>
        <FragmentList fragments={chapters.selector} />
      </section>
      <section className="magic-chapter" aria-labelledby={`${letterId}-houses`}>
        <p className="magic-chapter-number" aria-hidden="true">
          III
        </p>
        <h3 id={`${letterId}-houses`}>Quatro casas, quatro essências</h3>
        {chapters.houses.map((fragment) => (
          <FragmentText key={fragment.id} fragment={fragment} />
        ))}
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {magicHouseNames.map((name, index) => (
            <article className="magic-house" key={name}>
              <h4>{name}</h4>
              {houses[index]?.length ? (
                houses[index]?.map((fragment) => (
                  <FragmentText key={fragment.id} fragment={fragment} hideTitle />
                ))
              ) : (
                <p className="magic-empty">A essência será revelada em breve.</p>
              )}
            </article>
          ))}
        </div>
      </section>
      <section className="magic-chapter" aria-labelledby={`${letterId}-christmas`}>
        <p className="magic-chapter-number" aria-hidden="true">
          IV
        </p>
        <h3 id={`${letterId}-christmas`}>O Natal no Mundo da Magia</h3>
        {chapters.christmas.length ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <FragmentList fragments={chapters.christmas} />
          </div>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {["Vela I", "Vela II"].map((name) => (
              <article className="magic-house" key={name}>
                <h4>{name}</h4>
                <p className="magic-empty">Esta história será revelada em breve.</p>
              </article>
            ))}
          </div>
        )}
      </section>
      <section className="magic-chapter" aria-labelledby={`${letterId}-heading`}>
        <p className="magic-chapter-number" aria-hidden="true">
          V
        </p>
        <h3 id={`${letterId}-heading`}>Carta da Guardiã da Chama</h3>
        {!open && (
          <div className="magic-envelope">
            <span className="magic-seal" aria-label="Selo Hiraeth">
              H
            </span>
            <Button
              ref={openButton}
              type="button"
              className="magic-letter-button"
              aria-expanded={false}
              aria-controls={letterId}
              onClick={() => {
                setOpen(true);
                requestAnimationFrame(() => letter.current?.focus());
              }}
            >
              <MailOpen aria-hidden="true" />
              Abrir carta
            </Button>
          </div>
        )}
        <div
          id={letterId}
          hidden={!open}
          ref={letter}
          tabIndex={-1}
          role="region"
          aria-label="Carta aberta da Guardiã da Chama"
          className={open ? "magic-letter-paper" : undefined}
        >
          {chapters.letter.length ? (
            chapters.letter.map((fragment) => (
              <FragmentText key={fragment.id} fragment={fragment} hideTitle />
            ))
          ) : (
            <p className="magic-empty">A carta será revelada em breve.</p>
          )}
          {!signed && <p className="magic-letter-signature">A Guardiã da Chama</p>}
          {!hasSlogan && <p className="magic-letter-slogan">Onde a Chama Acesa te Espera</p>}
          <Button
            type="button"
            className="magic-letter-button"
            aria-expanded={true}
            aria-controls={letterId}
            onClick={() => {
              setOpen(false);
              requestAnimationFrame(() => openButton.current?.focus());
            }}
          >
            <X aria-hidden="true" />
            Fechar carta
          </Button>
        </div>
      </section>
    </div>
  );
}
