'use client';

function Card({ className = '', style, children, ...rest }) {
  const classes = ['ui-card', className].filter(Boolean).join(' ');
  return (
    <div className={classes} style={style} {...rest}>
      {children}
    </div>
  );
}

function CardImage({ src, alt = '', className = '', style, ...rest }) {
  const classes = ['ui-card-image', className].filter(Boolean).join(' ');
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className={classes} style={style} {...rest} />
    );
  }
  return <div className={classes} style={style} aria-hidden="true" {...rest} />;
}

function CardText({ width, className = '', style, ...rest }) {
  const classes = ['ui-card-text', className].filter(Boolean).join(' ');
  const finalStyle = width ? { ...style, width } : style;
  return <div className={classes} style={finalStyle} aria-hidden="true" {...rest} />;
}

Card.Image = CardImage;
Card.Text = CardText;

export default Card;
