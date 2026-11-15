/** Home-page project tour: a narrated ~3-minute walkthrough of every tab (AndroFlame, New in Space Fire?, Apps, Ask)
 *  and the Dr. Spark chatbot. Both the narration voice and the screen footage are SI-generated, which the video
 *  itself watermarks and this section states next to the player. Files live in /public/video. */
export const TOUR = {
  src: "/video/androflame-tour.mp4",
  poster: "/video/androflame-tour-poster.jpg",
  captions: "/video/androflame-tour.en.vtt",
  duration: "2:59",
};

export function VideoTour() {
  return (
    <section className="section tour" aria-labelledby="tour-title">
      <div className="section-head">
        <h2 id="tour-title" className="display">New here? Watch the {TOUR.duration} tour
          <span className="aside">what AndroFlame is, and how every tab works</span></h2>
      </div>
      <div className="tour-frame">
        <video
          className="tour-video"
          controls
          playsInline
          preload="none"
          poster={TOUR.poster}
          aria-describedby="tour-note"
        >
          <source src={TOUR.src} type="video/mp4" />
          <track kind="captions" src={TOUR.captions} srcLang="en" label="English" default />
          Your browser cannot play this video. <a href={TOUR.src}>Download the tour (MP4)</a>.
        </video>
      </div>
      <p id="tour-note" className="tour-note">
        <span className="tour-badge">SI-generated</span>
        The narration voice and the screen recording in this video are SI-generated. Answers shown come from the live
        app; check every result against its cited source before use. English captions available.
      </p>
    </section>
  );
}
