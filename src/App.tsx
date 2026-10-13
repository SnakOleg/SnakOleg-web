import { useEffect } from "preact/hooks";
import { inView } from "motion";
import { useGithub } from "./hooks/useGithub";
import { useSecretEntry } from "./hooks/useSecretEntry";
import { Loader } from "./components/Loader";
import { Shell } from "./components/Shell";
import { Hero } from "./components/Hero";
import { Contacts } from "./components/Contacts";
import { Stats } from "./components/Stats";
import { GitHubActivity } from "./components/GitHubActivity";
import { Projects } from "./components/projects/Projects";
import { Timeline } from "./components/timeline/Timeline";
import { BlogPreview } from "./components/BlogPreview";
import { VisitorMap } from "./components/VisitorMap";
import { Skills } from "./components/Skills";

export function App({ preview = false }: { preview?: boolean }) {
  const gh = useGithub();
  useSecretEntry();
  useEffect(() => {
    const stop = inView(
      ".rv",
      (el: Element) => {
        el.classList.add("in");
      },
      { margin: "0px 0px -8% 0px" },
    );
    return () => stop();
  }, []);
  return (
    <Shell page="home" preview={preview} before={<Loader skip={preview} />}>
      {({ l }) => (
        <>
          <Hero l={l} />
          <Contacts l={l} />
          <Stats l={l} />
          <GitHubActivity l={l} />
          <Projects l={l} />
          <BlogPreview l={l} />
          <VisitorMap l={l} />
          <Timeline l={l} gh={gh} />
          <Skills l={l} />
        </>
      )}
    </Shell>
  );
}
