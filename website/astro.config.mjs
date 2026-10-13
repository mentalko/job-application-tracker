// The project's website: a landing page (src/pages/index.astro) and the user guide as docs
// (Starlight, generated from ../docs/guide by scripts/sync.mjs). Served by GitHub Pages.
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

const REPO = "https://github.com/waddington/job-application-tracker";

export default defineConfig({
  site: "https://waddington.github.io",
  base: "/job-application-tracker",
  trailingSlash: "always",
  integrations: [
    starlight({
      title: "Job Application Tracker",
      description:
        "Docs for Job Application Tracker, the open-source, self-hosted, local-first job application tracker for software engineers.",
      logo: { src: "./src/assets/logo.svg" },
      favicon: "/favicon.svg",
      social: [{ icon: "github", label: "GitHub", href: REPO }],
      customCss: [
        "@fontsource-variable/inter",
        "@fontsource-variable/jetbrains-mono",
        "./src/styles/docs.css",
      ],
      head: [
        {
          tag: "meta",
          attrs: {
            property: "og:image",
            content: "https://waddington.github.io/job-application-tracker/og.png",
          },
        },
        { tag: "meta", attrs: { name: "twitter:card", content: "summary_large_image" } },
        {
          tag: "meta",
          attrs: {
            name: "twitter:image",
            content: "https://waddington.github.io/job-application-tracker/og.png",
          },
        },
      ],
      lastUpdated: false,
      sidebar: [
        {
          label: "User guide",
          items: [
            { label: "Overview", link: "/docs/" },
            { label: "Install and first run", link: "/docs/install/" },
            { label: "Your data", link: "/docs/your-data/" },
            { label: "Using the app", link: "/docs/using-the-app/" },
            { label: "Customising", link: "/docs/customising/" },
            { label: "Command reference", link: "/docs/commands/" },
            { label: "Troubleshooting", link: "/docs/troubleshooting/" },
          ],
        },
        {
          label: "Project",
          items: [
            { label: "Contributing", link: "/docs/contributing/" },
            { label: "Changelog", link: "/docs/changelog/" },
            { label: "Source on GitHub", link: REPO },
          ],
        },
      ],
    }),
  ],
});
