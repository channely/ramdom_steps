import React from 'react';

interface CardProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({
  title,
  description,
  children,
  className = '',
  actions,
}) => {
  return (
    <div className={`bg-dark-surface border border-dark-border rounded-lg ${className}`}>
      {(title || description || actions) && (
        <div className="px-6 py-4 border-b border-dark-border">
          <div className="flex items-center justify-between">
            <div>
              {title && <h3 className="text-lg font-semibold text-white">{title}</h3>}
              {description && <p className="text-sm text-gray-400 mt-1">{description}</p>}
            </div>
            {actions && <div className="flex items-center space-x-2">{actions}</div>}
          </div>
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
};

export default Card;