/** Title bar of every app screen. Sticky: it stays pinned to the top of the page while the content scrolls. */
const PageHeader = ({ title, subtitle, children }) => (
  <header className="page-header">
    <div>
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </div>
    {children && <div className="page-actions">{children}</div>}
  </header>
);

export default PageHeader;
