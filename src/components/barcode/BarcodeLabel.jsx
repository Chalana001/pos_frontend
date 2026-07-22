import Barcode from 'react-barcode';
import { format as formatDate } from 'date-fns';

import { getActiveLabelElements } from '../../utils/barcodeLabelSettings';

const EAN13_RE = /^\d{12,13}$/;

const alignToFlex = (align) =>
  align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';

// Shared inline style for text elements, driven by the per-element style props
// (fontSize / bold / italic / underline / align). Mirrors the receipt renderer's
// class-list approach (buildPosReceiptHtml.renderLine) but as inline styles so
// the shared preview/print component stays self-contained.
const textStyle = (el) => ({
  fontSize: `${el.fontSize}px`,
  fontWeight: el.bold ? 'bold' : 'normal',
  fontStyle: el.italic ? 'italic' : 'normal',
  textDecoration: el.underline ? 'underline' : 'none',
  textAlign: el.align,
  width: '100%',
});

const renderElement = (el, item, shopName) => {
  switch (el.type) {
    case 'SHOP_NAME': {
      const text = el.customText || shopName;
      if (!text) return null;
      return (
        <div key={el.id} style={{ ...textStyle(el), textTransform: 'uppercase' }}>
          {text}
        </div>
      );
    }
    case 'ITEM_NAME': {
      const name = el.itemNameSource === 'ALT' && item.altName ? item.altName : item.name;
      const shown = String(name || '').substring(0, el.maxChars || 22);
      if (!shown) return null;
      return (
        <div key={el.id} style={{ ...textStyle(el), whiteSpace: 'nowrap', marginBottom: '1px' }}>
          {shown}
        </div>
      );
    }
    case 'BARCODE': {
      const barcodeValue = String(item.barcode || '');
      const format = el.barcodeFormat === 'EAN13' && EAN13_RE.test(barcodeValue) ? 'EAN13' : 'CODE128';
      // The number is rendered as normal HTML text below the bars (not baked
      // into the canvas image) so it prints in the same font/weight as the
      // price and other text elements — canvas-drawn text never matches.
      return (
        <div key={el.id} style={{ width: '100%' }}>
          <div style={{ display: 'flex', width: '100%', justifyContent: alignToFlex(el.align) }}>
            <Barcode
              value={barcodeValue}
              format={format}
              renderer="img"
              className="barcode-canvas"
              width={el.barcodeWidth}
              height={el.barcodeHeight}
              margin={2}
              displayValue={false}
            />
          </div>
          {el.showBarcodeValue && barcodeValue ? (
            <div style={{ fontSize: `${el.barcodeValueFontSize}px`, textAlign: el.align, width: '100%' }}>
              {barcodeValue}
            </div>
          ) : null}
        </div>
      );
    }
    case 'PRICE': {
      const prefix = el.customText || '';
      return (
        <div key={el.id} style={{ ...textStyle(el), marginTop: '-2px' }}>
          {prefix} {Number(item.sellingPrice || 0).toLocaleString()}
        </div>
      );
    }
    case 'EXPIRY': {
      if (!item.labelExpiry) return null;
      const prefix = el.customText || '';
      return (
        <div key={el.id} style={textStyle(el)}>
          {prefix} {formatDate(new Date(item.labelExpiry), el.expiryDateFormat || 'dd/MM/yyyy')}
        </div>
      );
    }
    case 'FOOTER':
    case 'CUSTOM_TEXT': {
      if (!el.customText) return null;
      return (
        <div key={el.id} style={textStyle(el)}>
          {el.customText}
        </div>
      );
    }
    default:
      return null;
  }
};

/**
 * Renders a single barcode sticker from (item, settings, shopName).
 * Used by BOTH the settings-page live preview and the real print page, so the
 * preview is always truthful. The visible content and its order come from the
 * resolved element array (getActiveLabelElements), which falls back to the
 * legacy flat show/font-size fields when no custom layout has been saved.
 */
const BarcodeLabel = ({ item, settings, shopName }) => {
  const s = settings || {};
  const elements = getActiveLabelElements(s).filter((el) => el.enabled !== false);

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
      {elements.map((el) => renderElement(el, item, shopName))}
    </div>
  );
};

export default BarcodeLabel;
