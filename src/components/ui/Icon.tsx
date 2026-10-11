const files = import.meta.glob("../../assets/icons/**/*.svg", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const icons = new Map(
  Object.entries(files).map(([path, svg]) => [path.split("/").pop()!.replace(".svg", ""), svg]),
);

// The markup comes from our own bundled files, never from user input.
export const Ico = ({ n }: { n: string }) => (
  <span class="i" aria-hidden="true" dangerouslySetInnerHTML={{ __html: icons.get(n) ?? "" }} />
);
