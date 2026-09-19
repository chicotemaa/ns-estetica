import WebsiteEditor from "./website-editor";
export default function WebsitePage() {
  return (
    <WebsiteEditor
      siteUrl={process.env.PUBLIC_SITE_URL || "http://localhost:3000"}
    />
  );
}
