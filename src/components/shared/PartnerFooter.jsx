const PARTNER_IMGS = ['0_HBRI_Picture3.png', '1_UNOPS_Picture4.png', 'bdLogo.jpg',
  , '4_UNEP_Picture6.png', '5_GABC_Picture7.png', 'federal-ministry.png'];

export default function PartnerFooter() {
  return (
    <footer style={{
      borderTop: '1px solid rgba(34,139,60,0.1)',
      background: '#fff',
      padding: '10px 20px 12px',
      marginTop: 'auto',
    }}>
      <p style={{
        textAlign: 'center',
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        color: '#bccdc0',
        marginBottom: 14,
        fontFamily: "'DM Sans', sans-serif",
      }}>
        Institutional Partners &amp; Supporters
      </p>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 28,
      }}>
        {PARTNER_IMGS.map((img, i) => (
          <img
            key={i}
            src={`/images/${img}`}
            alt=""
            style={{ height: 40, objectFit: 'contain', opacity: 0.85, transition: 'opacity 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.6'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '0.85'; }}
          />
        ))}
      </div>
    </footer>
  );
}
