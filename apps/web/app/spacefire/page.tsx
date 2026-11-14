import { Notice, PageHead } from "@/components/ui";
import { SPACEFIRE, SpaceFireGroups } from "@/components/SpaceFire";

export default function Page() {
  return (
    <>
      <PageHead no="08" kicker="SpaceFire Evolution" title="SpaceFire Evolution">
        <p>The spacecraft fires behind today’s fire safety rules, the firefighting gear that came out of spaceflight,
          and NASA’s guide to combustion research on the ISS. All seven pages are listed on the challenge’s
          {" "}<a href={SPACEFIRE.resources_tab_url} target="_blank" rel="noreferrer">Resources tab ↗</a>.</p>
      </PageHead>
      <Notice>Each entry gives the official title and link, the challenge’s own note on it, and short excerpts quoted word for word
        from the linked NASA page. These pages are background; they hold no PSI test data and are not used in rankings.</Notice>
      <SpaceFireGroups />
    </>
  );
}
