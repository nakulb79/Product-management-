import { CSSProperties, ReactNode } from 'react';

type BannerVariant = 'error' | 'success';

const VARIANT_STYLES: Record<BannerVariant, CSSProperties> = {
  error: { background: '#fef2f2', border: '1px solid #fee2e2' },
  success: { background: '#f0fdf4', border: '1px solid #dcfce7' }
};

type BannerProps = {
  variant: BannerVariant;
  children: ReactNode;
  style?: CSSProperties;
};

function Banner({ variant, children, style }: BannerProps) {
  return (
    <p
      className={variant === 'error' ? 'error-text' : 'success-text'}
      style={{
        padding: '1rem',
        borderRadius: '8px',
        marginBottom: '1.5rem',
        ...VARIANT_STYLES[variant],
        ...style
      }}
    >
      {children}
    </p>
  );
}

export const ErrorBanner = ({ children, style }: Omit<BannerProps, 'variant'>) => (
  <Banner variant="error" style={style}>{children}</Banner>
);

export const SuccessBanner = ({ children, style }: Omit<BannerProps, 'variant'>) => (
  <Banner variant="success" style={style}>{children}</Banner>
);
