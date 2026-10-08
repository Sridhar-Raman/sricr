import Icon from './Icon';

const EmptyState = ({ icon = 'calendar', title, children }) => (
  <div className="empty">
    <div className="empty-icon"><Icon name={icon} size={22} /></div>
    <strong>{title}</strong>
    {children}
  </div>
);

export default EmptyState;
