// Typing inside a game or the passport must not trigger the site-wide letter shortcuts.
export const inDialog = () => !!document.querySelector(".pback, [data-noshortcuts]");
