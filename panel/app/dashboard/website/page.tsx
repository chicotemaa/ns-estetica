import WebsiteEditor from "./website-editor";
export default function WebsitePage() {
  return (
    <WebsiteEditor
      siteUrl={process.env.PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://www.nataliasanchez.com.ar"}
    />
  );
}
