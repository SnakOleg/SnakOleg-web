const BROWSERS: [RegExp, string][] = [
  [/Edg\/(\d+)/, "Edge"],
  [/OPR\/(\d+)/, "Opera"],
  [/YaBrowser\/(\d+)/, "Yandex"],
  [/(?:Firefox|FxiOS)\/(\d+)/, "Firefox"],
  [/(?:Chrome|CriOS)\/(\d+)/, "Chrome"],
  [/Version\/(\d+).*Safari/, "Safari"],
  [/curl\/(\S+)/, "curl"],
];

const SYSTEMS: [RegExp, string][] = [
  [/Windows NT 10/, "Windows 10/11"],
  [/Windows/, "Windows"],
  [/Android (\d+)/, "Android"],
  [/(?:iPhone|iPad).*OS (\d+)/, "iOS"],
  [/Mac OS X/, "macOS"],
  [/CrOS/, "ChromeOS"],
  [/Linux/, "Linux"],
];

const pick = (rules: [RegExp, string][], ua: string) => {
  for (const [re, name] of rules) {
    const m = re.exec(ua);
    if (m) return m[1] ? `${name} ${m[1]}` : name;
  }
  return "Unknown";
};

export const parseUA = (ua: string) => ({
  browser: pick(BROWSERS, ua),
  os: pick(SYSTEMS, ua),
  device: /ipad|tablet/i.test(ua) ? "tablet" : /mobi|android|iphone/i.test(ua) ? "mobile" : "desktop",
});

// Versions are left out so that an update of the browser or the system does not look like a new device.
export const fingerprint = (ua: string) => {
  const p = parseUA(ua);
  return `${p.os.split(" ")[0]}|${p.browser.split(" ")[0]}|${p.device}`;
};
