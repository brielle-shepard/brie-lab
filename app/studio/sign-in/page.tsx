import SiteWorkspace from "../../../components/site-workspace";
export const dynamic="force-dynamic";
export default function StudioSignIn() {
  return <SiteWorkspace screen="studio"><section className="studio-page"><p className="eyebrow">PRIVATE WRITING STUDIO</p><h1 className="page-title">Sign in to write.</h1><p>Only the owner of Brie’s Lab can create or edit entries.</p><p style={{marginTop:24}}><a className="button primary" href="/.auth/login/aad?post_login_redirect_uri=/studio">Sign in with Microsoft</a></p><p style={{marginTop:24}}><a className="text-link" href="/.auth/logout?post_logout_redirect_uri=/studio/sign-in">Use a different account</a></p></section></SiteWorkspace>;
}
