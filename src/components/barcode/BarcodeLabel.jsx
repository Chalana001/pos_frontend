import Barcode from 'react-barcode';

const EAN13_RE = /^\d{12,13}$/;

/**
 * Renders a single barcode sticker from (item, settings, shopName).
 * Used by BOTH the settings-page live preview and the real print page,
 * so the preview is always truthful. All visual properties are inline
 * styles driven by `settings` (already normalized by the caller).
 */
const BarcodeLabel = ({ item, settings, shopName }) => {
  const s = settings;
  const name = s.itemNameSource === 'ALT' && item.altName ? item.altName : item.name;
  const format =
    s.barcodeFormat === 'EAN13' && EAN13_RE.test(String(item.barcode))
      ? 'EAN13'
      : 'CODE128';

  return (
    <div
      className="barcode-sticker"
      style={{
        width: `${s.labelWidthMm}mm`,
        height: `${s.labelHeightMm}mm`,
        paddingTop: `${s.paddingTopMm}mm`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        overflow: 'hidden',
      }}
    >
      {s.showShopName && (
        <div
          style={{
            fontSize: `${s.shopNameFontSize}px`,
            fontWeight: s.shopNameBold ? 'bold' : 'normal',
            textTransform: 'uppercase',
          }}
        >
          {s.shopNameText || shopName}
        </div>
      )}
      {s.showItemName && (
        <div
          style={{
            fontSize: `${s.itemNameFontSize}px`,
            whiteSpace: 'nowrap',
            marginBottom: '1px',
          }}
        >
          {String(name || '').substring(0, s.itemNameMaxChars)}
        </div>
      )}
      <Barcode
        value={String(item.barcode || '')}
        format={format}
        width={s.barcodeWidth}
        height={s.barcodeHeight}
        fontSize={s.barcodeValueFontSize}
        margin={2}
        displayValue={s.showBarcodeValue}
      />
      {s.showPrice && (
        <div
          style={{
            fontSize: `${s.priceFontSize}px`,
            fontWeight: s.priceBold ? 'bold' : 'normal',
            marginTop: '-2px',
          }}
        >
          {s.pricePrefix} {Number(item.sellingPrice || 0).toLocaleString()}
        </div>
      )}
      {s.showFooterText && s.footerText ? (
        <div style={{ fontSize: `${s.footerFontSize}px` }}>{s.footerText}</div>
      ) : null}
    </div>
  );
};

export default BarcodeLabel;
