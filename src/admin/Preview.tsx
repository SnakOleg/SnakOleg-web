import { useEffect, useRef, useState } from "preact/hooks";

type Props = { draft: Record<string, unknown> | null; onClose: () => void };

export function Preview({ draft, onClose }: Props) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [phone, setPhone] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!loaded || !draft) return;
    const timer = setTimeout(() => {
      frame.current?.contentWindow?.postMessage({ type: "snak-preview", content: draft }, location.origin);
    }, 250);
    return () => clearTimeout(timer);
  }, [draft, loaded]);

  return (
    <aside class="pv" aria-label="Предпросмотр сайта">
      <header>
        <b>Предпросмотр</b>
        <span class="sp" />
        <div class="tabs">
          <button type="button" class={phone ? "" : "on"} onClick={() => setPhone(false)}>
            Компьютер
          </button>
          <button type="button" class={phone ? "on" : ""} onClick={() => setPhone(true)}>
            Телефон
          </button>
        </div>
        <button type="button" class="btn" onClick={onClose}>
          Закрыть
        </button>
      </header>
      <div class="pvbody">
        <iframe
          ref={frame}
          src="/?preview=1"
          title="Предпросмотр"
          class={phone ? "phone" : ""}
          onLoad={() => setLoaded(true)}
        />
      </div>
      <p class="muted">Изменения из формы показываются здесь сразу, до сохранения.</p>
    </aside>
  );
}
