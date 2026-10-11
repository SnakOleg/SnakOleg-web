let requested = "";

export const requestSection = (id: string) => {
  requested = id;
  dispatchEvent(new Event("snak-section"));
};

export const takeRequested = () => {
  const id = requested;
  requested = "";
  return id;
};
